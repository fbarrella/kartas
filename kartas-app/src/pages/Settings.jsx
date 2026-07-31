import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import UserDropdown from '../components/UserDropdown';
import Breadcrumb from '../components/Breadcrumb';
import AdminPaletteEditor from '../components/AdminPaletteEditor';
import AdminEmailSettings from '../components/AdminEmailSettings';
import '../components/navigation.css';
import kartasLogoWhite from '../assets/kartas-logo-white.png';

const Settings = () => {
    const { user, updateThemePreference } = useAuth();
    const [error, setError] = useState('');
    const isDark = user?.themePreference === 'dark';
    const isAdmin = user?.role === 'admin';
    // SET-01: two tabs — "Admin" only ever shown/reachable for admins at all,
    // not just visually disabled for everyone else.
    const [activeTab, setActiveTab] = useState('personal');

    const handleThemeToggle = async (e) => {
        setError('');
        const result = await updateThemePreference(e.target.checked ? 'dark' : 'light');
        if (!result.success) {
            setError(result.error);
        }
    };

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
            <div className="container" style={{ marginTop: 'var(--spacing-xl)', maxWidth: '760px' }}>
                <Breadcrumb items={[{ label: 'Settings' }]} />
                <div className="mb-md">
                    <Link to="/" className="btn btn-secondary btn-sm">
                        ← Go back to My Projects
                    </Link>
                </div>

                <div className="flex flex-between mb-md" style={{ alignItems: 'center' }}>
                    <h2 style={{ margin: 0 }}>Settings</h2>
                </div>

                {error && <div className="form-error mb-md">{error}</div>}

                {/* SET-01: the whole tab bar — including "Personal" — only
                    renders for admins. A non-admin has nothing to switch
                    between, so no tab affordance should appear at all. */}
                {isAdmin && (
                    <div className="flex flex-gap-sm mb-lg">
                        <button
                            type="button"
                            className={`btn btn-sm ${activeTab === 'personal' ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setActiveTab('personal')}
                        >
                            Personal
                        </button>
                        <button
                            type="button"
                            className={`btn btn-sm ${activeTab === 'admin' ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setActiveTab('admin')}
                        >
                            Admin
                        </button>
                    </div>
                )}

                {(!isAdmin || activeTab === 'personal') && (
                    <div className="card">
                        <h2>Appearance</h2>
                        <div className="form-group" style={{ marginBottom: 0, marginTop: 'var(--spacing-md)' }}>
                            <label className="switch switch-primary">
                                <input
                                    type="checkbox"
                                    checked={isDark}
                                    onChange={handleThemeToggle}
                                />
                                <span className="switch-track">
                                    <span className="switch-thumb" />
                                </span>
                                <span className="switch-text">{isDark ? 'Dark mode' : 'Light mode'}</span>
                            </label>
                            <small className="text-muted" style={{ display: 'block', marginTop: 'var(--spacing-sm)' }}>This applies across every project and device you log in from.</small>
                        </div>
                    </div>
                )}

                {isAdmin && activeTab === 'admin' && (
                    <>
                        <div className="card">
                            <h2>System Color Palette</h2>
                            <p className="text-muted mb-md" style={{ fontSize: 'var(--font-size-sm)' }}>
                                Admin-only. This changes the color scheme for every user, across the whole app.
                            </p>
                            <AdminPaletteEditor />
                        </div>

                        <div className="card mt-lg">
                            <h2>Email Configuration</h2>
                            <p className="text-muted mb-md" style={{ fontSize: 'var(--font-size-sm)' }}>
                                Admin-only. Controls how invite emails are sent. Fields set via environment variables take precedence and can't be edited here.
                            </p>
                            <AdminEmailSettings />
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default Settings;
