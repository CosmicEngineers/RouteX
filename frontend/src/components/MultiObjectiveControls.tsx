'use client';

import React from 'react';
import { Target, TrendDown, TrendUp, Lightning } from 'phosphor-react';

interface WeightsType {
  cost: number;
  time: number;
  utilization: number;
  emissions: number;
}

interface MultiObjectiveControlsProps {
  weights: WeightsType;
  onWeightChange: (objective: keyof WeightsType, value: number) => void;
}

export function MultiObjectiveControls({ weights, onWeightChange }: MultiObjectiveControlsProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);

  const objectives = [
    {
      key: 'cost' as const,
      label: 'Minimize Cost',
      icon: TrendDown,
      color: 'text-emerald-400',
      description: 'Reduce total operational costs'
    },
    {
      key: 'time' as const,
      label: 'Minimize Travel Time',
      icon: Lightning,
      color: 'text-cyan-400',
      description: 'Faster deliveries, shorter routes'
    },
    {
      key: 'utilization' as const,
      label: 'Maximize Fleet Utilization',
      icon: TrendUp,
      color: 'text-purple-400',
      description: 'Keep vessels busy, reduce idle time'
    },
    {
      key: 'emissions' as const,
      label: 'Minimize CO₂ Emissions',
      icon: Target,
      color: 'text-green-400',
      description: 'Environmental impact reduction'
    }
  ];

  // Normalize weights to ensure they sum to 100
  const handleWeightChange = (key: keyof typeof weights, value: number) => {
    const newWeights = { ...weights, [key]: value };
    const total = Object.values(newWeights).reduce((a, b) => a + b, 0);
    
    if (total > 0) {
      // Normalize all weights proportionally
      const normalized = Object.entries(newWeights).reduce(
        (acc, [k, v]) => ({ ...acc, [k]: (v / total) * 100 }),
        {} as typeof weights
      );
      
      Object.entries(normalized).forEach(([k, v]) => {
        onWeightChange(k as keyof typeof weights, v);
      });
    }
  };

  return (
    <div className="glass-card rounded-xl border border-slate-700/50 p-6">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full text-left"
      >
        <div className="flex items-center space-x-3">
          <Target className="h-5 w-5 text-purple-400" />
          <div>
            <h3 className="text-lg font-semibold text-slate-100">
              Multi-Objective Optimization
            </h3>
            <p className="text-sm text-slate-400 mt-0.5">
              Balance competing objectives with custom weights
            </p>
          </div>
        </div>
        <span className="text-slate-400">{isExpanded ? '−' : '+'}</span>
      </button>

      {isExpanded && (
        <div className="mt-6 space-y-6">
          {objectives.map(({ key, label, icon: Icon, color, description }) => (
            <div key={key}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Icon className={`h-4 w-4 ${color}`} />
                  <label className="text-sm font-medium text-slate-200">
                    {label}
                  </label>
                </div>
                <span className="text-sm font-semibold text-slate-100">
                  {weights[key].toFixed(0)}%
                </span>
              </div>
              
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={weights[key]}
                onChange={(e) => handleWeightChange(key, Number(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
              
              <p className="text-xs text-slate-500 mt-1">{description}</p>
            </div>
          ))}

          <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
            <div className="text-sm font-semibold text-slate-200 mb-2">
              Current Balance:
            </div>
            <div className="flex h-3 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500"
                style={{ width: `${weights.cost}%` }}
                title={`Cost: ${weights.cost.toFixed(0)}%`}
              />
              <div
                className="bg-cyan-500"
                style={{ width: `${weights.time}%` }}
                title={`Time: ${weights.time.toFixed(0)}%`}
              />
              <div
                className="bg-purple-500"
                style={{ width: `${weights.utilization}%` }}
                title={`Utilization: ${weights.utilization.toFixed(0)}%`}
              />
              <div
                className="bg-green-500"
                style={{ width: `${weights.emissions}%` }}
                title={`Emissions: ${weights.emissions.toFixed(0)}%`}
              />
            </div>
            <div className="flex justify-between text-xs text-slate-400 mt-2">
              <span>Cost-focused</span>
              <span>Balanced</span>
              <span>Green-focused</span>
            </div>
          </div>

          <div className="text-xs text-slate-500 italic">
            💡 Tip: Adjust weights to see how different priorities affect your optimization results. 
            The solver will find solutions that best satisfy your chosen balance.
          </div>
        </div>
      )}
    </div>
  );
}
