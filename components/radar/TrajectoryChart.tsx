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

export type TrajectoryPoint = {
  week?: string;
  timestamp?: string;
  label?: string;
  risk?: number;
  risk_score?: number;
  note?: string;
};

export const TrajectoryChart: React.FC<{ data?: TrajectoryPoint[] }> = ({ data }) => {
  const series = (data || [])
    .map((point) => ({
      week: point.week || point.label || point.timestamp || 'Point',
      risk: Number(point.risk ?? point.risk_score ?? 0),
      note: point.note || '',
    }))
    .filter((point) => Number.isFinite(point.risk));

  if (series.length === 0) {
    return (
      <div className="w-full h-80 flex items-center justify-center text-sm text-muted-foreground border border-dashed border-border rounded-xl">
        Insufficient evidence for a reliable failure prediction.
      </div>
    );
  }

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={series} margin={{ top: 20, right: 30, left: 0, bottom: 10 }}>
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
