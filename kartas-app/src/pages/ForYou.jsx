import React, { useState, useEffect } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
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
                { label: 'Projects', to: '/' },
                { label: projectName, to: `/project/${projectId}/${defaultLandingPage}` },
                { label: 'For You' },
            ]} />

            <div className="flex flex-between mb-lg" style={{ alignItems: 'center' }}>
                <h2 style={{ margin: 0 }}>For You</h2>
                <button
                    onClick={() => setShowSettings(true)}
                    className="btn btn-secondary btn-sm"
                    title="Customize widgets"
                >
                    ⚙️ Customize
                </button>
            </div>

            {!settingsLoaded ? (
                <div className="text-center">Loading...</div>
            ) : visibleWidgets.length === 0 ? (
                <div className="card text-center">
                    <h3>Your For You page is empty</h3>
                    <p className="text-muted mt-md">Click ⚙️ Customize above to choose which widgets to show here.</p>
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
