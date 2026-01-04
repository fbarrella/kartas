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

    // Check if admin exists on mount
    useEffect(() => {
        checkAdminExists();
        checkExistingAuth();
    }, []);

    const checkAdminExists = async () => {
        try {
            const response = await api.get('/auth/check-admin');
            setAdminExists(response.data.adminExists);
        } catch (error) {
            console.error('Error checking admin:', error);
        }
    };

    const checkExistingAuth = async () => {
        const token = localStorage.getItem('accessToken');
        const userData = localStorage.getItem('user');

        if (token && userData) {
            try {
                setUser(JSON.parse(userData));
            } catch (error) {
                console.error('Error parsing user data:', error);
                localStorage.removeItem('user');
            }
        }

        setLoading(false);
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
