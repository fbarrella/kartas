import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { getInitials, getAvatarColor } from '../utils/avatar';

// Single "@" trigger, auto-detected as person or ticket from the autocomplete
// selection (CMT-03's resolved design decision) — searches project members and
// this project's stories/epics together, and inserts plain readable text
// ("@First Last" or the bare ticket code) at the cursor. No hidden markup.
const MentionTextarea = ({ value, onChange, projectId, placeholder, rows = 3 }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [results, setResults] = useState([]);
    const [matchRange, setMatchRange] = useState(null); // { start, end } of the "@partial" being typed
    const textareaRef = useRef(null);
    const wrapperRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (!matchRange) {
            setResults([]);
            return;
        }
        const term = value.slice(matchRange.start + 1, matchRange.end);
        if (term.length < 1) {
            setResults([]);
            return;
        }

        const timeoutId = setTimeout(async () => {
            try {
                const [usersRes, ticketsRes] = await Promise.all([
                    api.get(`/users/search?q=${encodeURIComponent(term)}`),
                    api.get(`/stories/search?projectId=${projectId}&q=${encodeURIComponent(term)}`)
                ]);
                const userResults = usersRes.data.map(u => ({ kind: 'user', ...u }));
                const ticketResults = ticketsRes.data.map(t => ({ kind: 'ticket', ...t }));
                setResults([...userResults, ...ticketResults].slice(0, 8));
                setIsOpen(true);
            } catch (error) {
                console.error('Error searching mentions:', error);
            }
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [matchRange, value, projectId]);

    const handleChange = (e) => {
        const newValue = e.target.value;
        const cursorPos = e.target.selectionStart;
        onChange(newValue);

        const uptoCursor = newValue.slice(0, cursorPos);
        const match = uptoCursor.match(/@([A-Za-z0-9][\w.\- ]{0,40})$/);
        if (match) {
            setMatchRange({ start: cursorPos - match[0].length, end: cursorPos });
        } else {
            setMatchRange(null);
            setIsOpen(false);
        }
    };

    const handleSelect = (item) => {
        if (!matchRange) return;
        const label = item.kind === 'user' ? `${item.firstName} ${item.lastName}` : item.code;
        const before = value.slice(0, matchRange.start);
        const after = value.slice(matchRange.end);
        const newValue = `${before}@${label} ${after}`;
        onChange(newValue);
        setIsOpen(false);
        setMatchRange(null);

        requestAnimationFrame(() => {
            const cursorPos = before.length + label.length + 2;
            textareaRef.current?.focus();
            textareaRef.current?.setSelectionRange(cursorPos, cursorPos);
        });
    };

    return (
        <div className="search-container" ref={wrapperRef} style={{ position: 'relative' }}>
            <textarea
                ref={textareaRef}
                className="form-input"
                rows={rows}
                value={value}
                placeholder={placeholder}
                onChange={handleChange}
            />
            {isOpen && results.length > 0 && (
                <div className="search-dropdown">
                    {results.map((item, i) => (
                        <div
                            key={`${item.kind}-${item.id}-${i}`}
                            className="search-result-item"
                            onClick={() => handleSelect(item)}
                        >
                            {item.kind === 'user' ? (
                                <>
                                    <div className="user-avatar-placeholder" style={{ backgroundColor: getAvatarColor(item.id) }}>
                                        {getInitials(item.firstName, item.lastName)}
                                    </div>
                                    <div className="user-info">
                                        <span className="user-display-name">{item.firstName} {item.lastName}</span>
                                        <span className="user-email">{item.email}</span>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="user-avatar-placeholder" style={{ backgroundColor: 'var(--color-neutral-500)', borderRadius: 'var(--radius-sm)' }}>
                                        {item.type === 'epic' ? '🎯' : '📖'}
                                    </div>
                                    <div className="user-info">
                                        <span className="user-display-name">{item.code}</span>
                                        <span className="user-email">{item.title}</span>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MentionTextarea;
