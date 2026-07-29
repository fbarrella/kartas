import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import UserDropdown from '../components/UserDropdown';
import Breadcrumb from '../components/Breadcrumb';
import '../components/navigation.css';
import kartasLogoWhite from '../assets/kartas-logo-white.png';

const Settings = () => {
    const { user, updateThemePreference } = useAuth();
    const [error, setError] = useState('');
    const isDark = user?.themePreference === 'dark';

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
            <div className="container" style={{ marginTop: 'var(--spacing-xl)', maxWidth: '600px' }}>
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
            </div>
        </div>
    );
};

export default Settings;
