'use client';

import React, { useState } from 'react';
import { ClockCounterClockwise, Clock, ArrowCounterClockwise, Trash } from 'phosphor-react';

interface OptimizationRun {
  id: string;
  timestamp: string;
  params: Record<string, unknown>;
  summary: {
    total_cost: number;
    fleet_utilization: number;
    routes_count: number;
  };
  status: 'completed' | 'failed';
}

interface RunHistoryProps {
  onRevertToRun: (runId: string) => void;
  onDeleteRun: (runId: string) => void;
}

export function RunHistory({ onRevertToRun, onDeleteRun }: RunHistoryProps) {
  const [runs, setRuns] = useState<OptimizationRun[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  // Load run history from localStorage
  React.useEffect(() => {
    const savedRuns = localStorage.getItem('hpcl-optimization-history');
    if (savedRuns) {
      setRuns(JSON.parse(savedRuns));
    }
  }, []);

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-IN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleRevert = (runId: string) => {
    onRevertToRun(runId);
  };

  const handleDelete = (runId: string) => {
    const updated = runs.filter(r => r.id !== runId);
    setRuns(updated);
    localStorage.setItem('hpcl-optimization-history', JSON.stringify(updated));
    onDeleteRun(runId);
  };

  if (runs.length === 0) return null;

  return (
    <div className="glass-card rounded-xl border border-slate-700/50 p-6">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full text-left"
      >
        <div className="flex items-center space-x-3">
          <ClockCounterClockwise size={20} weight="duotone" className="text-cyan-400" />
          <h3 className="text-lg font-semibold text-slate-100">
            Optimization History ({runs.length})
          </h3>
        </div>
        <span className="text-slate-400">{isExpanded ? '−' : '+'}</span>
      </button>

      {isExpanded && (
        <div className="mt-6 space-y-3 max-h-96 overflow-y-auto">
          {runs.map((run) => (
            <div
              key={run.id}
              className="bg-slate-800/30 border border-slate-700/50 rounded-lg p-4 hover:bg-slate-800/50 transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <Clock size={16} weight="regular" className="text-slate-400" />
                    <span className="text-sm text-slate-400">
                      {formatDate(run.timestamp)}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 font-mono">
                    ID: {run.id.substring(0, 16)}...
                  </div>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => handleRevert(run.id)}
                    className="p-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-cyan-400 hover:bg-cyan-500/20 transition-all"
                    title="Revert to this run"
                  >
                    <ArrowCounterClockwise size={16} weight="bold" />
                  </button>
                  <button
                    onClick={() => handleDelete(run.id)}
                    className="p-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 hover:bg-red-500/20 transition-all"
                    title="Delete this run"
                  >
                    <Trash size={16} weight="bold" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-xs">
                <div>
                  <div className="text-slate-500 mb-1">Cost</div>
                  <div className="font-semibold text-slate-200">
                    ₹{(run.summary.total_cost / 10000000).toFixed(2)} Cr
                  </div>
                </div>
                <div>
                  <div className="text-slate-500 mb-1">Utilization</div>
                  <div className="font-semibold text-slate-200">
                    {run.summary.fleet_utilization.toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div className="text-slate-500 mb-1">Routes</div>
                  <div className="font-semibold text-slate-200">
                    {run.summary.routes_count}
                  </div>
                </div>
              </div>

              {run.params && (
                <div className="mt-3 pt-3 border-t border-slate-700/50 text-xs text-slate-400">
                  Objective: {run.params.optimize_for || 'cost'} | 
                  Vessels: {run.params.available_vessels?.length || 'all'}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
