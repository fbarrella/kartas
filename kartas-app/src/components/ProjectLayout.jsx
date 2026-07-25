import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from './Sidebar';
import UserDropdown from './UserDropdown';
import './navigation.css';
import kartasLogoWhite from '../assets/kartas-logo-white.png';

const ProjectLayout = ({ projectId, projectName, children }) => {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
        const saved = localStorage.getItem('sidebarCollapsed');
        return saved === 'true';
    });

    // Listen for sidebar state changes
    useEffect(() => {
        const handleStorageChange = () => {
            const saved = localStorage.getItem('sidebarCollapsed');
            setIsSidebarCollapsed(saved === 'true');
        };

        // Listen for changes
        window.addEventListener('storage', handleStorageChange);

        // Also check periodically (for same-tab changes)
        const interval = setInterval(handleStorageChange, 100);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            clearInterval(interval);
        };
    }, []);

    return (
        <div style={{ backgroundColor: 'var(--color-background)' }}>
            {/* Header */}
            <header style={{
                backgroundColor: 'var(--color-primary)',
                color: 'white',
                padding: 'var(--spacing-md) 0',
                boxShadow: 'var(--shadow-md)',
                position: 'relative',
                zIndex: 200
            }}>
                <div className="container flex flex-between" style={{ alignItems: 'center' }}>
                    <div className="flex flex-gap-md" style={{ alignItems: 'center' }}>
                        <Link to="/" style={{ display: 'flex', alignItems: 'center' }}>
                            <img src={kartasLogoWhite} alt="Kartas" style={{ height: '36px' }} />
                        </Link>
                        <span style={{ color: 'rgba(255,255,255,0.5)' }}>|</span>
                        <h2 style={{ color: 'white', margin: 0, fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-medium)' }}>{projectName}</h2>
                    </div>
                    <UserDropdown />
                </div>
            </header>

            {/* Sidebar */}
            <Sidebar projectId={projectId} />

            {/* Main Content */}
            <div className={`page-content ${isSidebarCollapsed ? 'with-sidebar-collapsed' : 'with-sidebar-expanded'}`}>
                <div className="container" style={{ marginTop: 'var(--spacing-xl)', marginBottom: 'var(--spacing-xl)' }}>
                    {children}
                </div>
            </div>
        </div>
    );
};

export default ProjectLayout;
