import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const UserDropdown = () => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    // Generate initials from user name
    const getInitials = () => {
        if (!user) return '??';
        const firstInitial = user.firstName?.[0] || '';
        const lastInitial = user.lastName?.[0] || '';
        return (firstInitial + lastInitial).toUpperCase();
    };

    const getFullName = () => {
        if (!user) return 'User';
        return `${user.firstName || ''} ${user.lastName || ''}`.trim();
    };

    return (
        <div className="user-dropdown" ref={dropdownRef}>
            <button
                className="user-dropdown-trigger"
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
                aria-haspopup="true"
            >
                <div className="user-avatar">
                    {getInitials()}
                </div>
                <span className="user-name">{getFullName()}</span>
                <svg
                    className={`dropdown-chevron ${isOpen ? 'open' : ''}`}
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                >
                    <path
                        d="M4 6L8 10L12 6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            </button>

            {isOpen && (
                <div className="user-dropdown-menu">
                    <Link
                        to="/profile"
                        className="dropdown-item"
                        onClick={() => setIsOpen(false)}
                    >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M8 8C10.21 8 12 6.21 12 4C12 1.79 10.21 0 8 0C5.79 0 4 1.79 4 4C4 6.21 5.79 8 8 8ZM8 10C5.33 10 0 11.34 0 14V16H16V14C16 11.34 10.67 10 8 10Z" fill="currentColor" />
                        </svg>
                        <span>My Profile</span>
                    </Link>

                    {user?.role === 'admin' && (
                        <Link
                            to="/users"
                            className="dropdown-item"
                            onClick={() => setIsOpen(false)}
                        >
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <path d="M5.5 5C6.88 5 8 3.88 8 2.5C8 1.12 6.88 0 5.5 0C4.12 0 3 1.12 3 2.5C3 3.88 4.12 5 5.5 5ZM10.5 5C11.6 5 12.5 4.1 12.5 3C12.5 1.9 11.6 1 10.5 1C9.4 1 8.5 1.9 8.5 3C8.5 4.1 9.4 5 10.5 5ZM5.5 6.5C3.67 6.5 0 7.42 0 9.25V11H11V9.25C11 7.42 7.33 6.5 5.5 6.5ZM10.5 6.5C10.29 6.5 10.05 6.51 9.8 6.53C10.61 7.13 11.13 7.94 11.13 9.25V11H16V9.25C16 7.42 12.33 6.5 10.5 6.5Z" fill="currentColor" />
                            </svg>
                            <span>User Management</span>
                        </Link>
                    )}

                    <div className="dropdown-divider"></div>

                    <button
                        className="dropdown-item"
                        onClick={handleLogout}
                    >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M6 14H3C2.73478 14 2.48043 13.8946 2.29289 13.7071C2.10536 13.5196 2 13.2652 2 13V3C2 2.73478 2.10536 2.48043 2.29289 2.29289C2.48043 2.10536 2.73478 2 3 2H6M11 11L14 8M14 8L11 5M14 8H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span>Logout</span>
                    </button>
                </div>
            )}
        </div>
    );
};

export default UserDropdown;
