import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const STATUS_ORDER = ['backlog', 'refining', 'ready', 'in_development', 'review', 'test', 'done', 'cancelled'];

const STATUS_LABELS = {
    backlog: 'Backlog', refining: 'Refining', ready: 'Ready',
    in_development: 'In Development', review: 'Review', test: 'Test',
    done: 'Done', cancelled: 'Cancelled'
};

const STATUS_COLORS = {
    backlog: '#97A0AF', refining: '#6554C0', ready: '#00875A',
    in_development: '#0052CC', review: '#FF8B00', test: '#FFAB00',
    done: '#36B37E', cancelled: '#DE350B'
};

// Vertical stacked bar graph: one bar per assignee, segmented by status —
// FY-01's "Team Workload" widget.
const TeamWorkloadChart = ({ data }) => {
    if (!data || data.length === 0) {
        return (
            <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center', color: 'var(--color-neutral-500)' }}>
                No assigned work in this sprint yet.
            </div>
        );
    }

    const statusesPresent = STATUS_ORDER.filter(status => data.some(row => row[status]));

    return (
        <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis
                    dataKey="assigneeName"
                    stroke="var(--color-neutral-600)"
                    style={{ fontSize: '12px' }}
                />
                <YAxis allowDecimals={false} stroke="var(--color-neutral-600)" />
                <Tooltip
                    contentStyle={{
                        backgroundColor: 'var(--color-surface)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-sm)'
                    }}
                />
                <Legend formatter={(value) => STATUS_LABELS[value] || value} />
                {statusesPresent.map(status => (
                    <Bar key={status} dataKey={status} stackId="workload" fill={STATUS_COLORS[status]} name={status} />
                ))}
            </BarChart>
        </ResponsiveContainer>
    );
};

export default TeamWorkloadChart;
