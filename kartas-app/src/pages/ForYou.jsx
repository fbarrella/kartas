import React, { useState, useEffect } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import Breadcrumb from '../components/Breadcrumb';
import MyTasksWidget from '../components/MyTasksWidget';
import ActionsHistoryWidget from '../components/ActionsHistoryWidget';
import LatestActivitiesWidget from '../components/LatestActivitiesWidget';
import TeamWorkloadWidget from '../components/TeamWorkloadWidget';
import SprintCountdownWidget from '../components/SprintCountdownWidget';
import WidgetSettingsModal, { WIDGET_DEFS, DEFAULT_WIDGETS, DEFAULT_GRID_COLUMNS } from '../components/WidgetSettingsModal';
import '../components/navigation.css';

const WIDGET_COMPONENTS = {
    myTasks: MyTasksWidget,
    actionsHistory: ActionsHistoryWidget,
    latestActivities: LatestActivitiesWidget,
    teamWorkload: TeamWorkloadWidget,
    sprintCountdown: SprintCountdownWidget
};

const ForYou = () => {
    const { t } = useTranslation(['dashboard', 'common']);
    const { projectId } = useParams();
    const { projectName, defaultLandingPage } = useOutletContext();
    const [visibleWidgets, setVisibleWidgets] = useState(DEFAULT_WIDGETS);
    const [gridColumns, setGridColumns] = useState(DEFAULT_GRID_COLUMNS);
    const [settingsLoaded, setSettingsLoaded] = useState(false);
    const [showSettings, setShowSettings] = useState(false);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const response = await api.get(`/projects/${projectId}/settings`);
                setVisibleWidgets(response.data.visibleWidgets || DEFAULT_WIDGETS);
                setGridColumns(response.data.gridColumns || DEFAULT_GRID_COLUMNS);
            } catch (error) {
                console.error('Error fetching widget settings:', error);
            } finally {
                setSettingsLoaded(true);
            }
        };
        fetchSettings();
    }, [projectId]);

    const handleSaveWidgets = async (newVisibleWidgets, newGridColumns) => {
        setVisibleWidgets(newVisibleWidgets);
        setGridColumns(newGridColumns);
        setShowSettings(false);
        try {
            await api.put(`/projects/${projectId}/settings`, { visibleWidgets: newVisibleWidgets, gridColumns: newGridColumns });
        } catch (error) {
            console.error('Error saving widget settings:', error);
        }
    };

    return (
        <div>
            <Breadcrumb items={[
                { label: t('dashboard:dashboardPage.breadcrumbProjects'), to: '/' },
                { label: projectName, to: `/project/${projectId}/${defaultLandingPage}` },
                { label: t('dashboard:forYouPage.breadcrumbLabel') },
            ]} />

            <div className="flex flex-between mb-lg" style={{ alignItems: 'center' }}>
                <h2 style={{ margin: 0 }}>{t('dashboard:forYouPage.heading')}</h2>
                <button
                    onClick={() => setShowSettings(true)}
                    className="btn btn-secondary btn-sm"
                    title={t('dashboard:forYouPage.customizeTooltip')}
                >
                    {t('dashboard:forYouPage.customizeButton')}
                </button>
            </div>

            {!settingsLoaded ? (
                <div className="text-center">{t('dashboard:forYouPage.loading')}</div>
            ) : visibleWidgets.length === 0 ? (
                <div className="card text-center">
                    <h3>{t('dashboard:forYouPage.emptyTitle')}</h3>
                    <p className="text-muted mt-md">{t('dashboard:forYouPage.emptyText')}</p>
                </div>
            ) : (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${gridColumns}, 1fr)`,
                    gap: 'var(--spacing-lg)',
                    alignItems: 'stretch'
                }}>
                    {WIDGET_DEFS
                        .filter(widget => visibleWidgets.includes(widget.id))
                        .map(widget => {
                            const WidgetComponent = WIDGET_COMPONENTS[widget.id];
                            return <WidgetComponent key={widget.id} projectId={projectId} />;
                        })}
                </div>
            )}

            {showSettings && (
                <WidgetSettingsModal
                    visibleWidgets={visibleWidgets}
                    gridColumns={gridColumns}
                    onClose={() => setShowSettings(false)}
                    onSave={handleSaveWidgets}
                />
            )}
        </div>
    );
};

export default ForYou;
