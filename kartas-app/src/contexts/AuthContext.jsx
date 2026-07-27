import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

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
                    setUser(JSON.parse(cachedUser));
                } catch {
                    localStorage.removeItem('user');
                }
            }
        }
    };

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

            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.error || 'Failed to create admin'
            };
        }
    };

    const login = async (email, password) => {
        try {
            const response = await api.post('/auth/login', { email, password });

            const { user: userData, accessToken, refreshToken } = response.data;

            localStorage.setItem('accessToken', accessToken);
            localStorage.setItem('refreshToken', refreshToken);
            localStorage.setItem('user', JSON.stringify(userData));

            setUser(userData);

            return { success: true, user: userData };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.error || 'Login failed'
            };
        }
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

    const value = {
        user,
        loading,
        adminExists,
        createAdmin,
        login,
        logout,
        changePassword
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
