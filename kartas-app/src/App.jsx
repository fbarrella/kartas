import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import ProjectLayout from './components/ProjectLayout';
import api from './services/api';

// Pages
import AdminSetup from './pages/AdminSetup';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ForYou from './pages/ForYou';
import ProjectView from './pages/ProjectView';
import Backlog from './pages/Backlog';
import StoryDetail from './pages/StoryDetail';
import Sprints from './pages/Sprints';
import KanbanBoard from './pages/KanbanBoard';
import Epics from './pages/Epics';
import UserManagement from './pages/UserManagement';
import UserProfile from './pages/UserProfile';
import SprintReports from './pages/SprintReports';
import ProjectSettings from './pages/ProjectSettings';
import UserDetail from './pages/UserDetail';

import './index.css';

// Persistent layout shell — stays mounted during all project route changes.
// Fetches project name once per projectId and renders the layout + Outlet.
function ProjectLayoutShell() {
    const { projectId } = useParams();
    const [projectName, setProjectName] = useState('Loading...');
    const [projectDescription, setProjectDescription] = useState('');
    const [defaultLandingPage, setDefaultLandingPage] = useState('backlog');

    useEffect(() => {
        let cancelled = false;
        api.get(`/projects/${projectId}`)
            .then(res => {
                if (cancelled) return;
                setProjectName(res.data.name || 'Project');
                setProjectDescription(res.data.description || '');
                setDefaultLandingPage(res.data.defaultLandingPage || 'backlog');
            })
            .catch(() => {
                if (!cancelled) setProjectName('Project');
            });
        return () => { cancelled = true; };
    }, [projectId]);

    return (
        <ProjectLayout projectId={projectId} projectName={projectName} projectDescription={projectDescription}>
            <Outlet context={{ projectName, defaultLandingPage }} />
        </ProjectLayout>
    );
}

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
            <Route path="/register" element={<Register />} />
            <Route
                path="/"
                element={
                    <ProtectedRoute>
                        <Dashboard />
                    </ProtectedRoute>
                }
            />

            {/* All project routes share a single persistent layout shell */}
            <Route
                path="/project/:projectId"
                element={
                    <ProtectedRoute>
                        <ProjectLayoutShell />
                    </ProtectedRoute>
                }
            >
                <Route path="for-you" element={<ForYou />} />
                <Route path="backlog" element={<Backlog />} />
                <Route path="epics" element={<Epics />} />
                <Route path="sprints" element={<Sprints />} />
                <Route path="kanban" element={<KanbanBoard />} />
                <Route path="reports" element={<SprintReports />} />
                <Route path="team" element={<ProjectView />} />
                <Route path="settings" element={<ProjectSettings />} />
                <Route path="story/:storyId" element={<StoryDetail />} />
                <Route path="user/:userId" element={<UserDetail />} />
            </Route>

            <Route
                path="/users"
                element={
                    <ProtectedRoute>
                        <UserManagement />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/profile"
                element={
                    <ProtectedRoute>
                        <UserProfile />
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
