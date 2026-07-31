import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { getInitials, getAvatarColor } from '../utils/avatar';

const UserSelect = ({ onSelect, label }) => {
    const { t } = useTranslation(['users']);
    const resolvedLabel = label || t('users:select.searchUser');
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Debounce search
    useEffect(() => {
        const searchUsers = async () => {
            if (query.length < 2) {
                setResults([]);
                return;
            }

            setLoading(true);
            try {
                const response = await api.get(`/users/search?q=${encodeURIComponent(query)}`);
                setResults(response.data);
                setIsOpen(true);
            } catch (error) {
                console.error('Error searching users:', error);
            } finally {
                setLoading(false);
            }
        };

        const timeoutId = setTimeout(searchUsers, 300);
        return () => clearTimeout(timeoutId);
    }, [query]);

    const handleSelect = (user) => {
        onSelect(user);
        setQuery(`${user.firstName} ${user.lastName}`);
        setIsOpen(false);
    };

    return (
        <div className="search-container" ref={wrapperRef}>
            <label className="form-label">{resolvedLabel}</label>
            <input
                type="text"
                className="form-input"
                placeholder={t('users:select.placeholder')}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => query.length >= 2 && setIsOpen(true)}
            />

            {isOpen && (
                <div className="search-dropdown">
                    {loading ? (
                        <div style={{ padding: '12px', textAlign: 'center', color: '#6B778C' }}>
                            {t('users:select.searching')}
                        </div>
                    ) : results.length > 0 ? (
                        results.map((user) => (
                            <div
                                key={user.id}
                                className="search-result-item"
                                onClick={() => handleSelect(user)}
                            >
                                <div className="user-avatar-placeholder" style={{ backgroundColor: getAvatarColor(user.id) }}>
                                    {getInitials(user.firstName, user.lastName)}
                                </div>
                                <div className="user-info">
                                    <span className="user-display-name">
                                        {user.firstName} {user.lastName}
                                    </span>
                                    <span className="user-email">
                                        {user.email}
                                    </span>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div style={{ padding: '12px', textAlign: 'center', color: '#6B778C' }}>
                            {t('users:select.noUsersFound')}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default UserSelect;
