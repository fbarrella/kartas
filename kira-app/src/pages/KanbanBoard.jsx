import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import api from '../services/api';
import ProjectLayout from '../components/ProjectLayout';

const KanbanBoard = () => {
    const { projectId } = useParams();
    const [project, setProject] = useState(null);
    const [sprint, setSprint] = useState(null);
    const [columns, setColumns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedStory, setSelectedStory] = useState(null);
    const [showColumnConfig, setShowColumnConfig] = useState(false);
    const [columnConfig, setColumnConfig] = useState([]);
    const [epics, setEpics] = useState([]);
    const [filter, setFilter] = useState({ type: '', search: '' });

    useEffect(() => {
        fetchProject();
        fetchKanbanBoard();
        fetchColumnConfig();
        fetchEpics();
    }, [projectId]);

    const fetchProject = async () => {
        try {
            const response = await api.get(`/projects/${projectId}`);
            setProject(response.data);
        } catch (error) {
            console.error('Error fetching project:', error);
        }
    };

    const fetchKanbanBoard = async () => {
        try {
            const response = await api.get(`/kanban/project/${projectId}`);
            setSprint(response.data.sprint);
            setColumns(response.data.columns || []);
        } catch (error) {
            console.error('Error fetching kanban board:', error);
            if (error.response?.status === 404) {
                setSprint(null);
                setColumns([]);
            }
        } finally {
            setLoading(false);
        }
    };

    const fetchColumnConfig = async () => {
        try {
            const response = await api.get(`/kanban/project/${projectId}/columns`);
            setColumnConfig(response.data);
        } catch (error) {
            console.error('Error fetching column config:', error);
        }
    };

    const fetchEpics = async () => {
        try {
            const response = await api.get(`/project/${projectId}/epics`);
            setEpics(response.data);
        } catch (error) {
            console.error('Error fetching epics:', error);
        }
    };

    const handleDragEnd = async (result) => {
        const { source, destination, draggableId } = result;

        // Dropped outside a droppable area
        if (!destination) return;

        // Dropped in same position
        if (source.droppableId === destination.droppableId && source.index === destination.index) {
            return;
        }

        const storyId = parseInt(draggableId.replace('story-', ''));
        const sourceColumnId = source.droppableId;
        const destColumnId = destination.droppableId;

        // Create new columns array with updated story positions
        const newColumns = Array.from(columns);
        const sourceColumn = newColumns.find(col => col.status === sourceColumnId);
        const destColumn = newColumns.find(col => col.status === destColumnId);

        // Remove from source
        const [movedStory] = sourceColumn.stories.splice(source.index, 1);

        // Add to destination
        if (sourceColumnId === destColumnId) {
            // Same column, just reorder
            sourceColumn.stories.splice(destination.index, 0, movedStory);
        } else {
            // Different column, update status
            movedStory.status = destColumnId;
            destColumn.stories.splice(destination.index, 0, movedStory);
        }

        // Optimistically update UI
        setColumns(newColumns);

        // Update backend
        if (sourceColumnId !== destColumnId) {
            try {
                await api.put(`/kanban/stories/${storyId}/status`, { status: destColumnId });
            } catch (error) {
                console.error('Error updating story status:', error);
                // Revert on error
                fetchKanbanBoard();
            }
        }
    };

    const handleSaveColumnConfig = async () => {
        try {
            const columnsToSave = columnConfig.map(col => ({
                status: col.status,
                displayName: col.display_name,
                visible: col.visible,
                position: col.position
            }));
            await api.put(`/kanban/project/${projectId}/columns`, { columns: columnsToSave });
            setShowColumnConfig(false);
            fetchKanbanBoard();
        } catch (error) {
            console.error('Error saving column config:', error);
        }
    };

    const getTypeIcon = (type) => {
        const icons = { story: '📖', task: '✓', bug: '🐛' };
        return icons[type] || '📄';
    };

    const getTypeColor = (type) => {
        const colors = {
            story: 'var(--color-primary)',
            task: 'var(--color-success)',
            bug: 'var(--color-danger)'
        };
        return colors[type] || 'var(--color-neutral-400)';
    };

    const filterStories = (stories) => {
        return stories.filter(story => {
            if (filter.type && story.type !== filter.type) return false;
            if (filter.search && !story.title.toLowerCase().includes(filter.search.toLowerCase())) return false;
            return true;
        });
    };

    if (loading) {
        return (
            <ProjectLayout projectId={projectId} projectName={project?.name || 'Loading...'}>
                <div className="text-center">Loading kanban board...</div>
            </ProjectLayout>
        );
    }

    if (!sprint) {
        return (
            <ProjectLayout projectId={projectId} projectName={project?.name || 'Loading...'}>
                <div className="card text-center">
                    <h2>No Active Sprint</h2>
                    <p className="text-muted mt-md">Start a sprint to use the kanban board</p>
                    <Link to={`/project/${projectId}/sprints`} className="btn btn-primary mt-md">
                        Go to Sprints
                    </Link>
                </div>
            </ProjectLayout>
        );
    }

    return (
        <ProjectLayout projectId={projectId} projectName={project?.name || 'Loading...'}>
            <div className="mb-md">
                <h2 style={{ margin: 0, marginBottom: 'var(--spacing-sm)' }}>{sprint?.name || 'Kanban Board'}</h2>
                {sprint?.objective && (
                    <p className="text-muted" style={{ margin: 0 }}>{sprint.objective}</p>
                )}
            </div>

            {/* Toolbar */}
            <div style={{
                backgroundColor: 'var(--color-surface)',
                borderBottom: '1px solid var(--color-border)',
                padding: 'var(--spacing-sm)',
                marginBottom: 'var(--spacing-md)',
                borderRadius: 'var(--radius-md)'
            }}>
                <div className="flex flex-between" style={{ alignItems: 'center' }}>
                    <div className="flex flex-gap-sm">
                        <input
                            type="text"
                            placeholder="Search stories..."
                            className="form-input"
                            style={{ width: '200px' }}
                            value={filter.search}
                            onChange={(e) => setFilter({ ...filter, search: e.target.value })}
                        />
                        <select
                            className="form-select"
                            value={filter.type}
                            onChange={(e) => setFilter({ ...filter, type: e.target.value })}
                        >
                            <option value="">All Types</option>
                            <option value="story">Stories</option>
                            <option value="task">Tasks</option>
                            <option value="bug">Bugs</option>
                        </select>
                    </div>
                    <button
                        onClick={() => setShowColumnConfig(true)}
                        className="btn btn-secondary btn-sm"
                    >
                        ⚙️ Customize Columns
                    </button>
                </div>
            </div>

            {/* Kanban Board */}
            <div className="container" style={{ marginTop: 'var(--spacing-md)', overflowX: 'auto' }}>
                <DragDropContext onDragEnd={handleDragEnd}>
                    <div style={{
                        display: 'flex',
                        gap: 'var(--spacing-md)',
                        minWidth: 'fit-content',
                        paddingBottom: 'var(--spacing-lg)'
                    }}>
                        {columns.map((column) => {
                            const filteredStories = filterStories(column.stories);

                            return (
                                <div key={column.status} style={{
                                    minWidth: '300px',
                                    maxWidth: '350px',
                                    backgroundColor: 'var(--color-surface)',
                                    borderRadius: 'var(--radius-md)',
                                    padding: 'var(--spacing-sm)',
                                    boxShadow: 'var(--shadow-sm)'
                                }}>
                                    {/* Column Header */}
                                    <div style={{
                                        padding: 'var(--spacing-sm)',
                                        marginBottom: 'var(--spacing-sm)',
                                        fontWeight: 600,
                                        fontSize: 'var(--font-size-md)'
                                    }}>
                                        {column.displayName}
                                        <span className="badge badge-neutral" style={{ marginLeft: '8px' }}>
                                            {filteredStories.length}
                                        </span>
                                    </div>

                                    {/* Droppable Area */}
                                    <Droppable droppableId={column.status}>
                                        {(provided, snapshot) => (
                                            <div
                                                ref={provided.innerRef}
                                                {...provided.droppableProps}
                                                style={{
                                                    minHeight: '400px',
                                                    backgroundColor: snapshot.isDraggingOver
                                                        ? 'var(--color-neutral-50)'
                                                        : 'transparent',
                                                    borderRadius: 'var(--radius-sm)',
                                                    padding: 'var(--spacing-xs)',
                                                    transition: 'background-color 0.2s ease'
                                                }}
                                            >
                                                {filteredStories.map((story, index) => (
                                                    <Draggable
                                                        key={`story-${story.id}`}
                                                        draggableId={`story-${story.id}`}
                                                        index={index}
                                                    >
                                                        {(provided, snapshot) => (
                                                            <div
                                                                ref={provided.innerRef}
                                                                {...provided.draggableProps}
                                                                {...provided.dragHandleProps}
                                                                onClick={() => setSelectedStory(story)}
                                                                style={{
                                                                    ...provided.draggableProps.style,
                                                                    backgroundColor: 'white',
                                                                    borderRadius: 'var(--radius-sm)',
                                                                    padding: 'var(--spacing-sm)',
                                                                    marginBottom: 'var(--spacing-sm)',
                                                                    boxShadow: snapshot.isDragging
                                                                        ? 'var(--shadow-lg)'
                                                                        : 'var(--shadow-sm)',
                                                                    cursor: 'grab',
                                                                    borderLeft: `4px solid ${getTypeColor(story.type)}`,
                                                                    userSelect: 'none'
                                                                }}
                                                            >
                                                                {/* Story Card Content */}
                                                                <div className="flex flex-between mb-xs">
                                                                    <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-neutral-700)' }}>
                                                                        {story.storyId}
                                                                    </span>
                                                                    <span title={story.type}>
                                                                        {getTypeIcon(story.type)}
                                                                    </span>
                                                                </div>
                                                                <div style={{
                                                                    fontSize: 'var(--font-size-sm)',
                                                                    marginBottom: 'var(--spacing-xs)',
                                                                    lineHeight: '1.4',
                                                                    color: 'var(--color-neutral-900)'
                                                                }}>
                                                                    {story.title}
                                                                </div>
                                                                {story.epicTitle && (
                                                                    <div style={{ marginBottom: 'var(--spacing-xs)' }}>
                                                                        <Link
                                                                            to={`/project/${projectId}/backlog?epic=${story.epicId}`}
                                                                            onClick={(e) => e.stopPropagation()}
                                                                            style={{ textDecoration: 'none' }}
                                                                        >
                                                                            <span style={{
                                                                                padding: '2px 6px',
                                                                                fontSize: '10px',
                                                                                backgroundColor: epics.find(e => e.id === story.epicId)?.color || '#0052CC',
                                                                                color: 'white',
                                                                                borderRadius: 'var(--radius-sm)',
                                                                                fontWeight: '600',
                                                                                whiteSpace: 'nowrap',
                                                                                display: 'inline-block',
                                                                                cursor: 'pointer',
                                                                                transition: 'opacity 0.2s'
                                                                            }}
                                                                                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                                                                                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                                                                                title="Click to filter by this epic"
                                                                            >
                                                                                {story.epicTitle}
                                                                            </span>
                                                                        </Link>
                                                                    </div>
                                                                )}
                                                                <div className="flex flex-between" style={{
                                                                    fontSize: 'var(--font-size-xs)',
                                                                    color: 'var(--color-neutral-500)'
                                                                }}>
                                                                    <span>
                                                                        {story.assigneeName ? `@${story.assigneeName.split(' ')[0]}` : 'Unassigned'}
                                                                    </span>
                                                                    <div className="flex flex-gap-xs">
                                                                        {story.storyPoints && (
                                                                            <span className="badge badge-neutral" style={{ fontSize: '10px', padding: '2px 6px' }}>
                                                                                {story.storyPoints}
                                                                            </span>
                                                                        )}
                                                                        {story.totalSubtasks > 0 && (
                                                                            <span className="badge badge-neutral" style={{ fontSize: '10px', padding: '2px 6px' }}>
                                                                                ✓ {story.completedSubtasks}/{story.totalSubtasks}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </Draggable>
                                                ))}
                                                {provided.placeholder}
                                                {filteredStories.length === 0 && (
                                                    <div style={{
                                                        textAlign: 'center',
                                                        padding: 'var(--spacing-xl)',
                                                        color: 'var(--color-neutral-400)',
                                                        fontSize: 'var(--font-size-sm)'
                                                    }}>
                                                        {filter.search || filter.type ? 'No matching stories' : 'No stories'}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </Droppable>
                                </div>
                            );
                        })}
                    </div>
                </DragDropContext>
            </div>

            {/* Story Details Modal */}
            {selectedStory && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    overflowY: 'auto'
                }} onClick={() => setSelectedStory(null)}>
                    <div className="card" style={{ maxWidth: '700px', width: '100%', margin: 'var(--spacing-md)' }}
                        onClick={(e) => e.stopPropagation()}>
                        <div className="card-header">
                            <div className="flex flex-between" style={{ alignItems: 'center' }}>
                                <h3 className="card-title">{selectedStory.storyId}</h3>
                                <span>{getTypeIcon(selectedStory.type)} {selectedStory.type}</span>
                            </div>
                        </div>

                        <div>
                            <h4>{selectedStory.title}</h4>

                            {selectedStory.description && (
                                <div className="mt-md">
                                    <strong>Description:</strong>
                                    <p className="mt-sm" style={{ whiteSpace: 'pre-wrap' }}>
                                        {selectedStory.description}
                                    </p>
                                </div>
                            )}

                            <div className="mt-md" style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
                                gap: 'var(--spacing-md)'
                            }}>
                                <div>
                                    <strong>Status:</strong>
                                    <p className="mt-xs">{selectedStory.status}</p>
                                </div>
                                <div>
                                    <strong>Story Points:</strong>
                                    <p className="mt-xs">{selectedStory.storyPoints || 'Not set'}</p>
                                </div>
                                <div>
                                    <strong>Assignee:</strong>
                                    <p className="mt-xs">{selectedStory.assigneeName || 'Unassigned'}</p>
                                </div>
                                <div>
                                    <strong>Sub-tasks:</strong>
                                    <p className="mt-xs">
                                        {selectedStory.completedSubtasks}/{selectedStory.totalSubtasks} completed
                                    </p>
                                </div>
                            </div>

                            <div className="mt-lg flex flex-gap-sm" style={{ justifyContent: 'flex-end' }}>
                                <button
                                    onClick={() => setSelectedStory(null)}
                                    className="btn btn-secondary"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Column Configuration Modal */}
            {showColumnConfig && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }} onClick={() => setShowColumnConfig(false)}>
                    <div className="card" style={{ maxWidth: '600px', width: '100%', margin: 'var(--spacing-md)' }}
                        onClick={(e) => e.stopPropagation()}>
                        <div className="card-header">
                            <h3 className="card-title">Customize Kanban Columns</h3>
                        </div>

                        <div>
                            {columnConfig.map((col, index) => (
                                <div key={col.status} className="flex flex-between mb-md" style={{
                                    padding: 'var(--spacing-sm)',
                                    backgroundColor: 'var(--color-background)',
                                    borderRadius: 'var(--radius-sm)'
                                }}>
                                    <div className="flex flex-gap-md" style={{ alignItems: 'center', flex: 1 }}>
                                        <input
                                            type="checkbox"
                                            checked={col.visible}
                                            onChange={(e) => {
                                                const newConfig = [...columnConfig];
                                                newConfig[index].visible = e.target.checked;
                                                setColumnConfig(newConfig);
                                            }}
                                        />
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={col.display_name}
                                            onChange={(e) => {
                                                const newConfig = [...columnConfig];
                                                newConfig[index].display_name = e.target.value;
                                                setColumnConfig(newConfig);
                                            }}
                                            style={{ flex: 1 }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex flex-gap-sm mt-lg" style={{ justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => setShowColumnConfig(false)}
                                className="btn btn-secondary"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveColumnConfig}
                                className="btn btn-primary"
                            >
                                Save Configuration
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </ProjectLayout>
    );
};

export default KanbanBoard;
