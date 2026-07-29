import React from 'react';
import { Link } from 'react-router-dom';
import Sidebar from './Sidebar';
import UserDropdown from './UserDropdown';
import { useSidebarCollapsed } from '../hooks/useSidebarCollapsed';
import './navigation.css';
import kartasLogoWhite from '../assets/kartas-logo-white.png';

const ProjectLayout = ({ projectId, projectName, projectDescription, wide, children }) => {
    const isSidebarCollapsed = useSidebarCollapsed();

    return (
        <div style={{ backgroundColor: 'var(--color-background)' }}>
            {/* Header */}
            <header style={{
                backgroundColor: 'var(--color-primary)',
                color: 'white',
                padding: 'var(--spacing-md) 0',
                boxShadow: 'var(--shadow-md)',
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                zIndex: 200
            }}>
                <div className="container flex flex-between" style={{ alignItems: 'center' }}>
                    <div className="flex flex-gap-md" style={{ alignItems: 'center' }}>
                        <Link to={`/project/${projectId}/for-you`} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                            <img src={kartasLogoWhite} alt="Kartas" style={{ height: '36px' }} />
                            <span style={{ color: 'white', fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)' }}>Kartas</span>
                        </Link>
                    </div>
                    <UserDropdown />
                </div>
            </header>

            {/* Sidebar */}
            <Sidebar projectId={projectId} projectName={projectName} projectDescription={projectDescription} />

            {/* Main Content */}
            <div className={`page-content ${isSidebarCollapsed ? 'with-sidebar-collapsed' : 'with-sidebar-expanded'}`}>
                <div className="container" style={{ marginTop: 'var(--spacing-xl)', marginBottom: 'var(--spacing-xl)', ...(wide ? { maxWidth: '1400px' } : {}) }}>
                    {children}
                </div>
            </div>
        </div>
    );
};

export default ProjectLayout;
