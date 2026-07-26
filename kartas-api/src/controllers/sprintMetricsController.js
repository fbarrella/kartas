import { query } from '../config/database.js';

export const sprintMetricsController = {
    // Get all completed sprints for a project
    async getCompletedSprints(req, res) {
        try {
            const { projectId } = req.params;
            const userId = req.user.userId;

            // Verify user has access to project
            const accessCheck = await query(
                'SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2',
                [projectId, userId]
            );

            if (accessCheck.rows.length === 0 && req.user.role !== 'admin') {
                return res.status(403).json({ error: 'Access denied' });
            }

            const result = await query(
                `SELECT 
                    id, 
                    name, 
                    objective,
                    start_date,
                    end_date,
                    status,
                    created_at
                 FROM sprints
                 WHERE project_id = $1 AND status = 'completed'
                 ORDER BY end_date DESC`,
                [projectId]
            );

            res.json(result.rows.map(sprint => ({
                id: sprint.id,
                name: sprint.name,
                objective: sprint.objective,
                startDate: sprint.start_date,
                endDate: sprint.end_date,
                status: sprint.status,
                createdAt: sprint.created_at
            })));
        } catch (error) {
            console.error('Error fetching completed sprints:', error);
            res.status(500).json({ error: 'Server error' });
        }
    },

    // Get comprehensive sprint report
    async getSprintReport(req, res) {
        try {
            const { sprintId } = req.params;
            const userId = req.user.userId;

            // Get sprint details
            const sprintResult = await query(
                `SELECT s.*, p.name as project_name, p.ticket_prefix
                 FROM sprints s
                 JOIN projects p ON s.project_id = p.id
                 WHERE s.id = $1`,
                [sprintId]
            );

            if (sprintResult.rows.length === 0) {
                return res.status(404).json({ error: 'Sprint not found' });
            }

            const sprint = sprintResult.rows[0];

            // Verify user has access to project
            const accessCheck = await query(
                'SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2',
                [sprint.project_id, userId]
            );

            if (accessCheck.rows.length === 0 && req.user.role !== 'admin') {
                return res.status(403).json({ error: 'Access denied' });
            }

            // Get completion metrics — use snapshot_status for completed sprints
            // so the report is frozen at sprint-end, not at current story state.
            const completionResult = await query(
                `SELECT 
                    COUNT(*) FILTER (WHERE COALESCE(ss.snapshot_status, s.status) = 'done') as completed_stories,
                    COUNT(*) as total_stories,
                    COALESCE(SUM(s.story_points) FILTER (WHERE COALESCE(ss.snapshot_status, s.status) = 'done'), 0) as completed_points,
                    COALESCE(SUM(s.story_points), 0) as total_points
                 FROM sprint_stories ss
                 JOIN stories s ON ss.story_id = s.id
                 WHERE ss.sprint_id = $1`,
                [sprintId]
            );

            const metrics = completionResult.rows[0];

            // Calculate burndown data from sprint_metrics history
            const sprintDates = await query(
                'SELECT start_date, end_date FROM sprints WHERE id = $1',
                [sprintId]
            );

            const startDate = new Date(sprintDates.rows[0].start_date);
            const endDate = new Date(sprintDates.rows[0].end_date);

            // Get total points in sprint
            const totalPointsResult = await query(
                `SELECT COALESCE(SUM(s.story_points), 0) as total_points
                 FROM sprint_stories ss
                 JOIN stories s ON ss.story_id = s.id
                 WHERE ss.sprint_id = $1`,
                [sprintId]
            );
            const totalPoints = parseInt(totalPointsResult.rows[0].total_points);

            // Get completion dates for all stories
            const completionData = await query(
                `SELECT 
                    DATE(sm.entered_at) as completion_date,
                    SUM(s.story_points) as points_completed
                 FROM sprint_metrics sm
                 JOIN stories s ON sm.story_id = s.id
                 WHERE sm.sprint_id = $1
                 AND sm.status = 'done'
                 GROUP BY DATE(sm.entered_at)
                 ORDER BY completion_date ASC`,
                [sprintId]
            );

            // Build daily burndown data
            const burndownData = [];
            const currentDate = new Date(startDate);
            let cumulativeCompleted = 0;
            let completionIndex = 0;

            while (currentDate <= endDate && currentDate <= new Date()) {
                const dateStr = currentDate.toISOString().split('T')[0];

                // Add any points completed on this date
                while (completionIndex < completionData.rows.length) {
                    const completionDate = new Date(completionData.rows[completionIndex].completion_date)
                        .toISOString().split('T')[0];

                    if (completionDate === dateStr) {
                        cumulativeCompleted += parseInt(completionData.rows[completionIndex].points_completed);
                        completionIndex++;
                    } else if (completionDate < dateStr) {
                        cumulativeCompleted += parseInt(completionData.rows[completionIndex].points_completed);
                        completionIndex++;
                    } else {
                        break;
                    }
                }

                burndownData.push({
                    date: dateStr,
                    remainingPoints: totalPoints - cumulativeCompleted,
                    completedPoints: cumulativeCompleted,
                    remainingStories: 0,
                    completedStories: 0
                });

                currentDate.setDate(currentDate.getDate() + 1);
            }

            // Get time in status metrics
            const timeMetrics = await query(
                `SELECT 
                    sm.status,
                    COUNT(DISTINCT sm.story_id) as story_count,
                    AVG(EXTRACT(EPOCH FROM (COALESCE(sm.exited_at, CURRENT_TIMESTAMP) - sm.entered_at))) as avg_time_seconds
                 FROM sprint_metrics sm
                 WHERE sm.sprint_id = $1
                 GROUP BY sm.status
                 ORDER BY 
                    CASE sm.status
                        WHEN 'backlog' THEN 1
                        WHEN 'refining' THEN 2
                        WHEN 'ready' THEN 3
                        WHEN 'in_development' THEN 4
                        WHEN 'review' THEN 5
                        WHEN 'test' THEN 6
                        WHEN 'done' THEN 7
                        ELSE 8
                    END`,
                [sprintId]
            );

            // Get team contributions — use snapshot_status for completed sprints
            const teamResult = await query(
                `SELECT 
                    u.id,
                    u.first_name,
                    u.last_name,
                    u.email,
                    COUNT(*) FILTER (WHERE COALESCE(ss.snapshot_status, s.status) = 'done') as completed_stories,
                    COALESCE(SUM(s.story_points) FILTER (WHERE COALESCE(ss.snapshot_status, s.status) = 'done'), 0) as completed_points
                 FROM sprint_stories ss
                 JOIN stories s ON ss.story_id = s.id
                 LEFT JOIN users u ON s.assignee_id = u.id
                 WHERE ss.sprint_id = $1
                 GROUP BY u.id, u.first_name, u.last_name, u.email
                 ORDER BY completed_points DESC`,
                [sprintId]
            );

            res.json({
                sprint: {
                    id: sprint.id,
                    name: sprint.name,
                    objective: sprint.objective,
                    startDate: sprint.start_date,
                    endDate: sprint.end_date,
                    status: sprint.status,
                    projectName: sprint.project_name,
                    ticketPrefix: sprint.ticket_prefix
                },
                metrics: {
                    completedStories: parseInt(metrics.completed_stories),
                    totalStories: parseInt(metrics.total_stories),
                    completedPoints: parseInt(metrics.completed_points),
                    totalPoints: parseInt(metrics.total_points),
                    completionRate: metrics.total_stories > 0
                        ? (parseInt(metrics.completed_stories) / parseInt(metrics.total_stories) * 100).toFixed(1)
                        : 0,
                    velocity: parseInt(metrics.completed_points)
                },
                burndown: burndownData,
                timeInStatus: timeMetrics.rows.map(row => ({
                    status: row.status,
                    storyCount: parseInt(row.story_count),
                    avgTimeHours: row.avg_time_seconds ? (parseFloat(row.avg_time_seconds) / 3600).toFixed(1) : 0
                })),
                teamContributions: teamResult.rows.map(row => ({
                    userId: row.id,
                    name: row.id ? `${row.first_name} ${row.last_name}` : 'Unassigned',
                    email: row.email,
                    completedStories: parseInt(row.completed_stories),
                    completedPoints: parseInt(row.completed_points)
                }))
            });
        } catch (error) {
            console.error('Error fetching sprint report:', error);
            res.status(500).json({ error: 'Server error' });
        }
    }
};
