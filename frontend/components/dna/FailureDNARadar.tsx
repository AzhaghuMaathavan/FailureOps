'use client';

import React from 'react';
import { FailureDNADimension } from '@/types';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

interface FailureDNARadarProps {
  dimensions: FailureDNADimension[];
  onSelectDimension?: (dimension: FailureDNADimension) => void;
  selectedDimension?: string;
}

export const FailureDNARadar: React.FC<FailureDNARadarProps> = ({
  dimensions,
  onSelectDimension,
  selectedDimension,
}) => {
  const chartData = dimensions.map(d => ({
    subject: d.dimension,
    score: d.score,
    fullMark: 100,
  }));

  return (
    <div className="w-full flex flex-col items-center">
      <div className="w-full h-64 sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="75%" data={chartData}>
            <PolarGrid stroke="var(--border)" strokeDasharray="3 3" />
            <PolarAngleAxis
              dataKey="subject"
              tick={{ fill: 'var(--muted-foreground)', fontSize: 11, fontWeight: 600 }}
            />
            <PolarRadiusAxis
              angle={30}
              domain={[0, 100]}
              stroke="var(--border)"
              tick={{ fill: 'var(--muted-foreground)', fontSize: 9 }}
            />
            <Radar
              name="Risk Vector"
              dataKey="score"
              stroke="var(--primary)"
              fill="var(--primary)"
              fillOpacity={0.28}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 w-full mt-2">
        {dimensions.map(dim => {
          const isSelected = selectedDimension === dim.dimension;
          const isHigh = dim.score >= 80;
          const isMed = dim.score >= 60 && dim.score < 80;

          return (
            <button
              key={dim.dimension}
              type="button"
              onClick={() => onSelectDimension && onSelectDimension(dim)}
              className={`p-2 min-h-[44px] rounded-xl text-center border transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                isSelected
                  ? 'bg-primary-muted border-primary text-primary ring-1 ring-primary/40'
                  : 'bg-card border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
              }`}
            >
              <span className="text-[10px] font-mono uppercase block">{dim.dimension}</span>
              <span
                className={`text-sm font-extrabold font-mono ${
                  isHigh ? 'text-destructive' : isMed ? 'text-warning' : 'text-success'
                }`}
              >
                {dim.score}%
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
