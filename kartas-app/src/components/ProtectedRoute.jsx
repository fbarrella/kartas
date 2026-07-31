import React from 'react';
import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children, requireRole }) => {
    const { user, loading } = useAuth();
    const { t } = useTranslation(['navigation', 'common']);

    if (loading) {
        return (
            <div className="flex flex-center" style={{ minHeight: '100vh' }}>
                <div>{t('common:loading')}</div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (requireRole && !requireRole.includes(user.role)) {
        return (
            <div className="container" style={{ marginTop: '2rem' }}>
                <div className="card">
                    <h2>{t('navigation:protectedRoute.accessDenied')}</h2>
                    <p className="text-muted mt-md">
                        {t('navigation:protectedRoute.noPermission')}
                    </p>
                </div>
            </div>
        );
    }

    return children;
};

export default ProtectedRoute;
