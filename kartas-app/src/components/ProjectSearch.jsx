import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

// SRCH-02: navigation per result type, shared with SearchResults.jsx (SRCH-03)
// so both places send the user to the same destination for the same result.
export function navigateToResult(navigate, projectId, item) {
    switch (item.type) {
        case 'story':
            // /story/:storyId actually keys on the story's numeric id, not its
            // human-readable code.
            navigate(`/project/${projectId}/story/${item.storyId}`);
            break;
        case 'sub_task':
            // item.storyId is the PARENT story's numeric id (sub-tasks have no
            // page of their own); ?editSubItem=<id> is the existing signal
            // StoryDetail.jsx already reads on mount (added for KAN-02) to
            // auto-open that sub-item's edit modal once the story loads.
            navigate(`/project/${projectId}/story/${item.storyId}?editSubItem=${item.id}`);
            break;
        case 'epic':
            navigate(`/project/${projectId}/epic/${item.id}`);
            break;
        case 'user':
            navigate(`/project/${projectId}/user/${item.id}`);
            break;
        default:
            break;
    }
}

const TYPE_ICONS = {
    epic: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 1L9.79 5.51L14.5 5.85L10.91 9.09L12 13.5L8 11.02L4 13.5L5.09 9.09L1.5 5.85L6.21 5.51L8 1Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
    ),
    story: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M4 2H12C12.55 2 13 2.45 13 3V13C13 13.55 12.55 14 12 14H4C3.45 14 3 13.55 3 13V3C3 2.45 3.45 2 4 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M5.5 5.5H10.5M5.5 8H10.5M5.5 10.5H8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
    ),
    sub_task: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M2.5 4L5 6.5L2.5 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M7 9.5H13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
    ),
    user: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 8C9.65685 8 11 6.65685 11 5C11 3.34315 9.65685 2 8 2C6.34315 2 5 3.34315 5 5C5 6.65685 6.34315 8 8 8Z" stroke="currentColor" strokeWidth="1.5" />
            <path d="M2 14C2 11.2386 4.68629 9 8 9C11.3137 9 14 11.2386 14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
    )
};

export const TypeIcon = ({ type }) => (
    <span style={{ display: 'inline-flex', color: 'var(--color-neutral-500)', flexShrink: 0 }}>
        {TYPE_ICONS[type] || null}
    </span>
);

export const SearchResultRow = ({ item, onClick }) => (
    <div className="search-result-item" onClick={onClick}>
        <TypeIcon type={item.type} />
        <div className="user-info">
            <span className="user-display-name">
                {item.code ? `${item.code} — ${item.title}` : item.title}
            </span>
            {item.context && (
                <span className="user-email">{item.context}</span>
            )}
        </div>
    </div>
);

const ProjectSearch = ({ projectId }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef(null);
    const navigate = useNavigate();

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
        const search = async () => {
            if (query.length < 2) {
                setResults([]);
                setHasMore(false);
                return;
            }
            setLoading(true);
            try {
                const response = await api.get(
                    `/search/project/${projectId}?q=${encodeURIComponent(query)}`
                );
                setResults(response.data.items);
                setHasMore(response.data.hasMore);
                setIsOpen(true);
            } catch (error) {
                console.error('Error searching:', error);
            } finally {
                setLoading(false);
            }
        };
        const timeoutId = setTimeout(search, 300);
        return () => clearTimeout(timeoutId);
    }, [query, projectId]);

    const handleSelect = (item) => {
        setIsOpen(false);
        setQuery('');
        navigateToResult(navigate, projectId, item);
    };

    const handleSeeMore = () => {
        setIsOpen(false);
        navigate(`/project/${projectId}/search?q=${encodeURIComponent(query)}`);
    };

    return (
        <div className="search-container" ref={wrapperRef} style={{ width: '320px' }}>
            <input
                type="text"
                className="form-input"
                placeholder="Search this project..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => query.length >= 2 && results.length > 0 && setIsOpen(true)}
            />
            {isOpen && (
                <div className="search-dropdown">
                    {loading ? (
                        <div style={{ padding: '12px', textAlign: 'center', color: 'var(--color-neutral-500)' }}>
                            Searching...
                        </div>
                    ) : results.length > 0 ? (
                        <>
                            {results.map((item) => (
                                <SearchResultRow
                                    key={`${item.type}-${item.id}`}
                                    item={item}
                                    onClick={() => handleSelect(item)}
                                />
                            ))}
                            {hasMore && (
                                <div className="search-result-item" onClick={handleSeeMore}>
                                    See more results…
                                </div>
                            )}
                        </>
                    ) : (
                        <div style={{ padding: '12px', textAlign: 'center', color: 'var(--color-neutral-500)' }}>
                            No results found
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ProjectSearch;
