import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const BurndownChart = ({ data, startDate, endDate }) => {
    if (!data || data.length === 0) {
        return (
            <div style={{
                padding: 'var(--spacing-xl)',
                textAlign: 'center',
                color: 'var(--color-neutral-500)',
                backgroundColor: 'var(--color-neutral-50)',
                borderRadius: 'var(--radius-md)'
            }}>
                <p>No burndown data available yet.</p>
                <p className="text-small mt-sm">
                    Daily snapshots are captured automatically for active sprints.
                </p>
            </div>
        );
    }

    // Calculate ideal burndown line
    const totalPoints = data[0]?.remainingPoints + data[0]?.completedPoints || 0;
    const sprintDays = data.length;

    const chartData = data.map((snapshot, index) => {
        const idealRemaining = totalPoints - (totalPoints / sprintDays) * (index + 1);
        return {
            date: new Date(snapshot.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            actual: snapshot.remainingPoints,
            ideal: Math.max(0, Math.round(idealRemaining)),
            completed: snapshot.completedPoints
        };
    });

    return (
        <div>
            <ResponsiveContainer width="100%" height={350}>
                <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis
                        dataKey="date"
                        stroke="var(--color-neutral-600)"
                        style={{ fontSize: '12px' }}
                    />
                    <YAxis
                        stroke="var(--color-neutral-600)"
                        style={{ fontSize: '12px' }}
                        label={{ value: 'Story Points', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: 'var(--color-surface)',
                            border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-sm)'
                        }}
                    />
                    <Legend />
                    <Line
                        type="monotone"
                        dataKey="ideal"
                        stroke="var(--color-neutral-400)"
                        strokeDasharray="5 5"
                        name="Ideal Burndown"
                        dot={false}
                    />
                    <Line
                        type="monotone"
                        dataKey="actual"
                        stroke="var(--color-primary)"
                        strokeWidth={2}
                        name="Actual Remaining"
                        dot={{ fill: 'var(--color-primary)', r: 4 }}
                    />
                    <Line
                        type="monotone"
                        dataKey="completed"
                        stroke="var(--color-success)"
                        strokeWidth={2}
                        name="Completed Points"
                        dot={{ fill: 'var(--color-success)', r: 4 }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};

export default BurndownChart;
