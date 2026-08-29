'use client';

import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';

export const TrajectoryChart: React.FC = () => {
  const data = [
    { week: 'Week 1', risk: 32, note: 'Initial PRD Scope Baseline' },
    { week: 'Week 2', risk: 48, note: 'First CI Flakiness & Overtime Spike' },
    { week: 'Week 3', risk: 64, note: 'Staging DB Deadlock Incident' },
    { week: 'Week 4', risk: 82, note: 'Activation Drops to 31% (Current)' },
    { week: 'Week 5 (Est)', risk: 89, note: 'Predicted Testing Bottleneck' },
    { week: 'Week 6 (Est)', risk: 96, note: 'Projected Missed Release Horizon' },
  ];

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2e3846" />
          <XAxis
            dataKey="week"
            stroke="#64748b"
            tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 500 }}
          />
          <YAxis
            stroke="#64748b"
            domain={[0, 100]}
            unit="%"
            tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 500 }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#161b22',
              borderColor: '#2e3846',
              borderRadius: '12px',
              fontSize: '12px',
              color: '#f8fafc',
            }}
            formatter={(value: number) => [`${value}% Failure Risk`, 'Calculated Risk']}
            labelFormatter={(label, payload) => {
              const item = payload?.[0]?.payload;
              return `${label}: ${item?.note || ''}`;
            }}
          />
          <ReferenceLine y={80} stroke="#fb7185" strokeDasharray="4 4" label={{ value: 'Critical Threshold (80%)', fill: '#fb7185', fontSize: 10 }} />
          <Line
            type="monotone"
            dataKey="risk"
            stroke="#ff7a00"
            strokeWidth={3}
            dot={{ r: 5, fill: '#ff7a00', stroke: '#090b0e', strokeWidth: 2 }}
            activeDot={{ r: 7, fill: '#fb7185' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
