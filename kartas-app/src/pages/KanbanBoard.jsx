import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useParams, useOutletContext, Link } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import api from '../services/api';
import SubItemEditModal from '../components/SubItemEditModal';
import Breadcrumb from '../components/Breadcrumb';
import MarkdownRenderer from '../components/MarkdownRenderer';
import AssigneeAvatarWithHoverCard from '../components/AssigneeAvatarWithHoverCard';
import '../components/navigation.css';

const formatDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const STATUS_OPTIONS = [
    { value: 'backlog', label: 'Backlog', color: 'var(--color-neutral-400)' },
    { value: 'refining', label: 'Refining', color: 'var(--color-info)' },
    { value: 'ready', label: 'Ready', color: 'var(--color-success)' },
    { value: 'in_development', label: 'In Development', color: 'var(--color-warning)' },
    { value: 'review', label: 'Review', color: 'var(--color-secondary)' },
    { value: 'test', label: 'Test', color: 'var(--color-info)' },
    { value: 'done', label: 'Done', color: 'var(--color-success)' },
    { value: 'cancelled', label: 'Cancelled', color: 'var(--color-danger)' }
];

// Measures a fixed-position context menu after it renders and flips/clamps it
// so it never overflows the bottom or right edge of the viewport.
const useClampedMenuPosition = (x, y, visible) => {
    const ref = useRef(null);
    const [pos, setPos] = useState(null);

    useLayoutEffect(() => {
        if (!visible) {
            setPos(null);
            return;
        }
        const el = ref.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const { innerWidth, innerHeight } = window;
        const top = (y + rect.height > innerHeight) ? Math.max(y - rect.height, 0) : y;
        const left = (x + rect.width > innerWidth) ? Math.max(x - rect.width, 0) : x;
        setPos({ top, left });
    }, [x, y, visible]);

    return {
        ref,
        top: pos ? pos.top : y,
        left: pos ? pos.left : x,
        visibility: pos ? 'visible' : 'hidden'
    };
};

const KanbanBoard = () => {
    const { projectId } = useParams();
    const { projectName, defaultLandingPage } = useOutletContext();
    const [project, setProject] = useState(null);
    const [sprint, setSprint] = useState(null);
    const [columns, setColumns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedStory, setSelectedStory] = useState(null);
    const [showColumnConfig, setShowColumnConfig] = useState(false);
    const [columnConfig, setColumnConfig] = useState([]);
    const [epics, setEpics] = useState([]);
    const [filter, setFilter] = useState({ type: '', search: '' });
    const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, story: null });
    const [members, setMembers] = useState([]);
    const [showMoveSubmenu, setShowMoveSubmenu] = useState(false);
    const [selectedSubtask, setSelectedSubtask] = useState(null);
    const [viewSubtask, setViewSubtask] = useState(null);
    const [subtaskContextMenu, setSubtaskContextMenu] = useState({ visible: false, x: 0, y: 0, subtask: null });
    const [showSubtaskMoveSubmenu, setShowSubtaskMoveSubmenu] = useState(false);
    const contextMenuPos = useClampedMenuPosition(contextMenu.x, contextMenu.y, contextMenu.visible);
    const subtaskContextMenuPos = useClampedMenuPosition(subtaskContextMenu.x, subtaskContextMenu.y, subtaskContextMenu.visible);

    useEffect(() => {
        fetchProject();
        fetchKanbanBoard();
        fetchColumnConfig();
        fetchEpics();
        fetchMembers();
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

    const fetchMembers = async () => {
        try {
            const response = await api.get(`/projects/${projectId}/members`);
            setMembers(response.data);
        } catch (error) {
            console.error('Error fetching members:', error);
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

        const isSubtask = draggableId.startsWith('subtask-');
        const itemId = parseInt(draggableId.replace(isSubtask ? 'subtask-' : 'story-', ''));
        const sourceColumnId = source.droppableId;
        const destColumnId = destination.droppableId;

        // Create new columns array with updated story positions
        const newColumns = Array.from(columns);
        const sourceColumn = newColumns.find(col => col.status === sourceColumnId);
        const destColumn = newColumns.find(col => col.status === destColumnId);

        // Remove from source
        const [movedItem] = sourceColumn.stories.splice(source.index, 1);

        // Add to destination
        if (sourceColumnId === destColumnId) {
            // Same column, just reorder
            sourceColumn.stories.splice(destination.index, 0, movedItem);
        } else {
            // Different column, update status
            movedItem.status = destColumnId;
            destColumn.stories.splice(destination.index, 0, movedItem);
        }

        // Optimistically update UI
        setColumns(newColumns);

        // Update backend
        if (sourceColumnId !== destColumnId) {
            try {
                const endpoint = isSubtask
                    ? `/kanban/subtasks/${itemId}/status`
                    : `/kanban/stories/${itemId}/status`;
                await api.put(endpoint, { status: destColumnId });
            } catch (error) {
                console.error('Error updating status:', error);
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

    const getSubtaskTypeIcon = (type) => {
        const icons = { sub_task: '🔧', sub_test: '🧪' };
        return icons[type] || '📌';
    };

    const handleContextMenu = (e, story) => {
        e.preventDefault();
        setContextMenu({
            visible: true,
            x: e.clientX,
            y: e.clientY,
            story: story
        });
    };

    const closeContextMenu = () => {
        setContextMenu({ visible: false, x: 0, y: 0, story: null });
        setShowMoveSubmenu(false);
    };

    const handleSubtaskContextMenu = (e, subtask) => {
        e.preventDefault();
        setSubtaskContextMenu({ visible: true, x: e.clientX, y: e.clientY, subtask });
    };

    const closeSubtaskContextMenu = () => {
        setSubtaskContextMenu({ visible: false, x: 0, y: 0, subtask: null });
        setShowSubtaskMoveSubmenu(false);
    };

    const handleDeleteSubtask = async (id) => {
        if (!confirm('Delete this sub-item?')) return;
        try {
            await api.delete(`/sub-tasks/${id}`);
            fetchKanbanBoard();
            closeSubtaskContextMenu();
        } catch (error) {
            console.error('Error deleting sub-item:', error);
        }
    };

    const handleMoveSubtaskToStatus = async (id, newStatus) => {
        try {
            await api.put(`/kanban/subtasks/${id}/status`, { status: newStatus });
            fetchKanbanBoard();
            closeSubtaskContextMenu();
        } catch (error) {
            console.error('Error moving sub-item:', error);
        }
    };

    const handleAssignSubtask = async (id, assigneeId) => {
        try {
            await api.put(`/sub-tasks/${id}`, { assigneeId });
            fetchKanbanBoard();
            closeSubtaskContextMenu();
        } catch (error) {
            console.error('Error assigning sub-item:', error);
        }
    };

    const handleDeleteStory = async (storyId) => {
        if (!confirm('Are you sure you want to delete this story?')) return;
        try {
            await api.delete(`/stories/${storyId}`);
            fetchKanbanBoard();
            closeContextMenu();
        } catch (error) {
            console.error('Error deleting story:', error);
        }
    };

    const handleAssignStory = async (storyId, assigneeId) => {
        try {
            await api.put(`/stories/${storyId}`, { assigneeId });
            fetchKanbanBoard();
            closeContextMenu();
        } catch (error) {
            console.error('Error assigning story:', error);
        }
    };

    const handleMoveToStatus = async (storyId, newStatus) => {
        try {
            await api.put(`/kanban/stories/${storyId}/status`, { status: newStatus });
            fetchKanbanBoard();
            closeContextMenu();
        } catch (error) {
            console.error('Error moving story:', error);
        }
    };

    const handleToggleBlocked = async (storyId, currentValue) => {
        try {
            await api.put(`/stories/${storyId}`, { isBlocked: !currentValue });
            fetchKanbanBoard();
            closeContextMenu();
        } catch (error) {
            console.error('Error toggling blocked status:', error);
        }
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
            <div className="text-center">Loading kanban board...</div>
        );
    }

    if (!sprint) {
        return (
            <>
                <Breadcrumb items={[
                    { label: 'Projects', to: '/' },
                    { label: projectName, to: `/project/${projectId}/${defaultLandingPage}` },
                    { label: 'Kanban Board' },
                ]} />
                <div className="card text-center">
                    <h2>No Active Sprint</h2>
                    <p className="text-muted mt-md">Start a sprint to use the kanban board</p>
                    <Link to={`/project/${projectId}/sprints`} className="btn btn-primary mt-md">
                        Go to Sprints
                    </Link>
                </div>
            </>
        );
    }

    const elapsedPercent = sprint?.startDate && sprint?.endDate
        ? Math.min(Math.max(((new Date() - new Date(sprint.startDate)) / (new Date(sprint.endDate) - new Date(sprint.startDate))) * 100, 0), 100)
        : 0;

    const participants = Array.from(
        new Map(
            columns.flatMap(col => col.stories)
                .filter(item => item.assigneeId)
                .map(item => [item.assigneeId, item])
        ).values()
    );

    return (
        <>
            <Breadcrumb items={[
                { label: 'Projects', to: '/' },
                { label: projectName, to: `/project/${projectId}/${defaultLandingPage}` },
                { label: 'Kanban Board' },
            ]} />
            <div className="mb-md">
                <h2 style={{ margin: 0, marginBottom: 'var(--spacing-sm)' }}>{sprint?.name || 'Kanban Board'}</h2>
                {sprint?.objective && (
                    <p className="text-muted" style={{ margin: 0 }}>{sprint.objective}</p>
                )}
                {sprint?.startDate && sprint?.endDate && (
                    <p className="text-muted" style={{ margin: 0, marginTop: 'var(--spacing-xs)', fontSize: 'var(--font-size-sm)' }}>
                        {formatDate(sprint.startDate)} – {formatDate(sprint.endDate)}
                    </p>
                )}
                {sprint?.startDate && sprint?.endDate && (
                    <div style={{ marginTop: 'var(--spacing-sm)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                        <div style={{ maxWidth: '280px', flex: '0 0 auto', width: '280px' }}>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                fontSize: 'var(--font-size-xs)',
                                color: 'var(--color-neutral-600)',
                                marginBottom: '2px'
                            }}>
                                <span>Elapsed Time</span>
                                <span>{Math.round(elapsedPercent)}%</span>
                            </div>
                            <div style={{
                                width: '100%',
                                height: '4px',
                                backgroundColor: 'var(--color-neutral-100)',
                                borderRadius: '4px',
                                overflow: 'hidden'
                            }}>
                                <div style={{
                                    width: `${elapsedPercent}%`,
                                    height: '100%',
                                    backgroundColor: 'var(--color-success)',
                                    transition: 'width 0.3s ease'
                                }} />
                            </div>
                        </div>
                        {participants.length > 0 && (
                            <div style={{ display: 'flex', gap: '4px' }}>
                                {participants.map(p => (
                                    <AssigneeAvatarWithHoverCard
                                        key={p.assigneeId}
                                        assigneeId={p.assigneeId}
                                        assigneeName={p.assigneeName}
                                        assigneeRole={p.assigneeRole}
                                        assigneeEmail={p.assigneeEmail}
                                        projectId={projectId}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
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
            <div className="container-fluid" style={{ marginTop: 'var(--spacing-md)', overflowX: 'auto', padding: '0 var(--spacing-sm)' }}>
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
                                                {filteredStories.map((item, index) => {
                                                    const isSubtask = item.itemType === 'subtask';
                                                    return (
                                                    <Draggable
                                                        key={isSubtask ? `subtask-${item.id}` : `story-${item.id}`}
                                                        draggableId={isSubtask ? `subtask-${item.id}` : `story-${item.id}`}
                                                        index={index}
                                                    >
                                                        {(provided, snapshot) => (
                                                            <div
                                                                ref={provided.innerRef}
                                                                {...provided.draggableProps}
                                                                {...provided.dragHandleProps}
                                                                onClick={() => isSubtask ? setViewSubtask(item) : setSelectedStory(item)}
                                                                onContextMenu={(e) => isSubtask ? handleSubtaskContextMenu(e, item) : handleContextMenu(e, item)}
                                                                style={{
                                                                    ...provided.draggableProps.style,
                                                                    backgroundColor: 'white',
                                                                    borderRadius: 'var(--radius-sm)',
                                                                    padding: isSubtask ? '6px var(--spacing-sm)' : 'var(--spacing-sm)',
                                                                    marginLeft: isSubtask ? '16px' : 0,
                                                                    marginBottom: 'var(--spacing-sm)',
                                                                    boxShadow: snapshot.isDragging
                                                                        ? 'var(--shadow-lg)'
                                                                        : 'var(--shadow-sm)',
                                                                    cursor: 'grab',
                                                                    borderLeft: isSubtask
                                                                        ? '3px dashed var(--color-neutral-400)'
                                                                        : `4px solid ${getTypeColor(item.type)}`,
                                                                    fontSize: isSubtask ? 'var(--font-size-xs)' : undefined,
                                                                    userSelect: 'none'
                                                                }}
                                                            >
                                                                {isSubtask ? (
                                                                    <>
                                                                        <div className="flex flex-between mb-xs" style={{ alignItems: 'center' }}>
                                                                            <span className="badge badge-neutral" style={{ fontSize: '9px', padding: '1px 4px' }}>
                                                                                {item.parentStoryCode}
                                                                            </span>
                                                                            <span title={item.type}>{getSubtaskTypeIcon(item.type)}</span>
                                                                        </div>
                                                                        <div style={{ fontSize: 'var(--font-size-xs)', marginBottom: '2px', color: 'var(--color-neutral-900)' }}>
                                                                            {item.title}
                                                                        </div>
                                                                        <div className="flex flex-between" style={{ fontSize: '10px', color: 'var(--color-neutral-500)' }}>
                                                                            <AssigneeAvatarWithHoverCard
                                                                                assigneeId={item.assigneeId}
                                                                                assigneeName={item.assigneeName}
                                                                                assigneeRole={item.assigneeRole}
                                                                                assigneeEmail={item.assigneeEmail}
                                                                                projectId={projectId}
                                                                            />
                                                                            {item.storyPoints != null && (
                                                                                <span className="badge badge-neutral" style={{ fontSize: '9px', padding: '1px 4px' }}>
                                                                                    {item.storyPoints}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </>
                                                                ) : (
                                                                <>
                                                                {/* Story Card Content */}
                                                                <div className="flex flex-between mb-xs">
                                                                    <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-neutral-700)' }}>
                                                                        {item.storyId}
                                                                    </span>
                                                                    <span title={item.type}>
                                                                        {getTypeIcon(item.type)}
                                                                    </span>
                                                                </div>
                                                                <div style={{
                                                                    fontSize: 'var(--font-size-sm)',
                                                                    marginBottom: 'var(--spacing-xs)',
                                                                    lineHeight: '1.4',
                                                                    color: 'var(--color-neutral-900)'
                                                                }}>
                                                                    {item.title}
                                                                </div>
                                                                {item.epicTitle && (
                                                                    <div style={{ marginBottom: 'var(--spacing-xs)' }}>
                                                                        <Link
                                                                            to={`/project/${projectId}/backlog?epic=${item.epicId}`}
                                                                            onClick={(e) => e.stopPropagation()}
                                                                            style={{ textDecoration: 'none' }}
                                                                        >
                                                                            <span style={{
                                                                                padding: '2px 6px',
                                                                                fontSize: '10px',
                                                                                backgroundColor: epics.find(e => e.id === item.epicId)?.color || '#0052CC',
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
                                                                                {item.epicTitle}
                                                                            </span>
                                                                        </Link>
                                                                    </div>
                                                                )}
                                                                <div className="flex flex-between" style={{
                                                                    fontSize: 'var(--font-size-xs)',
                                                                    color: 'var(--color-neutral-500)'
                                                                }}>
                                                                    <AssigneeAvatarWithHoverCard
                                                                        assigneeId={item.assigneeId}
                                                                        assigneeName={item.assigneeName}
                                                                        assigneeRole={item.assigneeRole}
                                                                        assigneeEmail={item.assigneeEmail}
                                                                        projectId={projectId}
                                                                    />
                                                                    <div className="flex flex-gap-xs">
                                                                        {item.isBlocked && (
                                                                            <span className="badge badge-danger" style={{ fontSize: '10px', padding: '2px 6px' }}>
                                                                                🚫 Blocked
                                                                            </span>
                                                                        )}
                                                                        {item.storyPoints && (
                                                                            <span className="badge badge-neutral" style={{ fontSize: '10px', padding: '2px 6px' }}>
                                                                                {item.storyPoints}
                                                                            </span>
                                                                        )}
                                                                        {item.totalSubtasks > 0 && (
                                                                            <span className="badge badge-neutral" style={{ fontSize: '10px', padding: '2px 6px' }}>
                                                                                ✓ {item.completedSubtasks}/{item.totalSubtasks}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                </>
                                                                )}
                                                            </div>
                                                        )}
                                                    </Draggable>
                                                    );
                                                })}
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
                    <div className="card" style={{ maxWidth: '850px', width: '100%', margin: 'var(--spacing-md)', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
                        onClick={(e) => e.stopPropagation()}>
                        <div className="card-header" style={{ flexShrink: 0 }}>
                            <div className="flex flex-between" style={{ alignItems: 'center' }}>
                                <h3 className="card-title">{selectedStory.storyId}</h3>
                                <span>{getTypeIcon(selectedStory.type)} {selectedStory.type}</span>
                            </div>
                        </div>

                        <div style={{ flexShrink: 0 }}>
                            <h4>{selectedStory.title}</h4>

                            <div className="mt-md" style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
                                gap: 'var(--spacing-md)'
                            }}>
                                <div>
                                    <strong>Status:</strong>
                                    <p className="mt-xs">
                                        {(() => {
                                            const statusOption = STATUS_OPTIONS.find(s => s.value === selectedStory.status);
                                            return (
                                                <span className="badge" style={{ backgroundColor: statusOption?.color || 'var(--color-neutral-400)', color: 'white' }}>
                                                    {statusOption?.label || selectedStory.status}
                                                </span>
                                            );
                                        })()}
                                    </p>
                                </div>
                                <div>
                                    <strong>Blocked:</strong>
                                    <p className="mt-xs">
                                        {selectedStory.isBlocked ? (
                                            <span className="badge badge-danger" style={{ fontSize: '10px', padding: '2px 6px' }}>🚫 Blocked</span>
                                        ) : 'No'}
                                    </p>
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
                        </div>

                        {selectedStory.description && (
                            <div className="mt-md" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                                <strong style={{ flexShrink: 0 }}>Description:</strong>
                                <div className="mt-sm" style={{
                                    flex: 1,
                                    minHeight: 0,
                                    overflowY: 'auto',
                                    border: '1px solid var(--color-border)',
                                    borderRadius: 'var(--radius-md)',
                                    padding: 'var(--spacing-md)'
                                }}>
                                    <MarkdownRenderer content={selectedStory.description} />
                                </div>
                            </div>
                        )}

                        <div className="mt-lg flex flex-gap-sm" style={{ justifyContent: 'flex-end', flexShrink: 0 }}>
                            <Link
                                to={`/project/${projectId}/story/${selectedStory.id}`}
                                className="btn btn-primary"
                                style={{ textDecoration: 'none' }}
                            >
                                Edit Story
                            </Link>
                            <button
                                onClick={() => setSelectedStory(null)}
                                className="btn btn-secondary"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Sub-item View Modal (read-only) */}
            {viewSubtask && (
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
                }} onClick={() => setViewSubtask(null)}>
                    <div className="card" style={{ maxWidth: '850px', width: '100%', margin: 'var(--spacing-md)', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
                        onClick={(e) => e.stopPropagation()}>
                        <div className="card-header" style={{ flexShrink: 0 }}>
                            <div className="flex flex-between" style={{ alignItems: 'center' }}>
                                <h3 className="card-title">{viewSubtask.parentStoryCode}</h3>
                                <span>{getSubtaskTypeIcon(viewSubtask.type)} {viewSubtask.type}</span>
                            </div>
                        </div>

                        <div style={{ flexShrink: 0 }}>
                            <h4>{viewSubtask.title}</h4>

                            <div className="mt-md" style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
                                gap: 'var(--spacing-md)'
                            }}>
                                <div>
                                    <strong>Status:</strong>
                                    <p className="mt-xs">
                                        {(() => {
                                            const statusOption = STATUS_OPTIONS.find(s => s.value === viewSubtask.status);
                                            return (
                                                <span className="badge" style={{ backgroundColor: statusOption?.color || 'var(--color-neutral-400)', color: 'white' }}>
                                                    {statusOption?.label || viewSubtask.status}
                                                </span>
                                            );
                                        })()}
                                    </p>
                                </div>
                                <div>
                                    <strong>Story Points:</strong>
                                    <p className="mt-xs">{viewSubtask.storyPoints || 'Not set'}</p>
                                </div>
                                <div>
                                    <strong>Assignee:</strong>
                                    <p className="mt-xs">{viewSubtask.assigneeName || 'Unassigned'}</p>
                                </div>
                            </div>
                        </div>

                        {viewSubtask.description && (
                            <div className="mt-md" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                                <strong style={{ flexShrink: 0 }}>Description:</strong>
                                <div className="mt-sm" style={{
                                    flex: 1,
                                    minHeight: 0,
                                    overflowY: 'auto',
                                    border: '1px solid var(--color-border)',
                                    borderRadius: 'var(--radius-md)',
                                    padding: 'var(--spacing-md)'
                                }}>
                                    <MarkdownRenderer content={viewSubtask.description} />
                                </div>
                            </div>
                        )}

                        <div className="mt-lg flex flex-gap-sm" style={{ justifyContent: 'flex-end', flexShrink: 0 }}>
                            <Link
                                to={`/project/${projectId}/story/${viewSubtask.parentStoryId}?editSubItem=${viewSubtask.id}`}
                                className="btn btn-primary"
                                style={{ textDecoration: 'none' }}
                            >
                                Edit Sub-task
                            </Link>
                            <button
                                onClick={() => setViewSubtask(null)}
                                className="btn btn-secondary"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Sub-item Edit Modal */}
            {selectedSubtask && (
                <SubItemEditModal
                    mode="edit"
                    subItem={selectedSubtask}
                    members={members}
                    onClose={() => setSelectedSubtask(null)}
                    onSaved={fetchKanbanBoard}
                />
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

            {/* Context Menu */}
            {contextMenu.visible && (
                <>
                    {/* Backdrop to close menu */}
                    <div
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            zIndex: 999
                        }}
                        onClick={closeContextMenu}
                        onContextMenu={(e) => { e.preventDefault(); closeContextMenu(); }}
                    />
                    {/* Context Menu */}
                    <div
                        ref={contextMenuPos.ref}
                        style={{
                            position: 'fixed',
                            top: `${contextMenuPos.top}px`,
                            left: `${contextMenuPos.left}px`,
                            visibility: contextMenuPos.visibility,
                            backgroundColor: 'white',
                            borderRadius: 'var(--radius-md)',
                            boxShadow: 'var(--shadow-lg)',
                            padding: 'var(--spacing-xs)',
                            minWidth: '200px',
                            zIndex: 1000
                        }}
                    >
                        {/* View Story */}
                        <div
                            onClick={() => {
                                setSelectedStory(contextMenu.story);
                                closeContextMenu();
                            }}
                            style={{
                                padding: 'var(--spacing-sm)',
                                cursor: 'pointer',
                                borderRadius: 'var(--radius-sm)',
                                transition: 'background-color 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-neutral-50)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                            👁️ View Story
                        </div>

                        {/* Edit Story */}
                        <Link
                            to={`/project/${projectId}/story/${contextMenu.story?.id}`}
                            style={{ textDecoration: 'none', color: 'inherit' }}
                            onClick={closeContextMenu}
                        >
                            <div
                                style={{
                                    padding: 'var(--spacing-sm)',
                                    cursor: 'pointer',
                                    borderRadius: 'var(--radius-sm)',
                                    transition: 'background-color 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-neutral-50)'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                ✏️ Edit Story
                            </div>
                        </Link>

                        {/* Toggle Blocked */}
                        <div
                            onClick={() => handleToggleBlocked(contextMenu.story.id, contextMenu.story.isBlocked)}
                            style={{
                                padding: 'var(--spacing-sm)',
                                cursor: 'pointer',
                                borderRadius: 'var(--radius-sm)',
                                transition: 'background-color 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-neutral-50)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                            {contextMenu.story?.isBlocked ? '✅ Unblock' : '🚫 Mark as Blocked'}
                        </div>

                        <div style={{ height: '1px', backgroundColor: 'var(--color-border)', margin: 'var(--spacing-xs) 0' }} />

                        {/* Assign To */}
                        <div style={{ padding: 'var(--spacing-xs)' }}>
                            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-neutral-600)', padding: 'var(--spacing-xs)', fontWeight: 600 }}>
                                Assign To
                            </div>
                            {contextMenu.story?.assigneeId && (
                                <div
                                    onClick={() => handleAssignStory(contextMenu.story.id, null)}
                                    style={{
                                        padding: 'var(--spacing-sm)',
                                        cursor: 'pointer',
                                        borderRadius: 'var(--radius-sm)',
                                        transition: 'background-color 0.2s',
                                        fontSize: 'var(--font-size-sm)',
                                        color: 'var(--color-danger)'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-neutral-50)'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                    🚫 Remove Assignee
                                </div>
                            )}
                            {members.map(member => (
                                <div
                                    key={member.id}
                                    onClick={() => handleAssignStory(contextMenu.story.id, member.id)}
                                    style={{
                                        padding: 'var(--spacing-sm)',
                                        cursor: 'pointer',
                                        borderRadius: 'var(--radius-sm)',
                                        transition: 'background-color 0.2s',
                                        fontSize: 'var(--font-size-sm)'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-neutral-50)'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                    👤 {member.firstName} {member.lastName}
                                </div>
                            ))}
                        </div>

                        <div style={{ height: '1px', backgroundColor: 'var(--color-border)', margin: 'var(--spacing-xs) 0' }} />

                        {/* Move To - Expandable Submenu */}
                        <div
                            style={{ position: 'relative' }}
                            onMouseEnter={() => setShowMoveSubmenu(true)}
                            onMouseLeave={() => setShowMoveSubmenu(false)}
                        >
                            <div
                                style={{
                                    padding: 'var(--spacing-sm)',
                                    cursor: 'pointer',
                                    borderRadius: 'var(--radius-sm)',
                                    transition: 'background-color 0.2s',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-neutral-50)'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                <span>➡️ Move To</span>
                                <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                                    <path d="M7.5 15L12.5 10L7.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>

                            {/* Submenu */}
                            {showMoveSubmenu && (
                                <div
                                    style={{
                                        position: 'absolute',
                                        left: 'calc(100% - 4px)',
                                        top: '-4px',
                                        backgroundColor: 'white',
                                        borderRadius: 'var(--radius-md)',
                                        boxShadow: 'var(--shadow-lg)',
                                        padding: 'var(--spacing-xs)',
                                        minWidth: '180px',
                                        marginLeft: 'var(--spacing-xs)',
                                        paddingLeft: '8px'
                                    }}
                                >
                                    {columns.filter(col => col.status !== contextMenu.story?.status).map(column => (
                                        <div
                                            key={column.status}
                                            onClick={() => handleMoveToStatus(contextMenu.story.id, column.status)}
                                            style={{
                                                padding: 'var(--spacing-sm)',
                                                cursor: 'pointer',
                                                borderRadius: 'var(--radius-sm)',
                                                transition: 'background-color 0.2s',
                                                fontSize: 'var(--font-size-sm)'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-neutral-50)'}
                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                        >
                                            {column.displayName}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div style={{ height: '1px', backgroundColor: 'var(--color-border)', margin: 'var(--spacing-xs) 0' }} />

                        {/* Delete */}
                        <div
                            onClick={() => handleDeleteStory(contextMenu.story.id)}
                            style={{
                                padding: 'var(--spacing-sm)',
                                cursor: 'pointer',
                                borderRadius: 'var(--radius-sm)',
                                transition: 'background-color 0.2s',
                                color: 'var(--color-danger)'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-danger-light)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                            🗑️ Delete Story
                        </div>
                    </div>
                </>
            )}

            {/* Sub-task Context Menu */}
            {subtaskContextMenu.visible && (
                <>
                    <div
                        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }}
                        onClick={closeSubtaskContextMenu}
                        onContextMenu={(e) => { e.preventDefault(); closeSubtaskContextMenu(); }}
                    />
                    <div
                        ref={subtaskContextMenuPos.ref}
                        style={{
                            position: 'fixed',
                            top: `${subtaskContextMenuPos.top}px`,
                            left: `${subtaskContextMenuPos.left}px`,
                            visibility: subtaskContextMenuPos.visibility,
                            backgroundColor: 'white',
                            borderRadius: 'var(--radius-md)',
                            boxShadow: 'var(--shadow-lg)',
                            padding: 'var(--spacing-xs)',
                            minWidth: '200px',
                            zIndex: 1000
                        }}
                    >
                        {/* View Sub-Item */}
                        <div
                            onClick={() => {
                                setViewSubtask(subtaskContextMenu.subtask);
                                closeSubtaskContextMenu();
                            }}
                            style={{
                                padding: 'var(--spacing-sm)',
                                cursor: 'pointer',
                                borderRadius: 'var(--radius-sm)',
                                transition: 'background-color 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-neutral-50)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                            👁️ View Sub-Item
                        </div>

                        {/* Edit Sub-Item */}
                        <div
                            onClick={() => {
                                setSelectedSubtask(subtaskContextMenu.subtask);
                                closeSubtaskContextMenu();
                            }}
                            style={{
                                padding: 'var(--spacing-sm)',
                                cursor: 'pointer',
                                borderRadius: 'var(--radius-sm)',
                                transition: 'background-color 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-neutral-50)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                            ✏️ Edit Sub-Item
                        </div>

                        {/* View Parent Story */}
                        <Link
                            to={`/project/${projectId}/story/${subtaskContextMenu.subtask?.parentStoryId}`}
                            style={{ textDecoration: 'none', color: 'inherit' }}
                            onClick={closeSubtaskContextMenu}
                        >
                            <div
                                style={{
                                    padding: 'var(--spacing-sm)',
                                    cursor: 'pointer',
                                    borderRadius: 'var(--radius-sm)',
                                    transition: 'background-color 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-neutral-50)'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                📖 View Parent Story
                            </div>
                        </Link>

                        <div style={{ height: '1px', backgroundColor: 'var(--color-border)', margin: 'var(--spacing-xs) 0' }} />

                        {/* Assign To */}
                        <div style={{ padding: 'var(--spacing-xs)' }}>
                            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-neutral-600)', padding: 'var(--spacing-xs)', fontWeight: 600 }}>
                                Assign To
                            </div>
                            {subtaskContextMenu.subtask?.assigneeId && (
                                <div
                                    onClick={() => handleAssignSubtask(subtaskContextMenu.subtask.id, null)}
                                    style={{
                                        padding: 'var(--spacing-sm)',
                                        cursor: 'pointer',
                                        borderRadius: 'var(--radius-sm)',
                                        transition: 'background-color 0.2s',
                                        fontSize: 'var(--font-size-sm)',
                                        color: 'var(--color-danger)'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-neutral-50)'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                    🚫 Remove Assignee
                                </div>
                            )}
                            {members.map(member => (
                                <div
                                    key={member.id}
                                    onClick={() => handleAssignSubtask(subtaskContextMenu.subtask.id, member.id)}
                                    style={{
                                        padding: 'var(--spacing-sm)',
                                        cursor: 'pointer',
                                        borderRadius: 'var(--radius-sm)',
                                        transition: 'background-color 0.2s',
                                        fontSize: 'var(--font-size-sm)'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-neutral-50)'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                    👤 {member.firstName} {member.lastName}
                                </div>
                            ))}
                        </div>

                        <div style={{ height: '1px', backgroundColor: 'var(--color-border)', margin: 'var(--spacing-xs) 0' }} />

                        {/* Move To - Expandable Submenu */}
                        <div
                            style={{ position: 'relative' }}
                            onMouseEnter={() => setShowSubtaskMoveSubmenu(true)}
                            onMouseLeave={() => setShowSubtaskMoveSubmenu(false)}
                        >
                            <div
                                style={{
                                    padding: 'var(--spacing-sm)',
                                    cursor: 'pointer',
                                    borderRadius: 'var(--radius-sm)',
                                    transition: 'background-color 0.2s',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-neutral-50)'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                <span>➡️ Move To</span>
                                <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                                    <path d="M7.5 15L12.5 10L7.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>

                            {showSubtaskMoveSubmenu && (
                                <div
                                    style={{
                                        position: 'absolute',
                                        left: 'calc(100% - 4px)',
                                        top: '-4px',
                                        backgroundColor: 'white',
                                        borderRadius: 'var(--radius-md)',
                                        boxShadow: 'var(--shadow-lg)',
                                        padding: 'var(--spacing-xs)',
                                        minWidth: '180px',
                                        marginLeft: 'var(--spacing-xs)',
                                        paddingLeft: '8px'
                                    }}
                                >
                                    {columns.filter(col => col.status !== subtaskContextMenu.subtask?.status).map(column => (
                                        <div
                                            key={column.status}
                                            onClick={() => handleMoveSubtaskToStatus(subtaskContextMenu.subtask.id, column.status)}
                                            style={{
                                                padding: 'var(--spacing-sm)',
                                                cursor: 'pointer',
                                                borderRadius: 'var(--radius-sm)',
                                                transition: 'background-color 0.2s',
                                                fontSize: 'var(--font-size-sm)'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-neutral-50)'}
                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                        >
                                            {column.displayName}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div style={{ height: '1px', backgroundColor: 'var(--color-border)', margin: 'var(--spacing-xs) 0' }} />

                        {/* Delete */}
                        <div
                            onClick={() => handleDeleteSubtask(subtaskContextMenu.subtask.id)}
                            style={{
                                padding: 'var(--spacing-sm)',
                                cursor: 'pointer',
                                borderRadius: 'var(--radius-sm)',
                                transition: 'background-color 0.2s',
                                color: 'var(--color-danger)'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-danger-light)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                            🗑️ Delete Sub-Item
                        </div>
                    </div>
                </>
            )}
        </>
    );
};

export default KanbanBoard;
