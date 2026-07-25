import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

const TimeInStatusChart = ({ data }) => {
    if (!data || data.length === 0) {
        return (
            <div style={{
                padding: 'var(--spacing-xl)',
                textAlign: 'center',
                color: 'var(--color-neutral-500)'
            }}>
                No time tracking data available.
            </div>
        );
    }

    const statusColors = {
        'backlog': '#97A0AF',
        'refining': '#6554C0',
        'ready': '#00875A',
        'in_development': '#0052CC',
        'review': '#FF8B00',
        'test': '#FFAB00',
        'done': '#00875A',
        'cancelled': '#DE350B'
    };

    const chartData = data.map(item => ({
        status: item.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        hours: parseFloat(item.avgTimeHours),
        stories: item.storyCount
    }));

    return (
        <ResponsiveContainer width="100%" height={300}>
            <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
            >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis
                    type="number"
                    stroke="var(--color-neutral-600)"
                    label={{ value: 'Average Hours', position: 'insideBottom', offset: -5 }}
                />
                <YAxis
                    type="category"
                    dataKey="status"
                    stroke="var(--color-neutral-600)"
                    width={90}
                    style={{ fontSize: '12px' }}
                />
                <Tooltip
                    contentStyle={{
                        backgroundColor: 'var(--color-surface)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-sm)'
                    }}
                    formatter={(value, name, props) => {
                        if (name === 'hours') {
                            return [`${value} hours (${props.payload.stories} stories)`, 'Avg Time'];
                        }
                        return value;
                    }}
                />
                <Bar dataKey="hours" fill="var(--color-primary)">
                    {chartData.map((entry, index) => {
                        const originalStatus = data[index].status;
                        return <Cell key={`cell-${index}`} fill={statusColors[originalStatus] || 'var(--color-primary)'} />;
                    })}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
};

export default TimeInStatusChart;
