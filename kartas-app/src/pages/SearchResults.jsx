import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate, useOutletContext } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import Breadcrumb from '../components/Breadcrumb';
import { navigateToResult, SearchResultRow } from '../components/ProjectSearch';

const PAGE_SIZE = 10;

const SECTIONS = [
    { key: 'epics' },
    { key: 'stories' },
    { key: 'subTasks' },
    { key: 'users' }
];

const emptySectionsState = () =>
    Object.fromEntries(SECTIONS.map(s => [s.key, { items: [], hasMore: false, loading: false }]));

const SearchResults = () => {
    const { t } = useTranslation(['search', 'common']);
    const { projectId } = useParams();
    const { projectName, defaultLandingPage } = useOutletContext();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const q = searchParams.get('q') || '';

    const [sectionsState, setSectionsState] = useState(emptySectionsState);

    const fetchSection = async (sectionKey, offset) => {
        setSectionsState(prev => ({
            ...prev,
            [sectionKey]: { ...prev[sectionKey], loading: true }
        }));
        try {
            const response = await api.get(
                `/search/project/${projectId}?full=true&section=${sectionKey}&q=${encodeURIComponent(q)}&limit=${PAGE_SIZE}&offset=${offset}`
            );
            setSectionsState(prev => ({
                ...prev,
                [sectionKey]: {
                    items: offset === 0 ? response.data.items : [...prev[sectionKey].items, ...response.data.items],
                    hasMore: response.data.hasMore,
                    loading: false
                }
            }));
        } catch (error) {
            console.error(`Error fetching ${sectionKey} search results:`, error);
            setSectionsState(prev => ({ ...prev, [sectionKey]: { ...prev[sectionKey], loading: false } }));
        }
    };

    useEffect(() => {
        setSectionsState(emptySectionsState());
        if (q.length < 2) return;
        SECTIONS.forEach(s => fetchSection(s.key, 0));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [q, projectId]);

    return (
        <>
            <Breadcrumb items={[
                { label: t('search:breadcrumb.projects'), to: '/' },
                { label: projectName, to: `/project/${projectId}/${defaultLandingPage}` },
                { label: t('search:breadcrumb.searchResults') },
            ]} />

            <h2 className="mb-md">{t('search:resultsTitle', { query: q })}</h2>

            {q.length < 2 ? (
                <div className="card text-center">
                    <p className="text-muted">{t('search:typeToSearch')}</p>
                </div>
            ) : (
                SECTIONS.map(({ key }) => {
                    const section = sectionsState[key];
                    const label = t(`search:sections.${key}`);
                    return (
                        <div key={key} className="card mb-md">
                            <div className="card-header">
                                <h3 className="card-title">{label}</h3>
                            </div>
                            {section.items.length === 0 && !section.loading ? (
                                <p className="text-muted" style={{ padding: 'var(--spacing-md)' }}>{t('search:noMatching', { section: label.toLowerCase() })}</p>
                            ) : (
                                <>
                                    {section.items.map(item => (
                                        <SearchResultRow
                                            key={`${item.type}-${item.id}`}
                                            item={item}
                                            onClick={() => navigateToResult(navigate, projectId, item)}
                                        />
                                    ))}
                                    {section.hasMore && (
                                        <button
                                            onClick={() => fetchSection(key, section.items.length)}
                                            disabled={section.loading}
                                            className="btn btn-secondary btn-sm mt-sm"
                                        >
                                            {section.loading ? t('common:loading') : t('common:loadMore')}
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    );
                })
            )}
        </>
    );
};

export default SearchResults;
