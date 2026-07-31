import React, { useState, useEffect, useRef } from 'react';
import { useParams, useOutletContext, Link, useSearchParams, useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import api from '../services/api';
import Breadcrumb from '../components/Breadcrumb';
import CloneStoryModal from '../components/CloneStoryModal';
import ColorDropdown from '../components/ColorDropdown';
import MarkdownEditor from '../components/MarkdownEditor';
import MarkdownRenderer from '../components/MarkdownRenderer';
import AssigneeAvatarWithHoverCard from '../components/AssigneeAvatarWithHoverCard';
import '../components/navigation.css';


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

const TYPE_OPTIONS = [
    { value: 'story', label: 'Story', icon: '📖' },
    { value: 'task', label: 'Task', icon: '✓' },
    { value: 'bug', label: 'Bug', icon: '🐛' }
];

// SPR-02: extracted so the same row-rendering logic can be reused for both
// the general backlog table and every active/planned sprint's own block,
// without duplicating ~140 lines of JSX per table. SPR-04: droppableId turns
// each instance into its own @hello-pangea/dnd drop target, with rows as
// drag sources.
const StoryTable = ({
    droppableId,
    stories,
    epics,
    selectedStories,
    onToggleStory,
    onToggleAllInTable,
    onUpdateStoryStatus,
    onFilterByEpic,
    onOpenDetails,
    getStatusBadgeClass,
    projectId,
    navigate
}) => {
    // SPR-04: a dragged <tr>'s column widths can visually collapse mid-drag,
    // since the table's auto layout recomputes as other rows in the list
    // reflow. Capture each row's rendered cell widths while at rest, then
    // reapply them directly (imperative DOM, not React state, to avoid a
    // re-render on every drag frame) while that row is being dragged.
    const cellWidthsRef = useRef({});

    const rowRef = (story) => (el) => {
        if (!el) return;
        cellWidthsRef.current[story.id] = Array.from(el.children).map(td => td.getBoundingClientRect().width);
    };

    return (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
                <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                    <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left', width: '40px' }}>
                        <input
                            type="checkbox"
                            checked={stories.length > 0 && stories.every(s => selectedStories.includes(s.id))}
                            onChange={() => onToggleAllInTable(stories)}
                        />
                    </th>
                    <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left' }}>Type</th>
                    <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left' }}>ID</th>
                    <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left' }}>Title</th>
                    <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left' }}>Epic</th>
                    <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left' }}>Status</th>
                    <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left' }}>Points</th>
                    <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left' }}>Assignee</th>
                </tr>
            </thead>
            <Droppable droppableId={droppableId}>
                {(droppableProvided) => (
                    <tbody ref={droppableProvided.innerRef} {...droppableProvided.droppableProps}>
                        {stories.map((story, index) => (
                            <Draggable key={story.id} draggableId={`story-${story.id}`} index={index}>
                                {(draggableProvided, snapshot) => (
                                    <tr
                                        ref={(el) => {
                                            draggableProvided.innerRef(el);
                                            if (el && snapshot.isDragging) {
                                                const widths = cellWidthsRef.current[story.id];
                                                if (widths) {
                                                    Array.from(el.children).forEach((td, i) => {
                                                        td.style.width = `${widths[i]}px`;
                                                    });
                                                }
                                            } else {
                                                rowRef(story)(el);
                                            }
                                        }}
                                        {...draggableProvided.draggableProps}
                                        {...draggableProvided.dragHandleProps}
                                        style={{
                                            ...draggableProvided.draggableProps.style,
                                            display: snapshot.isDragging ? 'table' : undefined,
                                            borderBottom: '1px solid var(--color-border)',
                                            backgroundColor: selectedStories.includes(story.id) ? 'var(--color-neutral-100)' : 'var(--color-surface)',
                                            boxShadow: snapshot.isDragging ? 'var(--shadow-lg)' : undefined
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!selectedStories.includes(story.id)) {
                                                e.currentTarget.style.backgroundColor = 'var(--color-neutral-50)';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!selectedStories.includes(story.id)) {
                                                e.currentTarget.style.backgroundColor = 'var(--color-surface)';
                                            }
                                        }}
                                    >
                                        <td style={{ padding: 'var(--spacing-sm)' }}>
                                            <input
                                                type="checkbox"
                                                checked={selectedStories.includes(story.id)}
                                                onChange={() => onToggleStory(story.id)}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        </td>
                                        <td
                                            style={{ padding: 'var(--spacing-sm)', cursor: 'help', position: 'relative' }}
                                            className="story-type-cell"
                                            data-tooltip={TYPE_OPTIONS.find(t => t.value === story.type)?.label || story.type}
                                        >
                                            {TYPE_OPTIONS.find(t => t.value === story.type)?.icon || story.type}
                                        </td>
                                        <td
                                            style={{ padding: 'var(--spacing-sm)', cursor: 'pointer' }}
                                            onClick={() => navigate(`/project/${projectId}/story/${story.id}`)}
                                        >
                                            <strong>{story.storyId}</strong>
                                        </td>
                                        <td
                                            style={{ padding: 'var(--spacing-sm)', cursor: 'pointer' }}
                                            onClick={() => navigate(`/project/${projectId}/story/${story.id}`)}
                                        >
                                            {story.title}
                                            {story.isBlocked && (
                                                <span className="badge badge-danger" style={{ marginLeft: '6px', fontSize: '10px', padding: '2px 6px' }}>
                                                    🚫 Blocked
                                                </span>
                                            )}
                                        </td>
                                        <td style={{ padding: 'var(--spacing-sm)' }}>
                                            {story.epicTitle && (
                                                <span
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onFilterByEpic(story.epicId.toString());
                                                    }}
                                                    style={{
                                                        padding: '2px 8px',
                                                        fontSize: 'var(--font-size-sm)',
                                                        backgroundColor: epics.find(e => e.id === story.epicId)?.color || '#0052CC',
                                                        color: 'white',
                                                        borderRadius: 'var(--radius-sm)',
                                                        fontWeight: '500',
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
                                            )}
                                        </td>
                                        <td style={{ padding: 'var(--spacing-sm)' }}>
                                            <select
                                                value={story.status}
                                                onChange={(e) => {
                                                    e.stopPropagation();
                                                    onUpdateStoryStatus(story.id, e.target.value);
                                                }}
                                                className="form-select"
                                                style={{
                                                    padding: '4px 8px',
                                                    fontSize: 'var(--font-size-sm)',
                                                    borderColor: getStatusBadgeClass(story.status)
                                                }}
                                            >
                                                {STATUS_OPTIONS.map(option => (
                                                    <option key={option.value} value={option.value}>
                                                        {option.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </td>
                                        <td
                                            style={{ padding: 'var(--spacing-sm)', cursor: 'pointer' }}
                                            onClick={() => onOpenDetails(story)}
                                        >
                                            {story.storyPoints || '-'}
                                        </td>
                                        <td
                                            style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-sm)', cursor: 'pointer' }}
                                            onClick={() => onOpenDetails(story)}
                                        >
                                            <span onClick={(e) => e.stopPropagation()} style={{ display: 'inline-flex' }}>
                                                <AssigneeAvatarWithHoverCard
                                                    assigneeId={story.assigneeId}
                                                    assigneeName={story.assigneeName}
                                                    assigneeRole={story.assigneeRole}
                                                    assigneeEmail={story.assigneeEmail}
                                                    projectId={projectId}
                                                />
                                            </span>
                                        </td>
                                    </tr>
                                )}
                            </Draggable>
                        ))}
                        {droppableProvided.placeholder}
                    </tbody>
                )}
            </Droppable>
        </table>
    );
};

const Backlog = () => {
    const { projectId } = useParams();
    const { projectName, defaultLandingPage } = useOutletContext();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const sprintIdFromUrl = searchParams.get('sprint');
    const epicIdFromUrl = searchParams.get('epic');

    const [project, setProject] = useState(null);
    const [stories, setStories] = useState([]);
    const [allSprints, setAllSprints] = useState([]);
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createStorySprintId, setCreateStorySprintId] = useState(null);
    const [selectedStory, setSelectedStory] = useState(null);
    const [showCloneModal, setShowCloneModal] = useState(false);
    const [selectedStories, setSelectedStories] = useState([]);
    const [selectedSprint, setSelectedSprint] = useState('');
    const [selectedAssignee, setSelectedAssignee] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('');
    const [selectedEpic, setSelectedEpic] = useState('');
    const [filterAssignee, setFilterAssignee] = useState('');
    const [filterType, setFilterType] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterEpic, setFilterEpic] = useState('');
    const [filterSprint, setFilterSprint] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [showCompleted, setShowCompleted] = useState(false);
    const [addingToSprint, setAddingToSprint] = useState(false);
    const [epics, setEpics] = useState([]);
    const [newStory, setNewStory] = useState({
        title: '',
        description: '',
        type: 'story',
        storyPoints: '',
        projectId: parseInt(projectId)
    });
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        fetchProject();
        fetchStories();
        fetchSprints();
        fetchMembers();
        fetchEpics();
    }, [projectId]);

    useEffect(() => {
        if (sprintIdFromUrl) {
            setSelectedSprint(sprintIdFromUrl);
        }
    }, [sprintIdFromUrl]);

    useEffect(() => {
        if (epicIdFromUrl) {
            setFilterEpic(epicIdFromUrl);
        }
    }, [epicIdFromUrl]);

    const fetchProject = async () => {
        try {
            const response = await api.get(`/projects/${projectId}`);
            setProject(response.data);
        } catch (error) {
            console.error('Error fetching project:', error);
        }
    };

    const fetchStories = async () => {
        try {
            const response = await api.get(`/stories/project/${projectId}`);
            setStories(response.data);
        } catch (error) {
            console.error('Error fetching stories:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchSprints = async () => {
        try {
            const response = await api.get(`/sprints/project/${projectId}`);
            setAllSprints(response.data);
        } catch (error) {
            console.error('Error fetching sprints:', error);
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

    const fetchEpics = async () => {
        try {
            const response = await api.get(`/project/${projectId}/epics`);
            setEpics(response.data);
        } catch (error) {
            console.error('Error fetching epics:', error);
        }
    };

    const handleCreateStory = async (e) => {
        e.preventDefault();
        setError('');

        try {
            const response = await api.post('/stories', {
                ...newStory,
                storyPoints: newStory.storyPoints ? parseInt(newStory.storyPoints) : null,
                ...(createStorySprintId ? { sprintId: createStorySprintId } : {})
            });
            // SPR-03: createStory's response has no `sprints` array (unlike
            // getProjectStories'), so a created-into-sprint story would
            // incorrectly render in the general table until reload if just
            // spliced in locally — refetch instead for that path only.
            if (createStorySprintId) {
                fetchStories();
            } else {
                setStories([response.data, ...stories]);
            }
            setShowCreateModal(false);
            setCreateStorySprintId(null);
            setNewStory({
                title: '',
                description: '',
                type: 'story',
                storyPoints: '',
                projectId: parseInt(projectId)
            });
        } catch (error) {
            setError(error.response?.data?.error || 'Failed to create story');
        }
    };

    const handleUpdateStoryStatus = async (storyId, newStatus) => {
        try {
            await api.put(`/stories/${storyId}`, { status: newStatus });
            setStories(stories.map(story =>
                story.id === storyId ? { ...story, status: newStatus } : story
            ));
        } catch (error) {
            console.error('Error updating story:', error);
        }
    };

    const handleToggleStory = (storyId) => {
        setSelectedStories(prev =>
            prev.includes(storyId)
                ? prev.filter(id => id !== storyId)
                : [...prev, storyId]
        );
    };

    // SPR-02: table-scoped — each StoryTable's own "select all" only ever
    // toggles its own visible rows, not every story on the whole page.
    const handleToggleAllInTable = (tableStories) => {
        const ids = tableStories.map(s => s.id);
        const allSelected = ids.length > 0 && ids.every(id => selectedStories.includes(id));
        setSelectedStories(prev =>
            allSelected ? prev.filter(id => !ids.includes(id)) : [...new Set([...prev, ...ids])]
        );
    };

    const handleAddToSprint = async () => {
        if (!selectedSprint || selectedStories.length === 0) return;

        setAddingToSprint(true);
        setError('');
        setSuccessMessage('');

        try {
            await api.post(`/sprints/${selectedSprint}/stories`, {
                storyIds: selectedStories
            });
            setSuccessMessage(`Successfully added ${selectedStories.length} ${selectedStories.length === 1 ? 'story' : 'stories'} to sprint`);
            setSelectedStories([]);
            fetchStories();
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (error) {
            setError(error.response?.data?.error || 'Failed to add stories to sprint');
        } finally {
            setAddingToSprint(false);
        }
    };

    const handleBulkAssign = async () => {
        if (!selectedAssignee || selectedStories.length === 0) return;

        setError('');
        setSuccessMessage('');

        try {
            await Promise.all(
                selectedStories.map(storyId =>
                    api.put(`/stories/${storyId}`, {
                        assigneeId: selectedAssignee === 'unassigned' ? null : parseInt(selectedAssignee)
                    })
                )
            );
            setSuccessMessage(`Successfully assigned ${selectedStories.length} ${selectedStories.length === 1 ? 'story' : 'stories'}`);
            setSelectedStories([]);
            setSelectedAssignee('');
            fetchStories();
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (error) {
            setError(error.response?.data?.error || 'Failed to assign stories');
        }
    };

    const handleBulkStatusChange = async () => {
        if (!selectedStatus || selectedStories.length === 0) return;

        setError('');
        setSuccessMessage('');

        try {
            await Promise.all(
                selectedStories.map(storyId =>
                    api.put(`/stories/${storyId}`, { status: selectedStatus })
                )
            );
            setSuccessMessage(`Successfully updated status for ${selectedStories.length} ${selectedStories.length === 1 ? 'story' : 'stories'}`);
            setSelectedStories([]);
            setSelectedStatus('');
            fetchStories();
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (error) {
            setError(error.response?.data?.error || 'Failed to update status');
        }
    };

    const handleBulkEpicAssign = async () => {
        if (!selectedEpic || selectedStories.length === 0) return;

        setError('');
        setSuccessMessage('');

        try {
            await Promise.all(
                selectedStories.map(storyId =>
                    api.put(`/stories/${storyId}`, {
                        epicId: selectedEpic === 'none' ? null : parseInt(selectedEpic)
                    })
                )
            );
            setSuccessMessage(`Successfully assigned ${selectedStories.length} ${selectedStories.length === 1 ? 'story' : 'stories'} to epic`);
            setSelectedStories([]);
            setSelectedEpic('');
            fetchStories();
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (error) {
            setError(error.response?.data?.error || 'Failed to assign to epic');
        }
    };

    const handleBulkDelete = async () => {
        if (selectedStories.length === 0) return;

        if (!window.confirm(`Are you sure you want to delete ${selectedStories.length} ${selectedStories.length === 1 ? 'story' : 'stories'}? This action cannot be undone.`)) {
            return;
        }

        setError('');
        setSuccessMessage('');

        try {
            await Promise.all(
                selectedStories.map(storyId => api.delete(`/stories/${storyId}`))
            );
            setSuccessMessage(`Successfully deleted ${selectedStories.length} ${selectedStories.length === 1 ? 'story' : 'stories'}`);
            setSelectedStories([]);
            fetchStories();
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (error) {
            setError(error.response?.data?.error || 'Failed to delete stories');
        }
    };

    const getStatusBadgeClass = (status) => {
        const statusOption = STATUS_OPTIONS.find(opt => opt.value === status);
        return statusOption ? statusOption.color : 'var(--color-neutral-400)';
    };

    const getTypeIcon = (type) => {
        const typeOption = TYPE_OPTIONS.find(opt => opt.value === type);
        return typeOption ? typeOption.icon : '📄';
    };

    // Enhanced filtering with multiple criteria
    const filteredStories = stories.filter(story => {
        // Hide completed/cancelled stories unless "Show completed stories" is checked
        if (!showCompleted && (story.status === 'done' || story.status === 'cancelled')) return false;

        // Search query (title or ID)
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const matchesTitle = story.title.toLowerCase().includes(query);
            const matchesId = story.storyId.toLowerCase().includes(query);
            if (!matchesTitle && !matchesId) return false;
        }

        // Assignee filter
        if (filterAssignee) {
            if (filterAssignee === 'unassigned' && story.assigneeId) return false;
            if (filterAssignee !== 'unassigned' && story.assigneeId !== parseInt(filterAssignee)) return false;
        }

        // Type filter
        if (filterType && story.type !== filterType) return false;

        // Status filter
        if (filterStatus && story.status !== filterStatus) return false;

        // Epic filter
        if (filterEpic) {
            if (filterEpic === 'none' && story.epicId) return false;
            if (filterEpic !== 'none' && story.epicId !== parseInt(filterEpic)) return false;
        }

        // Sprint filter — only "No Sprint" or a completed sprint are meaningful
        // here now (SPR-02): a story in an active/planned sprint never appears
        // in the general table at all, so filtering by one of those would
        // always return empty.
        if (filterSprint) {
            if (filterSprint === 'none' && story.sprints && story.sprints.length > 0) return false;
            if (filterSprint !== 'none' && (!story.sprints || !story.sprints.find(s => s.id === parseInt(filterSprint)))) return false;
        }

        return true;
    });

    // SPR-02: active/planned sprints (blocks) and completed sprints (still
    // meaningful for the filter dropdown) derived from the single fetch.
    const activeOrPlannedSprints = allSprints.filter(s => s.status !== 'completed');
    const completedSprints = allSprints.filter(s => s.status === 'completed');

    const storiesForSprint = (sprintId) =>
        filteredStories.filter(story => story.sprints?.some(s => s.id === sprintId));

    // The general table excludes anything currently in an active/planned
    // sprint — those stories live exclusively in their sprint's block now.
    // A story with only completed-sprint history, or none at all, is
    // unaffected and still shows here.
    const generalStories = filteredStories.filter(story =>
        !story.sprints?.some(s => s.status === 'active' || s.status === 'planned')
    );

    // SPR-04: drag a row between the Backlog table ("backlog") and a sprint
    // block ("sprint-<id>") to add/remove its sprint association.
    const handleDragEnd = async (result) => {
        const { source, destination, draggableId } = result;
        if (!destination) return;
        if (source.droppableId === destination.droppableId) return; // no persisted row order — same-block drops are a no-op

        const storyId = parseInt(draggableId.replace('story-', ''));
        const sourceId = source.droppableId;
        const destId = destination.droppableId;

        // Explicitly unsupported: dragging directly between two different
        // sprint blocks. SPR-01's backend constraint would reject it anyway
        // (the story is still in its source sprint at the moment of the
        // drop) — skip the API call rather than firing a doomed request.
        if (sourceId.startsWith('sprint-') && destId.startsWith('sprint-')) return;

        // Optimistic local update — patch just this story's `sprints` field;
        // block membership is a *derived* view (storiesForSprint/
        // generalStories), so it "moves" automatically once the source array
        // is patched, no per-column array splicing needed.
        setStories(stories.map(s => {
            if (s.id !== storyId) return s;
            if (destId === 'backlog') {
                const sourceSprintId = parseInt(sourceId.replace('sprint-', ''));
                return { ...s, sprints: (s.sprints || []).filter(sp => sp.id !== sourceSprintId) };
            }
            const destSprintId = parseInt(destId.replace('sprint-', ''));
            const destSprint = activeOrPlannedSprints.find(sp => sp.id === destSprintId);
            return { ...s, sprints: [...(s.sprints || []), { id: destSprintId, status: destSprint?.status, name: destSprint?.name }] };
        }));

        try {
            if (destId.startsWith('sprint-')) {
                await api.post(`/sprints/${destId.replace('sprint-', '')}/stories`, { storyIds: [storyId] });
            } else {
                await api.delete(`/sprints/${sourceId.replace('sprint-', '')}/stories/${storyId}`);
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to move story');
            fetchStories(); // revert-on-error via full refetch — same pattern as KanbanBoard.jsx
        }
    };

    // Quick filter presets
    const applyQuickFilter = (preset) => {
        setSearchQuery('');
        setFilterAssignee('');
        setFilterType('');
        setFilterStatus('');
        setFilterEpic('');
        setFilterSprint('');

        switch (preset) {
            case 'my-stories':
                // This would need current user ID - simplified for now
                setFilterAssignee('1'); // Replace with actual current user ID
                break;
            case 'unassigned':
                setFilterAssignee('unassigned');
                break;
            case 'no-sprint':
                setFilterSprint('none');
                break;
            case 'ready':
                setFilterStatus('ready');
                break;
            default:
                break;
        }
    };

    const clearAllFilters = () => {
        setSearchQuery('');
        setFilterAssignee('');
        setFilterType('');
        setFilterStatus('');
        setFilterEpic('');
        setFilterSprint('');
    };

    const hasActiveFilters = !!(searchQuery || filterAssignee || filterType || filterStatus || filterEpic || filterSprint);

    return (
        <>
            <Breadcrumb items={[
                { label: 'Projects', to: '/' },
                { label: projectName, to: `/project/${projectId}/${defaultLandingPage}` },
                { label: 'Backlog' },
            ]} />
            {/* Page Title */}
            <div className="flex flex-between mb-md" style={{ alignItems: 'center' }}>
                <h2>
                    Backlog
                    {hasActiveFilters && (
                        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-neutral-600)', marginLeft: 'var(--spacing-sm)' }}>
                            ({filteredStories.length} of {stories.length})
                        </span>
                    )}
                </h2>
                <button
                    onClick={() => { setCreateStorySprintId(null); setShowCreateModal(true); }}
                    className="btn btn-primary"
                >
                    + Create Story
                </button>
            </div>

            {/* Filter Bar */}
            <div className="card mb-md" style={{ padding: 'var(--spacing-md)' }}>
                <div style={{ marginBottom: 'var(--spacing-sm)' }}>
                    <strong>Filters</strong>
                    {hasActiveFilters && (
                        <button
                            onClick={clearAllFilters}
                            className="btn btn-secondary btn-sm"
                            style={{ marginLeft: 'var(--spacing-sm)' }}
                        >
                            Clear All
                        </button>
                    )}
                </div>

                {/* Search and Quick Filters */}
                <div className="flex flex-gap-sm mb-sm" style={{ flexWrap: 'wrap' }}>
                    <input
                        type="text"
                        className="form-input"
                        placeholder="Search by title or ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ flex: '1 1 300px' }}
                    />
                    <div className="flex" style={{ gap: 'var(--spacing-sm)' }}>
                        <button onClick={() => applyQuickFilter('unassigned')} className="btn btn-secondary btn-sm">
                            Unassigned
                        </button>
                        <button onClick={() => applyQuickFilter('no-sprint')} className="btn btn-secondary btn-sm">
                            No Sprint
                        </button>
                        <button onClick={() => applyQuickFilter('ready')} className="btn btn-secondary btn-sm">
                            Ready
                        </button>
                    </div>
                </div>

                {/* Advanced Filters — dropdowns + the completed-stories switch, 3 per row */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 'var(--spacing-md)'
                }}>
                    <select
                        className="form-select"
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                    >
                        <option value="">All Types</option>
                        {TYPE_OPTIONS.map(type => (
                            <option key={type.value} value={type.value}>
                                {type.icon} {type.label}
                            </option>
                        ))}
                    </select>

                    <select
                        className="form-select"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                    >
                        <option value="">All Statuses</option>
                        {STATUS_OPTIONS.map(status => (
                            <option key={status.value} value={status.value}>
                                {status.label}
                            </option>
                        ))}
                    </select>

                    <select
                        className="form-select"
                        value={filterAssignee}
                        onChange={(e) => setFilterAssignee(e.target.value)}
                    >
                        <option value="">All Assignees</option>
                        <option value="unassigned">Unassigned</option>
                        {members.map(member => (
                            <option key={member.id} value={member.id}>
                                {member.firstName} {member.lastName}
                            </option>
                        ))}
                    </select>

                    <ColorDropdown
                        options={[
                            { value: '', label: 'All Epics', color: null },
                            { value: 'none', label: 'No Epic', color: null },
                            ...epics.map(epic => ({ value: epic.id.toString(), label: epic.title, color: epic.color }))
                        ]}
                        value={filterEpic}
                        onChange={setFilterEpic}
                    />

                    <select
                        className="form-select"
                        value={filterSprint}
                        onChange={(e) => setFilterSprint(e.target.value)}
                    >
                        <option value="">All Sprints</option>
                        <option value="none">No Sprint</option>
                        {completedSprints.map(sprint => (
                            <option key={sprint.id} value={sprint.id}>
                                {sprint.name}
                            </option>
                        ))}
                    </select>

                    <label className="switch switch-primary">
                        <input
                            type="checkbox"
                            checked={showCompleted}
                            onChange={(e) => setShowCompleted(e.target.checked)}
                        />
                        <span className="switch-track">
                            <span className="switch-thumb" />
                        </span>
                        <span className="switch-text">Show completed stories</span>
                    </label>
                </div>
            </div>

            {/* Bulk Actions Toolbar */}
            {selectedStories.length > 0 && (
                <div className="card mb-md" style={{ backgroundColor: 'var(--color-info-light)', borderLeft: '4px solid var(--color-info)' }}>
                    <div style={{ marginBottom: 'var(--spacing-sm)' }}>
                        <strong>{selectedStories.length}</strong> {selectedStories.length === 1 ? 'story' : 'stories'} selected
                    </div>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                        gap: 'var(--spacing-md)'
                    }}>
                        {/* Assign to User */}
                        <div className="flex flex-gap-sm">
                            <select
                                className="form-select"
                                value={selectedAssignee}
                                onChange={(e) => setSelectedAssignee(e.target.value)}
                                style={{ flex: 1 }}
                            >
                                <option value="">Assign to...</option>
                                <option value="unassigned">Unassigned</option>
                                {members.map(member => (
                                    <option key={member.id} value={member.id}>
                                        {member.firstName} {member.lastName}
                                    </option>
                                ))}
                            </select>
                            <button
                                onClick={handleBulkAssign}
                                disabled={!selectedAssignee}
                                className="btn btn-secondary btn-sm"
                            >
                                Assign
                            </button>
                        </div>

                        {/* Change Status */}
                        <div className="flex flex-gap-sm">
                            <select
                                className="form-select"
                                value={selectedStatus}
                                onChange={(e) => setSelectedStatus(e.target.value)}
                                style={{ flex: 1 }}
                            >
                                <option value="">Change status...</option>
                                {STATUS_OPTIONS.map(status => (
                                    <option key={status.value} value={status.value}>
                                        {status.label}
                                    </option>
                                ))}
                            </select>
                            <button
                                onClick={handleBulkStatusChange}
                                disabled={!selectedStatus}
                                className="btn btn-secondary btn-sm"
                            >
                                Update
                            </button>
                        </div>

                        {/* Assign to Epic */}
                        <div className="flex flex-gap-sm">
                            <div style={{ flex: 1 }}>
                                <ColorDropdown
                                    options={[
                                        { value: '', label: 'Assign to epic...', color: null },
                                        { value: 'none', label: 'No Epic', color: null },
                                        ...epics.map(epic => ({ value: epic.id.toString(), label: epic.title, color: epic.color }))
                                    ]}
                                    value={selectedEpic}
                                    onChange={setSelectedEpic}
                                />
                            </div>
                            <button
                                onClick={handleBulkEpicAssign}
                                disabled={!selectedEpic}
                                className="btn btn-secondary btn-sm"
                            >
                                Assign
                            </button>
                        </div>

                        {/* Add to Sprint */}
                        <div className="flex flex-gap-sm">
                            <select
                                className="form-select"
                                value={selectedSprint}
                                onChange={(e) => setSelectedSprint(e.target.value)}
                                disabled={addingToSprint}
                                style={{ flex: 1 }}
                            >
                                <option value="">Add to sprint...</option>
                                {activeOrPlannedSprints.map(sprint => (
                                    <option key={sprint.id} value={sprint.id}>
                                        {sprint.name} ({sprint.status})
                                    </option>
                                ))}
                            </select>
                            <button
                                onClick={handleAddToSprint}
                                disabled={!selectedSprint || addingToSprint}
                                className="btn btn-primary btn-sm"
                            >
                                {addingToSprint ? 'Adding...' : 'Add'}
                            </button>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-gap-sm mt-md" style={{ justifyContent: 'flex-end' }}>
                        <button
                            onClick={handleBulkDelete}
                            className="btn btn-danger btn-sm"
                        >
                            Delete Selected
                        </button>
                        <button
                            onClick={() => setSelectedStories([])}
                            className="btn btn-secondary btn-sm"
                        >
                            Clear Selection
                        </button>
                    </div>
                </div>
            )}

            {/* Success/Error Messages */}
            {successMessage && (
                <div className="card mb-md" style={{ backgroundColor: 'var(--color-success-light)', borderLeft: '4px solid var(--color-success)' }}>
                    {successMessage}
                </div>
            )}
            {error && (
                <div className="form-error mb-md">{error}</div>
            )}

            {loading ? (
                <div className="text-center">Loading stories...</div>
            ) : stories.length === 0 ? (
                <div className="card text-center">
                    <h3>No Stories Yet</h3>
                    <p className="text-muted mt-md">
                        Create your first user story to get started
                    </p>
                </div>
            ) : (
                <DragDropContext onDragEnd={handleDragEnd}>
                    {/* SPR-02: one block per active/planned sprint, each showing
                        only that sprint's own stories — these stories no longer
                        appear in the general Backlog table below. SPR-04: drag a
                        row between the Backlog table and a sprint block to move
                        it (dragging directly between two different sprint
                        blocks isn't supported — drag back to Backlog first). */}
                    {activeOrPlannedSprints.map(sprint => (
                        <div key={sprint.id} className="card mb-md">
                            <div className="card-header flex flex-between" style={{ alignItems: 'center' }}>
                                <h3 className="card-title">
                                    {sprint.name}
                                    <span
                                        className="badge"
                                        style={{
                                            marginLeft: 'var(--spacing-sm)',
                                            fontSize: '10px',
                                            padding: '2px 6px',
                                            backgroundColor: sprint.status === 'active' ? 'var(--color-success)' : 'var(--color-neutral-400)',
                                            color: 'white'
                                        }}
                                    >
                                        {sprint.status}
                                    </span>
                                </h3>
                                <button
                                    onClick={() => { setCreateStorySprintId(sprint.id); setShowCreateModal(true); }}
                                    className="btn btn-secondary btn-sm"
                                >
                                    + Create story into sprint
                                </button>
                            </div>
                            <StoryTable
                                droppableId={`sprint-${sprint.id}`}
                                stories={storiesForSprint(sprint.id)}
                                epics={epics}
                                selectedStories={selectedStories}
                                onToggleStory={handleToggleStory}
                                onToggleAllInTable={handleToggleAllInTable}
                                onUpdateStoryStatus={handleUpdateStoryStatus}
                                onFilterByEpic={setFilterEpic}
                                onOpenDetails={setSelectedStory}
                                getStatusBadgeClass={getStatusBadgeClass}
                                projectId={projectId}
                                navigate={navigate}
                            />
                        </div>
                    ))}

                    <div className="card mb-md">
                        <div className="card-header">
                            <h3 className="card-title">Backlog</h3>
                        </div>
                        <StoryTable
                            droppableId="backlog"
                            stories={generalStories}
                            epics={epics}
                            selectedStories={selectedStories}
                            onToggleStory={handleToggleStory}
                            onToggleAllInTable={handleToggleAllInTable}
                            onUpdateStoryStatus={handleUpdateStoryStatus}
                            onFilterByEpic={setFilterEpic}
                            onOpenDetails={setSelectedStory}
                            getStatusBadgeClass={getStatusBadgeClass}
                            projectId={projectId}
                            navigate={navigate}
                        />
                    </div>
                </DragDropContext>
            )}

            {/* Create Story Modal */}
            {showCreateModal && (
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
                }} onClick={() => { setShowCreateModal(false); setCreateStorySprintId(null); }}>
                    <div className="card" style={{ maxWidth: '850px', width: '100%', margin: 'var(--spacing-md)' }}
                        onClick={(e) => e.stopPropagation()}>
                        <div className="card-header">
                            <h3 className="card-title">Create New Story</h3>
                        </div>

                        <form onSubmit={handleCreateStory}>
                            <div className="form-group">
                                <label className="form-label">Title</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={newStory.title}
                                    onChange={(e) => setNewStory({ ...newStory, title: e.target.value })}
                                    required
                                    autoFocus
                                />
                            </div>

                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
                                gap: 'var(--spacing-md)',
                                paddingBottom: 'var(--spacing-md)',
                                marginBottom: 'var(--spacing-md)',
                                borderBottom: '1px solid var(--color-border)'
                            }}>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label">Type</label>
                                    <select
                                        className="form-select"
                                        value={newStory.type}
                                        onChange={(e) => setNewStory({ ...newStory, type: e.target.value })}
                                    >
                                        {TYPE_OPTIONS.map(option => (
                                            <option key={option.value} value={option.value}>
                                                {option.icon} {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label">Story Points</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        value={newStory.storyPoints}
                                        onChange={(e) => setNewStory({ ...newStory, storyPoints: e.target.value })}
                                        min="0"
                                        placeholder="Optional"
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Description</label>
                                <MarkdownEditor
                                    value={newStory.description}
                                    onChange={(v) => setNewStory({ ...newStory, description: v })}
                                    rows={10}
                                />
                            </div>

                            {error && (
                                <div className="form-error mb-md">
                                    {error}
                                </div>
                            )}

                            <div className="flex flex-gap-sm" style={{ justifyContent: 'flex-end' }}>
                                <button
                                    type="button"
                                    onClick={() => { setShowCreateModal(false); setCreateStorySprintId(null); }}
                                    className="btn btn-secondary"
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    Create Story
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

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
                                        {STATUS_OPTIONS.find(s => s.value === selectedStory.status)?.label}
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
                                    <strong>Creator:</strong>
                                    <p className="mt-xs">{selectedStory.creatorName || 'Unknown'}</p>
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
                            <button
                                onClick={() => setShowCloneModal(true)}
                                className="btn btn-secondary"
                            >
                                Clone
                            </button>
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

            {showCloneModal && selectedStory && (
                <CloneStoryModal
                    story={selectedStory}
                    onClose={() => setShowCloneModal(false)}
                    onCloned={(newStory) => {
                        setStories([newStory, ...stories]);
                        setShowCloneModal(false);
                        setSelectedStory(null);
                    }}
                />
            )}
        </>
    );
};

export default Backlog;
