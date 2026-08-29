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
      <div className="w-full h-72">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="75%" data={chartData}>
            <PolarGrid stroke="#2e3846" strokeDasharray="3 3" />
            <PolarAngleAxis
              dataKey="subject"
              tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }}
            />
            <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#2e3846" tick={{ fill: '#64748b', fontSize: 9 }} />
            <Radar
              name="Risk Vector"
              dataKey="score"
              stroke="#ff7a00"
              fill="#ff7a00"
              fillOpacity={0.35}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Dimension Quick Badges */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 w-full mt-2">
        {dimensions.map(dim => {
          const isSelected = selectedDimension === dim.dimension;
          const isHigh = dim.score >= 80;
          const isMed = dim.score >= 60 && dim.score < 80;

          return (
            <button
              key={dim.dimension}
              onClick={() => onSelectDimension && onSelectDimension(dim)}
              className={`p-2 rounded-xl text-center border transition-all ${
                isSelected
                  ? 'bg-primary/20 border-primary text-primary ring-1 ring-primary/40'
                  : 'bg-card border-border/80 text-muted-foreground hover:border-border hover:text-foreground'
              }`}
            >
              <span className="text-[10px] font-mono uppercase block">{dim.dimension}</span>
              <span
                className={`text-sm font-extrabold font-mono ${
                  isHigh ? 'text-rose-400' : isMed ? 'text-amber-400' : 'text-emerald-400'
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
