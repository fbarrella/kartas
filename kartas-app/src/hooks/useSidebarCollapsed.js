import { useState, useEffect } from 'react';

// Sidebar.jsx writes 'sidebarCollapsed' to localStorage directly (no shared
// React state/context with its parent). The browser's native 'storage' event
// only fires in other tabs, never in the tab that made the write, so a short
// poll is needed to pick up same-tab toggles.
export function useSidebarCollapsed() {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
        const saved = localStorage.getItem('sidebarCollapsed');
        return saved === 'true';
    });

    useEffect(() => {
        const handleStorageChange = () => {
            const saved = localStorage.getItem('sidebarCollapsed');
            setIsSidebarCollapsed(saved === 'true');
        };

        window.addEventListener('storage', handleStorageChange);
        const interval = setInterval(handleStorageChange, 100);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            clearInterval(interval);
        };
    }, []);

    return isSidebarCollapsed;
}
