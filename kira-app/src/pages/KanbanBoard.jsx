import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import api from '../services/api';

const KanbanBoard = () => {
    const { projectId } = useParams();
    const [project, setProject] = useState(null);
    const [boardData, setBoardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedStory, setSelectedStory] = useState(null);
    const [showColumnConfig, setShowColumnConfig] = useState(false);
    const [columnConfig, setColumnConfig] = useState([]);
    const [filter, setFilter] = useState({ assignee: '', type: '', search: '' });

    useEffect(() => {
        fetchProject();
        fetchKanbanBoard();
        fetchColumnConfig();
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
            setBoardData(response.data);
        } catch (error) {
            console.error('Error fetching kanban board:', error);
            if (error.response?.status === 404) {
                setBoardData({ error: 'No active sprint found' });
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

    const handleDragEnd = async (result) => {
        if (!result.destination) return;

        const { source, destination, draggableId } = result;

        // If dropped in same column, no change
        if (source.droppableId === destination.droppableId) return;

        const storyId = parseInt(draggableId.replace('story-', ''));
        const newStatus = destination.droppableId;

        // Optimistic update
        const newBoardData = { ...boardData };
        const sourceColumn = newBoardData.columns.find(c => c.status === source.droppableId);
        const destColumn = newBoardData.columns.find(c => c.status === newStatus);

        const [movedStory] = sourceColumn.stories.splice(source.index, 1);
        movedStory.status = newStatus;
        destColumn.stories.splice(destination.index, 0, movedStory);

        setBoardData(newBoardData);

        // Update backend
        try {
            await api.put(`/kanban/stories/${storyId}/status`, { status: newStatus });
        } catch (error) {
            console.error('Error updating story status:', error);
            // Revert on error
            fetchKanbanBoard();
        }
    };

    const handleSaveColumnConfig = async () => {
        try {
            await api.put(`/kanban/project/${projectId}/columns`, { columns: columnConfig });
            setShowColumnConfig(false);
            fetchKanbanBoard();
        } catch (error) {
            console.error('Error saving column config:', error);
        }
    };

    const getTypeIcon = (type) => {
        const icons = {
            story: '📖',
            task: '✓',
            bug: '🐛'
        };
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
            if (filter.assignee && story.assigneeId !== parseInt(filter.assignee)) return false;
            if (filter.type && story.type !== filter.type) return false;
            if (filter.search && !story.title.toLowerCase().includes(filter.search.toLowerCase())) return false;
            return true;
        });
    };

    if (loading) {
        return <div className="container mt-lg">Loading kanban board...</div>;
    }

    if (boardData?.error) {
        return (
            <div className="container mt-lg">
                <div className="card text-center">
                    <h2>No Active Sprint</h2>
                    <p className="text-muted mt-md">Start a sprint to use the kanban board</p>
                    <Link to={`/project/${projectId}/sprints`} className="btn btn-primary mt-md">
                        Go to Sprints
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-background)' }}>
            {/* Header */}
            <header style={{
                backgroundColor: 'var(--color-primary)',
                color: 'white',
                padding: 'var(--spacing-md) 0',
                boxShadow: 'var(--shadow-md)'
            }}>
                <div className="container">
                    <div className="flex flex-gap-md mb-sm" style={{ alignItems: 'center' }}>
                        <Link to={`/project/${projectId}`} style={{ color: 'white', textDecoration: 'none' }}>
                            ← Back
                        </Link>
                        <h1 style={{ color: 'white', margin: 0 }}>
                            {boardData?.sprint?.name || 'Kanban Board'}
                        </h1>
                    </div>
                    {boardData?.sprint?.objective && (
                        <p style={{ color: 'rgba(255,255,255,0.9)', margin: 0 }}>
                            {boardData.sprint.objective}
                        </p>
                    )}
                </div>
            </header>

            {/* Toolbar */}
            <div style={{
                backgroundColor: 'var(--color-surface)',
                borderBottom: '1px solid var(--color-border)',
                padding: 'var(--spacing-sm) 0'
            }}>
                <div className="container flex flex-between" style={{ alignItems: 'center' }}>
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
                        {boardData?.columns?.map((column) => {
                            const filteredStories = filterStories(column.stories);

                            return (
                                <div key={column.status} style={{
                                    minWidth: '300px',
                                    maxWidth: '350px',
                                    backgroundColor: 'var(--color-surface)',
                                    borderRadius: 'var(--border-radius)',
                                    padding: 'var(--spacing-sm)'
                                }}>
                                    {/* Column Header */}
                                    <div style={{
                                        padding: 'var(--spacing-sm)',
                                        marginBottom: 'var(--spacing-sm)',
                                        fontWeight: 600
                                    }}>
                                        {column.displayName}
                                        <span className="badge badge-neutral ml-sm">
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
                                                    minHeight: '200px',
                                                    backgroundColor: snapshot.isDraggingOver
                                                        ? 'var(--color-neutral-100)'
                                                        : 'transparent',
                                                    borderRadius: 'var(--border-radius)',
                                                    padding: 'var(--spacing-xs)'
                                                }}
                                            >
                                                {filteredStories.map((story, index) => (
                                                    <Draggable
                                                        key={story.id}
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
                                                                    borderRadius: 'var(--border-radius)',
                                                                    padding: 'var(--spacing-sm)',
                                                                    marginBottom: 'var(--spacing-sm)',
                                                                    boxShadow: snapshot.isDragging
                                                                        ? 'var(--shadow-md)'
                                                                        : 'var(--shadow-sm)',
                                                                    cursor: 'pointer',
                                                                    borderLeft: `3px solid ${getTypeColor(story.type)}`
                                                                }}
                                                            >
                                                                {/* Story Card */}
                                                                <div className="flex flex-between mb-xs">
                                                                    <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>
                                                                        {story.storyId}
                                                                    </span>
                                                                    <span title={story.type}>
                                                                        {getTypeIcon(story.type)}
                                                                    </span>
                                                                </div>
                                                                <div style={{
                                                                    fontSize: 'var(--font-size-sm)',
                                                                    marginBottom: 'var(--spacing-xs)',
                                                                    lineHeight: '1.4'
                                                                }}>
                                                                    {story.title}
                                                                </div>
                                                                <div className="flex flex-between" style={{
                                                                    fontSize: 'var(--font-size-xs)',
                                                                    color: 'var(--color-text-muted)'
                                                                }}>
                                                                    <span>
                                                                        {story.assigneeName ? `@${story.assigneeName.split(' ')[0]}` : 'Unassigned'}
                                                                    </span>
                                                                    <div className="flex flex-gap-xs">
                                                                        {story.storyPoints && (
                                                                            <span className="badge badge-neutral" style={{ fontSize: '10px' }}>
                                                                                {story.storyPoints}
                                                                            </span>
                                                                        )}
                                                                        {story.totalSubtasks > 0 && (
                                                                            <span className="badge badge-neutral" style={{ fontSize: '10px' }}>
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
                                                        padding: 'var(--spacing-lg)',
                                                        color: 'var(--color-text-muted)',
                                                        fontSize: 'var(--font-size-sm)'
                                                    }}>
                                                        No stories
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
                                    borderRadius: 'var(--border-radius)'
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
        </div>
    );
};

export default KanbanBoard;
