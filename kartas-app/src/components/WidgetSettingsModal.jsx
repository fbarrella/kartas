import React, { useState } from 'react';

export const WIDGET_DEFS = [
    { id: 'myTasks', label: 'My Tasks' },
    { id: 'actionsHistory', label: 'Actions History' },
    { id: 'latestActivities', label: 'Latest Activities' },
    { id: 'teamWorkload', label: 'Team Workload' },
    { id: 'sprintCountdown', label: 'Sprint Countdown' }
];

export const DEFAULT_WIDGETS = ['myTasks', 'actionsHistory'];
export const DEFAULT_GRID_COLUMNS = 2;

// FY-06: gear-icon-opens-modal pattern, mirroring KanbanBoard.jsx's existing
// "Customize Columns" modal rather than a dedicated settings page — this is a
// per-page, per-user preference, not a project-wide one.
const WidgetSettingsModal = ({ visibleWidgets, gridColumns, onClose, onSave }) => {
    const [selected, setSelected] = useState(visibleWidgets);
    const [columns, setColumns] = useState(gridColumns);

    const toggle = (id) => {
        setSelected(prev => prev.includes(id) ? prev.filter(w => w !== id) : [...prev, id]);
    };

    return (
        <div
            style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', zIndex: 1000
            }}
            onClick={onClose}
        >
            <div className="card" style={{ maxWidth: '400px', width: '100%', margin: 'var(--spacing-md)' }} onClick={(e) => e.stopPropagation()}>
                <div className="card-header">
                    <h3 className="card-title">Customize Widgets</h3>
                </div>
                <p className="text-muted mb-md" style={{ fontSize: 'var(--font-size-sm)' }}>
                    Choose which widgets show on your For You page.
                </p>
                {WIDGET_DEFS.map(widget => (
                    <label
                        key={widget.id}
                        className="flex flex-gap-sm mb-sm"
                        style={{ alignItems: 'center', cursor: 'pointer' }}
                    >
                        <input
                            type="checkbox"
                            checked={selected.includes(widget.id)}
                            onChange={() => toggle(widget.id)}
                        />
                        <span>{widget.label}</span>
                    </label>
                ))}

                <div className="mt-lg" style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--spacing-md)' }}>
                    <div style={{ fontWeight: 'var(--font-weight-medium)', marginBottom: 'var(--spacing-sm)' }}>Layout</div>
                    <div className="flex flex-gap-md">
                        {[2, 3].map(n => (
                            <label key={n} className="flex flex-gap-sm" style={{ alignItems: 'center', cursor: 'pointer' }}>
                                <input
                                    type="radio"
                                    name="grid-columns"
                                    checked={columns === n}
                                    onChange={() => setColumns(n)}
                                />
                                <span>{n} columns</span>
                            </label>
                        ))}
                    </div>
                </div>

                <div className="flex flex-gap-sm mt-lg" style={{ justifyContent: 'flex-end' }}>
                    <button onClick={onClose} className="btn btn-secondary">Cancel</button>
                    <button onClick={() => onSave(selected, columns)} className="btn btn-primary">Save</button>
                </div>
            </div>
        </div>
    );
};

export default WidgetSettingsModal;
