import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../services/api';
import { applyRuntimePalette, setCachedSystemTheme } from '../utils/systemTheme';
import i18n from '../i18n';

const AuthContext = createContext(null);

// DM-03: keep the cached theme + <html data-theme> attribute in sync with
// whatever the resolved user's preference is — called from every path that
// establishes/refreshes a user (login, admin creation, session validation).
const applyTheme = (theme) => {
    const resolved = theme === 'dark' ? 'dark' : 'light';
    localStorage.setItem('theme', resolved);
    if (resolved === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
    } else {
        document.documentElement.removeAttribute('data-theme');
    }
    // PAL-04: the admin's system palette is applied as inline overrides on top of
    // whichever mode's static CSS defaults just became active above — the light/dark
    // split has to be re-derived every time the attribute changes, not just once.
    applyRuntimePalette();
};

// I18N-03: same shape as applyTheme above — keeps the cached language,
// i18next's active language, and the <html lang> attribute in sync with the
// resolved user's preference.
const applyLanguage = (language) => {
    const resolved = language || 'en';
    localStorage.setItem('language', resolved);
    i18n.changeLanguage(resolved);
    document.documentElement.setAttribute('lang', resolved);
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [adminExists, setAdminExists] = useState(null);

    // Check if admin exists and validate any existing session on mount.
    // Both checks must finish before `loading` clears — otherwise routing
    // decisions get made against a still-default `adminExists` value.
    useEffect(() => {
        const initialize = async () => {
            await Promise.all([checkAdminExists(), checkExistingAuth()]);
            setLoading(false);
        };
        initialize();
    }, []);

    const checkAdminExists = async (attempt = 0) => {
        try {
            const response = await api.get('/auth/check-admin');
            setAdminExists(response.data.adminExists);
        } catch (error) {
            console.error('Error checking admin:', error);
            // The app can only ever reach /admin/setup when this resolves to
            // `false` — a single failed attempt (e.g. the API still starting
            // up) would otherwise permanently strand first-run setup on the
            // login page with no way to recover short of a hard refresh.
            if (attempt < 2) {
                await new Promise((resolve) => setTimeout(resolve, 1000));
                return checkAdminExists(attempt + 1);
            }
        }
    };

    const checkExistingAuth = async () => {
        const token = localStorage.getItem('accessToken');
        const cachedUser = localStorage.getItem('user');

        if (!token || !cachedUser) {
            return;
        }

        try {
            // Validate the cached session against the server instead of trusting
            // localStorage blindly — a token/user left over from a reset or
            // recreated database must not be rendered as a valid logged-in
            // session (the app would otherwise show a "logged in" shell with
            // every subsequent data call quietly failing).
            const response = await api.get('/users/profile');
            const parsedCachedUser = JSON.parse(cachedUser);
            const validatedUser = { ...parsedCachedUser, ...response.data };
            localStorage.setItem('user', JSON.stringify(validatedUser));
            setUser(validatedUser);
            applyTheme(validatedUser.themePreference);
            applyLanguage(validatedUser.languagePreference);
        } catch (error) {
            if (error.response) {
                // Server confirmed the session is invalid — clear it so the
                // app falls through to login/admin-setup instead of a broken
                // "logged in" state.
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('user');
            } else {
                // Couldn't reach the server at all — fall back to the cached
                // session optimistically rather than logging out on a blip.
                try {
                    const fallbackUser = JSON.parse(cachedUser);
                    setUser(fallbackUser);
                    applyTheme(fallbackUser.themePreference);
                    applyLanguage(fallbackUser.languagePreference);
                } catch {
                    localStorage.removeItem('user');
                }
            }
        }
    };

    // PAL-04: load the system-wide admin palette once per session and apply it on top
    // of DM-01's static CSS defaults. GET /system-settings/theme requires auth, so this
    // only fires once a user is resolved — until then the static CSS file values show
    // through as the correct fallback.
    useEffect(() => {
        if (!user?.id) return;
        let cancelled = false;
        api.get('/system-settings/theme')
            .then((response) => {
                if (!cancelled) setCachedSystemTheme(response.data);
            })
            .catch((error) => console.error('Error fetching system theme settings:', error));
        return () => { cancelled = true; };
    }, [user?.id]);

    const createAdmin = async (email, password, firstName, lastName) => {
        try {
            const response = await api.post('/auth/admin/setup', {
                email,
                password,
                firstName,
                lastName
            });

            const { user: userData, accessToken, refreshToken } = response.data;

            localStorage.setItem('accessToken', accessToken);
            localStorage.setItem('refreshToken', refreshToken);
            localStorage.setItem('user', JSON.stringify(userData));

            setUser(userData);
            setAdminExists(true);
            applyTheme(userData.themePreference);
            applyLanguage(userData.languagePreference);

            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.error || 'Failed to create admin'
            };
        }
    };

    // TFA-05/TFA-07: the single place a successful authentication (with or
    // without a 2FA step-up) turns into a stored session — used by both
    // login()'s non-2FA path and verifyTwoFactor()'s success path, so they
    // can never drift apart. Mirrors the backend's own issueSession() split.
    const establishSession = (sessionData) => {
        const { user: userData, accessToken, refreshToken } = sessionData;

        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        localStorage.setItem('user', JSON.stringify(userData));

        setUser(userData);
        applyTheme(userData.themePreference);
        applyLanguage(userData.languagePreference);

        return userData;
    };

    const login = async (email, password) => {
        try {
            const response = await api.post('/auth/login', { email, password });

            if (response.data.requiresTwoFactor) {
                const { method, challengeId } = response.data;
                return { success: false, requiresTwoFactor: true, method, challengeId };
            }

            const userData = establishSession(response.data);
            return { success: true, user: userData };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.error || 'Login failed'
            };
        }
    };

    // TFA-07: completes a 2FA-challenged login started by login() above.
    const verifyTwoFactor = async (challengeId, code, isBackupCode = false) => {
        try {
            const response = await api.post('/auth/2fa/verify', { challengeId, code, isBackupCode });
            const userData = establishSession(response.data);
            return { success: true, user: userData };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.error || 'Verification failed'
            };
        }
    };

    const resendTwoFactorCode = async (challengeId) => {
        try {
            await api.post('/auth/2fa/resend', { challengeId });
            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.error || 'Failed to resend code'
            };
        }
    };

    // TFA-06: called after Settings enables/disables 2FA — those endpoints
    // (totp/confirm, email/confirm, disable) already updated the database;
    // this just keeps the in-memory/cached user in sync without a second
    // round-trip to /users/profile.
    const setTwoFactorState = (twoFactorEnabled, twoFactorMethod) => {
        setUser((prev) => {
            if (!prev) return prev;
            const updated = { ...prev, twoFactorEnabled, twoFactorMethod };
            localStorage.setItem('user', JSON.stringify(updated));
            return updated;
        });
    };

    const logout = async () => {
        try {
            const refreshToken = localStorage.getItem('refreshToken');
            await api.post('/auth/logout', { refreshToken });
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
            setUser(null);
        }
    };

    const changePassword = async (currentPassword, newPassword) => {
        try {
            await api.post('/auth/change-password', {
                currentPassword,
                newPassword
            });

            // Update user's first_login status
            const updatedUser = { ...user, firstLogin: false };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            setUser(updatedUser);

            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.error || 'Failed to change password'
            };
        }
    };

    const updateThemePreference = async (theme) => {
        try {
            await api.put('/users/theme', { theme });

            const updatedUser = { ...user, themePreference: theme };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            setUser(updatedUser);
            applyTheme(theme);

            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.error || 'Failed to update theme'
            };
        }
    };

    const updateLanguagePreference = async (language) => {
        try {
            await api.put('/users/language', { language });

            const updatedUser = { ...user, languagePreference: language };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            setUser(updatedUser);
            applyLanguage(language);

            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.error || 'Failed to update language'
            };
        }
    };

    const value = {
        user,
        loading,
        adminExists,
        createAdmin,
        login,
        verifyTwoFactor,
        resendTwoFactorCode,
        setTwoFactorState,
        logout,
        changePassword,
        updateThemePreference,
        updateLanguagePreference
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
