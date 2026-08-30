'use client';

import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
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
      <div className="w-full h-48 flex items-center justify-center text-sm text-muted-foreground border border-dashed border-border rounded-xl">
        Insufficient evidence for a reliable failure prediction.
      </div>
    );
  }

  return (
    <div className="w-full h-48 sm:h-52">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={series} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="week"
            stroke="var(--border)"
            tick={{ fill: 'var(--muted-foreground)', fontSize: 11, fontWeight: 500 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            stroke="var(--border)"
            domain={[0, 100]}
            unit="%"
            tick={{ fill: 'var(--muted-foreground)', fontSize: 11, fontWeight: 500 }}
            axisLine={false}
            tickLine={false}
            width={42}
          />
          <Tooltip
            cursor={{ fill: 'var(--surface-feed)', opacity: 0.6 }}
            contentStyle={{
              backgroundColor: 'var(--card)',
              borderColor: 'var(--border)',
              borderRadius: '12px',
              fontSize: '12px',
              color: 'var(--foreground)',
            }}
            formatter={(value: number) => [`${value}% Failure Risk`, 'Calculated Risk']}
            labelFormatter={(label, payload) => {
              const item = payload?.[0]?.payload;
              return `${label}${item?.note ? `: ${item.note}` : ''}`;
            }}
          />
          <Bar
            dataKey="risk"
            fill="var(--destructive)"
            radius={[4, 4, 0, 0]}
            maxBarSize={36}
            name="Risk"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
