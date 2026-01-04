import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';

const ProjectView = () => {
    const { projectId } = useParams();
    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchProject();
    }, [projectId]);

    const fetchProject = async () => {
        try {
            const response = await api.get(`/projects/${projectId}`);
            setProject(response.data);
        } catch (error) {
            console.error('Error fetching project:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="container mt-lg">Loading...</div>;
    }

    if (!project) {
        return (
            <div className="container mt-lg">
                <div className="card">
                    <h2>Project Not Found</h2>
                    <Link to="/" className="btn btn-primary mt-md">
                        Back to Dashboard
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-background)' }}>
            {/* Header */}
            <header style={{
                backgroundColor: 'var(--color-primary)',
                color: 'white',
                padding: 'var(--spacing-md) 0',
                boxShadow: 'var(--shadow-md)'
            }}>
                <div className="container">
                    <div className="flex flex-gap-md mb-sm" style={{ alignItems: 'center' }}>
                        <Link to="/" style={{ color: 'white', textDecoration: 'none' }}>
                            ← Dashboard
                        </Link>
                        <h1 style={{ color: 'white', margin: 0 }}>{project.name}</h1>
                        <span className="badge" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                            {project.ticketPrefix}
                        </span>
                    </div>
                    {project.description && (
                        <p style={{ color: 'rgba(255,255,255,0.9)', margin: 0 }}>
                            {project.description}
                        </p>
                    )}
                </div>
            </header>

            {/* Navigation */}
            <div style={{
                backgroundColor: 'var(--color-surface)',
                borderBottom: '2px solid var(--color-border)',
                padding: 'var(--spacing-sm) 0'
            }}>
                <div className="container flex flex-gap-md">
                    <Link
                        to={`/project/${projectId}/backlog`}
                        className="btn btn-secondary"
                    >
                        Backlog
                    </Link>
                    <button className="btn btn-secondary" disabled>
                        Kanban (Phase 2)
                    </button>
                    <button className="btn btn-secondary" disabled>
                        Sprints (Phase 2)
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="container mt-lg">
                <div className="card">
                    <h2>Project Overview</h2>
                    <div className="mt-md">
                        <p><strong>Team Members:</strong> {project.members?.length || 0}</p>
                        <p className="text-muted mt-sm">
                            Click "Backlog" above to start managing your user stories
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProjectView;
