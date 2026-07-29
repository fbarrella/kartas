import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import UserDropdown from '../components/UserDropdown';
import Breadcrumb from '../components/Breadcrumb';
import '../components/navigation.css';
import kartasLogoWhite from '../assets/kartas-logo-white.png';

const Dashboard = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newProject, setNewProject] = useState({ name: '', description: '' });
    const [error, setError] = useState('');

    useEffect(() => {
        fetchProjects();
    }, []);

    const fetchProjects = async () => {
        try {
            const response = await api.get('/projects');
            setProjects(response.data);
        } catch (error) {
            console.error('Error fetching projects:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateProject = async (e) => {
        e.preventDefault();
        setError('');

        try {
            const response = await api.post('/projects', newProject);
            setProjects([response.data, ...projects]);
            setShowCreateModal(false);
            setNewProject({ name: '', description: '' });
        } catch (error) {
            setError(error.response?.data?.error || 'Failed to create project');
        }
    };

    const canCreateProject = user?.role === 'admin' || user?.role === 'project_owner';

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-background)' }}>
            {/* Header */}
            <header style={{
                backgroundColor: 'var(--color-primary)',
                color: 'white',
                padding: 'var(--spacing-md) 0',
                boxShadow: 'var(--shadow-md)'
            }}>
                <div className="container flex flex-between" style={{ alignItems: 'center' }}>
                    <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                        <img src={kartasLogoWhite} alt="Kartas" style={{ height: '36px' }} />
                        <span style={{ color: 'white', fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)' }}>Kartas</span>
                    </Link>
                    <UserDropdown />
                </div>
            </header>

            {/* Main Content */}
            <div className="container" style={{ marginTop: 'var(--spacing-xl)' }}>
                <Breadcrumb items={[{ label: 'Projects' }]} />
                <div className="flex flex-between mb-lg" style={{ alignItems: 'center' }}>
                    <h2>Your Projects</h2>
                    {canCreateProject && (
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="btn btn-primary"
                        >
                            + Create Project
                        </button>
                    )}
                </div>

                {loading ? (
                    <div className="text-center">Loading projects...</div>
                ) : projects.length === 0 ? (
                    <div className="card text-center">
                        <h3>No Projects Yet</h3>
                        <p className="text-muted mt-md">
                            {canCreateProject
                                ? 'Create your first project to get started'
                                : 'You are not assigned to any projects yet'}
                        </p>
                    </div>
                ) : (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                        gap: 'var(--spacing-md)'
                    }}>
                        {projects.map((project) => (
                            <Link
                                key={project.id}
                                to={`/project/${project.id}/${project.defaultLandingPage || 'backlog'}`}
                                style={{ textDecoration: 'none' }}
                            >
                                <div className="card" style={{
                                    height: '100%',
                                    cursor: 'pointer',
                                    transition: 'transform var(--transition-fast), box-shadow var(--transition-fast)'
                                }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                        e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                                    }}>
                                    <div className="flex flex-between mb-sm">
                                        <h3 style={{ margin: 0 }}>{project.name}</h3>
                                        <span className="badge badge-primary">{project.ticketPrefix}</span>
                                    </div>
                                    {project.description && (
                                        <p className="text-muted text-small mt-sm">
                                            {project.description}
                                        </p>
                                    )}
                                    <div className="mt-md text-small text-muted">
                                        Created by {project.createdByName || 'Unknown'}
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            {/* Create Project Modal */}
            {showCreateModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }} onClick={() => setShowCreateModal(false)}>
                    <div className="card" style={{ maxWidth: '500px', width: '100%' }}
                        onClick={(e) => e.stopPropagation()}>
                        <div className="card-header">
                            <h3 className="card-title">Create New Project</h3>
                        </div>

                        <form onSubmit={handleCreateProject}>
                            <div className="form-group">
                                <label className="form-label">Project Name</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={newProject.name}
                                    onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                                    required
                                    autoFocus
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Description (Optional)</label>
                                <textarea
                                    className="form-textarea"
                                    value={newProject.description}
                                    onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                                />
                            </div>

                            {error && (
                                <div className="form-error mb-md">
                                    {error}
                                </div>
                            )}

                            <div className="flex flex-gap-sm" style={{ justifyContent: 'flex-end' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="btn btn-secondary"
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    Create Project
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
