import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Pages (we'll create these)
import AdminSetup from './pages/AdminSetup';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ProjectView from './pages/ProjectView';
import Backlog from './pages/Backlog';
import Sprints from './pages/Sprints';
import KanbanBoard from './pages/KanbanBoard';

import './index.css';

function AppRoutes() {
    const { adminExists, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex flex-center" style={{ minHeight: '100vh' }}>
                <div>Loading...</div>
            </div>
        );
    }

    // If no admin exists, redirect to admin setup
    if (adminExists === false) {
        return (
            <Routes>
                <Route path="/admin/setup" element={<AdminSetup />} />
                <Route path="*" element={<Navigate to="/admin/setup" replace />} />
            </Routes>
        );
    }

    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            <Route
                path="/"
                element={
                    <ProtectedRoute>
                        <Dashboard />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/project/:projectId"
                element={
                    <ProtectedRoute>
                        <ProjectView />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/project/:projectId/backlog"
                element={
                    <ProtectedRoute>
                        <Backlog />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/project/:projectId/sprints"
                element={
                    <ProtectedRoute>
                        <Sprints />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/project/:projectId/kanban"
                element={
                    <ProtectedRoute>
                        <KanbanBoard />
                    </ProtectedRoute>
                }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <AppRoutes />
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;
