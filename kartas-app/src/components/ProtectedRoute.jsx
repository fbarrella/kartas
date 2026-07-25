import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children, requireRole }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex flex-center" style={{ minHeight: '100vh' }}>
                <div>Loading...</div>
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
                    <h2>Access Denied</h2>
                    <p className="text-muted mt-md">
                        You don't have permission to access this page.
                    </p>
                </div>
            </div>
        );
    }

    return children;
};

export default ProtectedRoute;
