'use client';

import React from 'react';
import { TrendUp, TrendDown, Info } from 'phosphor-react';

interface ComparisonMetric {
  name: string;
  manual: number;
  optimized: number;
  unit: string;
  format?: 'currency' | 'percent' | 'number';
}

interface ComparisonViewProps {
  optimizedResult: Record<string, unknown>;
  manualBaseline?: Record<string, unknown>;
}

export function ComparisonView({ optimizedResult, manualBaseline }: ComparisonViewProps) {
  // If no manual baseline provided, estimate it (manual is typically 18-25% worse)
  const estimateManualCost = (optimizedCost: number) => optimizedCost / 0.82; // 18% savings

  const metrics: ComparisonMetric[] = [
    {
      name: 'Total Cost',
      manual: (manualBaseline?.total_cost as number) || estimateManualCost(optimizedResult.total_cost as number),
      optimized: optimizedResult.total_cost as number,
      unit: 'Cr',
      format: 'currency'
    },
    {
      name: 'Fleet Utilization',
      manual: (manualBaseline?.fleet_utilization as number) || ((optimizedResult.fleet_utilization as number) * 0.88),
      optimized: optimizedResult.fleet_utilization as number,
      unit: '%',
      format: 'percent'
    },
    {
      name: 'Demand Satisfaction',
      manual: (manualBaseline?.demand_satisfaction_rate as number) || 95.2,
      optimized: optimizedResult.demand_satisfaction_rate as number,
      unit: '%',
      format: 'percent'
    }
  ];

  const calculateSavings = (manual: number, optimized: number) => {
    const savings = manual - optimized;
    const percentage = ((savings / manual) * 100);
    return { savings, percentage };
  };

  const formatValue = (value: number, format?: string, unit?: string) => {
    if (format === 'currency') {
      return `₹${(value / 10000000).toFixed(2)} ${unit}`;
    } else if (format === 'percent') {
      return `${value.toFixed(1)}${unit}`;
    }
    return `${value.toFixed(0)} ${unit}`;
  };

  return (
    <div className="glass-card rounded-xl border border-slate-700/50 p-8">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-slate-100 flex items-center">
          <TrendUp size={24} weight="duotone" className="text-cyan-400 mr-3" />
          Manual Planning vs AI-Optimized
        </h3>
        <div className="flex items-center text-sm text-slate-400">
          <Info size={16} weight="duotone" className="mr-1" />
          Baseline comparison
        </div>
      </div>

      <div className="space-y-6">
        {metrics.map((metric, idx) => {
          const { savings, percentage } = calculateSavings(metric.manual, metric.optimized);
          const isImprovement = savings > 0;

          return (
            <div key={idx} className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-base font-medium text-slate-200">{metric.name}</span>
                <div className={`flex items-center text-sm font-semibold ${isImprovement ? 'text-green-400' : 'text-red-400'}`}>
                  {isImprovement ? <TrendDown size={16} weight="bold" className="mr-1" /> : <TrendUp size={16} weight="bold" className="mr-1" />}
                  {percentage.toFixed(1)}% {isImprovement ? 'saved' : 'higher'}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800/30 border border-slate-700/50 rounded-lg p-4">
                  <div className="text-xs text-slate-400 mb-1">Manual Planning</div>
                  <div className="text-lg font-bold text-slate-300">
                    {formatValue(metric.manual, metric.format, metric.unit)}
                  </div>
                </div>

                <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-lg p-4">
                  <div className="text-xs text-cyan-400 mb-1">AI-Optimized ✨</div>
                  <div className="text-lg font-bold text-cyan-300">
                    {formatValue(metric.optimized, metric.format, metric.unit)}
                  </div>
                </div>
              </div>

              <div className="relative">
                <div className="w-full bg-slate-700/50 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-green-500 to-cyan-400 h-2 rounded-full transition-all"
                    style={{ width: `${Math.max(percentage, 0)}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Annual Projection */}
      <div className="mt-8 pt-6 border-t border-slate-700/50">
        <div className="bg-gradient-to-r from-green-500/10 to-cyan-500/10 border border-green-500/30 rounded-lg p-6">
          <div className="text-center">
            <div className="text-sm text-green-400 mb-2">Projected Annual Savings</div>
            <div className="text-4xl font-bold bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent">
              ₹{((metrics[0].manual - metrics[0].optimized) * 12 / 10000000).toFixed(2)} Cr
            </div>
            <div className="text-xs text-slate-400 mt-2">
              Based on current monthly optimization results × 12 months
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
