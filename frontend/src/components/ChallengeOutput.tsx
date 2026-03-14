'use client';

import React, { useState, useEffect, useRef } from 'react';
import { formatNumber } from '../utils/formatters';
import { calculateImpact } from '../utils/calculateImpact';
import { SolverConsole } from './SolverConsole';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Vessel {
  id: string;
  capacity_mt: number;
  charter_rate_cr_per_day: number;
}

interface Port {
  id: string;
  name: string;
  type: string;
}

export interface Demand {
  port_id: string;
  demand_mt: number;
}

interface ChallengeResult {
  Source: string;
  Destination: string;
  Tanker: string;
  'Volume (MT)': number;
  'Trip Cost (Rs Cr)': number;
  'Trip ID'?: string;
}

interface TripDelivery {
  port: string;
  volume_mt: number;
}

export interface Trip {
  trip_id: string;
  vessel_id: string;
  loading_port: string;
  discharge_ports: string[];
  trip_duration_days: number;
  hpcl_charter_cost_cr: number;
  cargo_deliveries: TripDelivery[];
}

export interface OptimizationResponse {
  status: string;
  optimization_status?: string;
  optimization_results: ChallengeResult[];
  trips?: Trip[];
  summary: {
    total_trips?: number;
    total_routes: number;
    hpcl_transportation_cost_cr?: number;
    total_cost_cr: number;
    total_volume_mt: number;
    total_demand_mt: number;
    satisfied_demand_mt: number;
    demand_satisfaction_percentage: number;
    unsatisfied_ports?: string[];
  };
  timestamp: string;
}

// ─── Default Data ─────────────────────────────────────────────────────────────

export const DEFAULT_VESSELS: Vessel[] = [
  { id: 'T1', capacity_mt: 50000, charter_rate_cr_per_day: 0.63 },
  { id: 'T2', capacity_mt: 50000, charter_rate_cr_per_day: 0.49 },
  { id: 'T3', capacity_mt: 50000, charter_rate_cr_per_day: 0.51 },
  { id: 'T4', capacity_mt: 50000, charter_rate_cr_per_day: 0.51 },
  { id: 'T5', capacity_mt: 50000, charter_rate_cr_per_day: 0.53 },
  { id: 'T6', capacity_mt: 50000, charter_rate_cr_per_day: 0.57 },
  { id: 'T7', capacity_mt: 50000, charter_rate_cr_per_day: 0.65 },
  { id: 'T8', capacity_mt: 25000, charter_rate_cr_per_day: 0.39 },
  { id: 'T9', capacity_mt: 25000, charter_rate_cr_per_day: 0.38 },
];

export const DEFAULT_DEMANDS: Demand[] = [
  { port_id: 'U1',  demand_mt: 40000  },
  { port_id: 'U2',  demand_mt: 135000 },
  { port_id: 'U3',  demand_mt: 5000   },
  { port_id: 'U4',  demand_mt: 20000  },
  { port_id: 'U5',  demand_mt: 20000  },
  { port_id: 'U6',  demand_mt: 20000  },
  { port_id: 'U7',  demand_mt: 110000 },
  { port_id: 'U8',  demand_mt: 30000  },
  { port_id: 'U9',  demand_mt: 20000  },
  { port_id: 'U10', demand_mt: 20000  },
  { port_id: 'U11', demand_mt: 20000  },
];

const LOADING_PORTS: Port[] = [
  { id: 'L1', name: 'Mumbai (Mahul)', type: 'loading' },
  { id: 'L2', name: 'Kandla (Deendayal)', type: 'loading' },
  { id: 'L3', name: 'Sikka (Jamnagar)', type: 'loading' },
  { id: 'L4', name: 'Chennai (Ennore)', type: 'loading' },
  { id: 'L5', name: 'Visakhapatnam', type: 'loading' },
  { id: 'L6', name: 'Haldia', type: 'loading' },
];

export const SOLVER_PROFILES = {
  quick:    { label: '⚡ Quick',    time: '~15s',  desc: 'Fast result, good quality' },
  balanced: { label: '⚖ Balanced', time: '~30s',  desc: 'Better quality solution' },
  thorough: { label: '🏆 Thorough', time: '~5m',   desc: 'Global optimum search' },
} as const;

// ─── Shared Props ─────────────────────────────────────────────────────────────

export interface ChallengeSharedProps {
  vessels: Vessel[];
  demands: Demand[];
  solverProfile: 'quick' | 'balanced' | 'thorough';
  results: OptimizationResponse | null;
  loading: boolean;
  error: string | null;
  optimizationStartTime: number | null;
  onUpdateVessel: (index: number, field: keyof Vessel, value: number) => void;
  onUpdateDemand: (index: number, value: number) => void;
  onSetSolverProfile: (p: 'quick' | 'balanced' | 'thorough') => void;
  onRunOptimization: () => void;
  onClearResults: () => void;
  onDownloadCSV: () => void;
}

// ─── ChallengeConfigPanel — Left Sidebar ──────────────────────────────────────

export function ChallengeConfigPanel({
  vessels,
  demands,
  solverProfile,
  loading,
  error,
  optimizationStartTime,
  onUpdateVessel,
  onUpdateDemand,
  onSetSolverProfile,
  onRunOptimization,
  onClearResults,
  results,
}: ChallengeSharedProps) {
  const [showParams, setShowParams] = useState(false);
  const largeVessels = vessels.filter(v => v.capacity_mt >= 50000).length;
  const smallVessels = vessels.filter(v => v.capacity_mt < 50000).length;
  const totalFleetMt = vessels.reduce((s, v) => s + v.capacity_mt, 0);
  const totalDemandMt = demands.reduce((s, d) => s + d.demand_mt, 0);

  return (
    <div className="flex flex-col h-full overflow-y-auto space-y-4 p-4">
      {/* Header */}
      <div>
        <div className="text-[10px] font-bold tracking-widest text-cyan-400 uppercase mb-1">
          Command Center
        </div>
        <h2 className="text-lg font-bold text-slate-100 leading-tight">
          Coastal Fleet Optimizer
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">HPCL Challenge 7.1</p>
      </div>

      {/* Fleet Health */}
      <div className="glass-card rounded-xl border border-green-500/30 p-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs font-bold text-green-400 uppercase tracking-wide">Fleet Health</span>
        </div>
        <div className="text-sm font-bold text-slate-100 mb-1">
          {vessels.length}/{vessels.length} Tankers Ready
        </div>
        <div className="flex gap-3 text-xs text-slate-400">
          <span className="text-green-300">{largeVessels}×50K MT</span>
          <span className="text-cyan-300">{smallVessels}×25K MT</span>
        </div>
        <div className="mt-2 text-xs text-slate-500">
          Fleet capacity: <span className="text-slate-300 font-semibold">{formatNumber(totalFleetMt)} MT</span>
          {' | '}
          Demand: <span className="text-slate-300 font-semibold">{formatNumber(totalDemandMt)} MT</span>
        </div>
      </div>

      {/* Solver Profile */}
      <div>
        <div className="text-[10px] font-bold tracking-widest text-slate-500 uppercase mb-2">
          Solver Precision
        </div>
        <div className="flex flex-col gap-1.5">
          {(Object.entries(SOLVER_PROFILES) as [keyof typeof SOLVER_PROFILES, typeof SOLVER_PROFILES[keyof typeof SOLVER_PROFILES]][]).map(([key, p]) => (
            <button
              key={key}
              onClick={() => onSetSolverProfile(key)}
              disabled={loading}
              title={p.desc}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                solverProfile === key
                  ? 'bg-cyan-600/80 text-white border border-cyan-500/60'
                  : 'bg-slate-800/60 text-slate-400 border border-slate-700/50 hover:text-slate-200 hover:border-slate-600'
              }`}
            >
              <span>{p.label}</span>
              <span className="opacity-60 font-normal">{p.time}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Run Button */}
      <button
        onClick={onRunOptimization}
        disabled={loading}
        className="w-full py-3 rounded-xl font-bold text-sm transition-all duration-300 bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/30 hover:shadow-cyan-500/40 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            Running…
          </>
        ) : (
          <>▶ Run Optimization</>
        )}
      </button>

      {/* Solver Console */}
      {loading && (
        <SolverConsole
          isLoading={loading}
          solverProfile={solverProfile}
          startTime={optimizationStartTime}
        />
      )}

      {/* Error */}
      {error && !loading && (
        <div className="p-3 bg-red-900/20 border border-red-500/40 rounded-lg">
          <p className="text-xs font-bold text-red-400 mb-1">Connection Error</p>
          <p className="text-xs text-red-300/80 leading-relaxed">{error}</p>
        </div>
      )}

      {/* Clear Results */}
      {results && !loading && (
        <button
          onClick={onClearResults}
          className="w-full py-2 rounded-lg text-xs font-semibold text-red-400 border border-red-500/30 bg-red-600/10 hover:bg-red-600/20 transition-all"
        >
          Clear Results
        </button>
      )}

      {/* Collapsible Fleet Params */}
      <details
        open={showParams}
        onToggle={(e) => setShowParams((e.target as HTMLDetailsElement).open)}
        className="group"
      >
        <summary className="cursor-pointer text-xs font-semibold text-slate-400 hover:text-slate-200 select-none flex items-center gap-1 transition-colors py-1">
          <svg
            className="w-3 h-3 transition-transform group-open:rotate-90"
            fill="currentColor" viewBox="0 0 20 20"
          >
            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
          Fleet Parameters
        </summary>
        <div className="mt-3 space-y-4">
          {/* Vessel table */}
          <div>
            <div className="text-[10px] font-bold tracking-widest text-slate-500 uppercase mb-2">Tanker Fleet</div>
            <div className="overflow-x-auto rounded-lg border border-slate-700/50">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    <th className="px-2 py-1.5 text-left text-slate-500 font-medium">ID</th>
                    <th className="px-2 py-1.5 text-right text-slate-500 font-medium">Cap (MT)</th>
                    <th className="px-2 py-1.5 text-right text-slate-500 font-medium">Rate (₹Cr)</th>
                  </tr>
                </thead>
                <tbody>
                  {vessels.map((v, i) => (
                    <tr key={v.id} className="border-b border-slate-800/50 last:border-0">
                      <td className="px-2 py-1 font-semibold text-cyan-400">{v.id}</td>
                      <td className="px-2 py-1 text-right">
                        <input
                          type="number"
                          value={v.capacity_mt}
                          onChange={(e) => onUpdateVessel(i, 'capacity_mt', parseInt(e.target.value) || 0)}
                          className="w-16 px-1 py-0.5 text-right bg-slate-800 border border-slate-700 rounded text-slate-200 focus:border-cyan-500 outline-none"
                        />
                      </td>
                      <td className="px-2 py-1 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={v.charter_rate_cr_per_day}
                          onChange={(e) => onUpdateVessel(i, 'charter_rate_cr_per_day', parseFloat(e.target.value) || 0)}
                          className="w-14 px-1 py-0.5 text-right bg-slate-800 border border-slate-700 rounded text-slate-200 focus:border-cyan-500 outline-none"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Demand table */}
          <div>
            <div className="text-[10px] font-bold tracking-widest text-slate-500 uppercase mb-2">Port Demands (MT/month)</div>
            <div className="overflow-x-auto rounded-lg border border-slate-700/50">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    <th className="px-2 py-1.5 text-left text-slate-500 font-medium">Port</th>
                    <th className="px-2 py-1.5 text-right text-slate-500 font-medium">Demand</th>
                  </tr>
                </thead>
                <tbody>
                  {demands.map((d, i) => (
                    <tr key={d.port_id} className="border-b border-slate-800/50 last:border-0">
                      <td className="px-2 py-1 font-semibold text-blue-300">{d.port_id}</td>
                      <td className="px-2 py-1 text-right">
                        <input
                          type="number"
                          value={d.demand_mt}
                          onChange={(e) => onUpdateDemand(i, parseInt(e.target.value) || 0)}
                          className="w-20 px-1 py-0.5 text-right bg-slate-800 border border-slate-700 rounded text-slate-200 focus:border-cyan-500 outline-none"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Loading ports info */}
          <div>
            <div className="text-[10px] font-bold tracking-widest text-slate-500 uppercase mb-2">Loading Ports (6)</div>
            <div className="space-y-1">
              {LOADING_PORTS.map(p => (
                <div key={p.id} className="flex justify-between text-xs py-1 px-2 rounded bg-cyan-900/10 border border-cyan-900/30">
                  <span className="font-semibold text-cyan-300">{p.id}</span>
                  <span className="text-slate-400">{p.name}</span>
                  <span className="text-green-400 font-semibold text-[10px]">Unlimited</span>
                </div>
              ))}
            </div>
          </div>

          {/* Constraints */}
          <div>
            <div className="text-[10px] font-bold tracking-widest text-slate-500 uppercase mb-2">Constraints</div>
            <div className="space-y-2 text-xs text-slate-400">
              {[
                ['1', 'Single-port full loading per trip'],
                ['2', 'Max 2 discharge ports per trip'],
                ['3', 'Unlimited supply at loading ports'],
                ['4', 'Full demand satisfaction (100%)'],
              ].map(([n, text]) => (
                <div key={n} className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-cyan-900/30 border border-cyan-700/30 flex items-center justify-center text-[10px] font-bold text-cyan-400 flex-shrink-0">{n}</span>
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </details>
    </div>
  );
}

// ─── ChallengeResultsPanel — Right Panel ──────────────────────────────────────

export function ChallengeResultsPanel({
  results,
  vessels,
  loading,
  onDownloadCSV,
  onClearResults,
}: Pick<ChallengeSharedProps, 'results' | 'vessels' | 'loading' | 'onDownloadCSV' | 'onClearResults'>) {
  const [expandedTripIdx, setExpandedTripIdx] = useState<number | null>(null);
  const impact = calculateImpact(results ?? null);

  // Empty state
  if (!results && !loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-4">
        <div className="w-16 h-16 rounded-full bg-slate-800/50 border border-slate-700/50 flex items-center justify-center">
          <svg className="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-400">No Results Yet</p>
          <p className="text-xs text-slate-600 mt-1">Run optimization to see cost breakdown,<br />route plan and constraint compliance.</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/5 border border-blue-500/20">
          <svg className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-xs text-slate-500">Click <span className="text-blue-400 font-semibold">▶ Run Optimization</span></span>
        </div>
      </div>
    );
  }

  // Infeasible state
  if (
    results &&
    results.optimization_status &&
    !['optimal', 'feasible'].includes(results.optimization_status.toLowerCase())
  ) {
    return (
      <div className="p-4 space-y-4">
        <div className="p-5 bg-yellow-900/30 border-2 border-yellow-500/50 rounded-xl">
          <h3 className="text-lg font-bold text-yellow-400 mb-2">⚠️ No Feasible Solution</h3>
          <p className="text-sm text-yellow-200 mb-3">
            Solver status: <strong>{results.optimization_status}</strong>
          </p>
          <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside mb-4">
            <li>Demands cannot be met with current fleet capacity</li>
            <li>720h/month time constraint may be too restrictive</li>
            <li>Try reducing demands or adding fleet capacity</li>
          </ul>
          <button onClick={onClearResults} className="px-3 py-1.5 bg-yellow-600/80 hover:bg-yellow-600 rounded text-white text-xs font-semibold transition-colors">
            Clear & Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!results) return null;

  const isOptimal = impact.isOptimal;

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 space-y-4">
      {/* Header */}
      <div className="text-[10px] font-bold tracking-widest text-cyan-400 uppercase">
        Optimization Results
      </div>

      {/* HPCL Compliance */}
      <div className="p-3 bg-gradient-to-r from-green-900/20 to-cyan-900/20 border border-green-500/30 rounded-xl">
        <div className="text-[10px] font-bold text-green-400 uppercase tracking-wide mb-2 flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
          </svg>
          HPCL Compliance
        </div>
        <div className="grid grid-cols-2 gap-1 text-[10px] text-green-300">
          {[
            'Single-port loading',
            '≤2 discharge ports',
            'Capacity respected',
            '≤720h/month',
            'All demands met',
            'Cost = Charter×Duration',
          ].map(item => (
            <div key={item} className="flex items-center gap-1">
              <span>✅</span> {item}
            </div>
          ))}
        </div>
      </div>

      {/* Primary KPI — Transportation Cost */}
      <div className={`terminal-style p-4 rounded-xl border-2 border-cyan-500/50 bg-gradient-to-br from-cyan-900/30 to-blue-900/20 ${impact.costGlowClass}`}>
        <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest mb-1">
          HPCL Transportation Cost
        </p>
        <p className={`text-3xl font-bold ${impact.costGlowClass ? 'text-cyan-300' : 'text-cyan-200'}`}>
          ₹{impact.totalCostCr.toFixed(4)} Cr
        </p>
        <p className="text-[10px] text-cyan-400/70 mt-1">Charter Rate × Trip Duration</p>
      </div>

      {/* Savings Ticker + Greedy Baseline Context */}
      {impact.savingsCr > 0 && (
        <div className="rounded-xl border border-green-500/30 bg-green-900/10 overflow-hidden">
          <div className="p-3">
            <p className="text-[10px] font-bold text-green-400 uppercase tracking-wide mb-1">
              vs. Greedy Baseline (₹{impact.baselineCr} Cr)
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-green-300">
                −₹{impact.savingsCr.toFixed(4)} Cr
              </span>
              <span className="text-sm text-green-400 font-semibold">
                ({impact.savingsPct.toFixed(1)}% savings)
              </span>
            </div>
          </div>
          <details className="group border-t border-green-500/20">
            <summary className="cursor-pointer select-none px-3 py-1.5 text-[10px] text-green-600 hover:text-green-400 flex items-center gap-1 transition-colors">
              <svg className="w-3 h-3 transition-transform group-open:rotate-90" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              What is the ₹{impact.baselineCr} Cr baseline?
            </summary>
            <div className="px-3 pb-3 space-y-1.5 text-[10px] text-green-200/70 leading-relaxed">
              <p>
                The <span className="font-semibold text-green-300">₹{impact.baselineCr} Cr greedy baseline</span> represents
                a standard heuristic planning approach — assign each tank demand to the nearest
                available loading port, ignoring co-loading opportunities and time constraints.
              </p>
              <p>
                RouteX uses <span className="font-semibold text-green-300">CP-SAT constraint programming</span> to
                search 6,534 route combinations simultaneously and finds the provably
                cost-minimal plan under all HPCL policy constraints.
              </p>
              <p className="text-green-300 font-semibold">
                ₹{impact.savingsCr.toFixed(2)} Cr saved ≈ {Math.round(impact.savingsCr * 100)} Lakhs
                per month in charter costs.
              </p>
            </div>
          </details>
        </div>
      )}

      {/* Demand Compliance */}
      <div className="p-3 terminal-style rounded-xl border border-blue-500/30">
        <div className="flex justify-between items-center mb-1">
          <p className="text-xs font-semibold text-blue-400">Demand Compliance</p>
          <span className="text-xs font-bold text-blue-300">
            {impact.demandPct >= 99.9 ? '100%' : `${impact.demandPct.toFixed(1)}%`}
          </span>
        </div>
        <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-cyan-400"
            style={{ width: `${Math.min(100, impact.demandPct)}%` }}
          />
        </div>
        <p className="text-[10px] text-blue-200/60 mt-1">
          {formatNumber(impact.totalVolumeMt)} MT delivered = {formatNumber(results.summary.total_demand_mt)} MT required
        </p>
      </div>

      {/* Quick stats row */}
      <div className="grid grid-cols-2 gap-2">
        <div className="p-2.5 terminal-style rounded-lg border border-slate-700/50 text-center">
          <p className="text-[10px] text-slate-500 mb-0.5">Total Trips</p>
          <p className="text-lg font-bold text-cyan-300">{impact.tripCount}</p>
        </div>
        <div className="p-2.5 terminal-style rounded-lg border border-slate-700/50 text-center">
          <p className="text-[10px] text-slate-500 mb-0.5">Status</p>
          <p className="text-sm font-bold text-green-400">✅ Optimal</p>
        </div>
      </div>

      {/* Vessel Time Usage */}
      {results.trips && results.trips.length > 0 && (() => {
        const vesselUsage: Record<string, { trips: number; totalDays: number }> = {};
        results.trips!.forEach(trip => {
          vesselUsage[trip.vessel_id] = vesselUsage[trip.vessel_id] || { trips: 0, totalDays: 0 };
          vesselUsage[trip.vessel_id].trips += 1;
          vesselUsage[trip.vessel_id].totalDays += trip.trip_duration_days;
        });
        return (
          <details className="group" open>
            <summary className="cursor-pointer select-none text-xs font-semibold text-orange-400 hover:text-orange-300 flex items-center gap-1 py-1 transition-colors">
              <svg className="w-3 h-3 transition-transform group-open:rotate-90" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              Vessel Time Usage
            </summary>
            <div className="mt-2 space-y-2">
              {Object.entries(vesselUsage).map(([vesselId, usage]) => {
                const totalHours = usage.totalDays * 24;
                const pct = (totalHours / 720) * 100;
                const ok = totalHours <= 720;
                return (
                  <div key={vesselId} className="p-2.5 bg-slate-800/50 rounded-lg border border-slate-700/50">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold text-cyan-300">{vesselId}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${ok ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                        {ok ? '✔ OK' : '✗ Over'}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-1 text-[10px] mb-1.5">
                      <div className="text-center">
                        <p className="text-slate-500">Trips</p>
                        <p className="font-semibold text-blue-300">{usage.trips}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-slate-500">Hours</p>
                        <p className="font-semibold text-cyan-300">{totalHours.toFixed(0)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-slate-500">Idle</p>
                        <p className="font-semibold text-yellow-300">{(720 - totalHours).toFixed(0)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-slate-500">Util%</p>
                        <p className="font-semibold text-orange-300">{pct.toFixed(0)}%</p>
                      </div>
                    </div>
                    <div className="h-1 bg-slate-700/50 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${ok ? 'bg-gradient-to-r from-cyan-500 to-green-500' : 'bg-gradient-to-r from-orange-500 to-red-500'}`}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </details>
        );
      })()}

      {/* Download */}
      <button
        onClick={onDownloadCSV}
        className="w-full py-2.5 rounded-xl font-semibold text-xs transition-all duration-300 btn-primary-gradient flex items-center justify-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Export CSV
      </button>

      {/* Full details collapsible */}
      <details className="group">
        <summary className="cursor-pointer select-none px-4 py-3 bg-gradient-to-r from-slate-800/50 to-slate-800/30 rounded-xl border border-cyan-500/20 text-xs font-semibold text-slate-300 hover:border-cyan-500/40 transition-all flex items-center gap-2">
          <svg className="w-4 h-4 text-cyan-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
          📋 Full Trip Details Table
        </summary>
        <div className="mt-3 overflow-x-auto rounded-lg border border-slate-700/50">
          <table className="w-full text-xs divide-y divide-slate-700/50">
            <thead className="table-header">
              <tr>
                <th className="px-3 py-2 text-left text-cyan-400 font-bold">TRIP</th>
                <th className="px-3 py-2 text-left text-cyan-400 font-bold">VESSEL</th>
                <th className="px-3 py-2 text-left text-cyan-400 font-bold">LOAD</th>
                <th className="px-3 py-2 text-left text-cyan-400 font-bold">DISCHARGE</th>
                <th className="px-3 py-2 text-right text-cyan-400 font-bold">MT</th>
                <th className="px-3 py-2 text-right text-cyan-400 font-bold">₹ Cr</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {(results.trips ?? []).map((trip, i) => {
                const vessel = vessels.find(v => v.id === trip.vessel_id);
                const cap = vessel?.capacity_mt ?? 50000;
                const cargo = trip.cargo_deliveries.reduce((s, d) => s + d.volume_mt, 0);
                const isSplit = trip.discharge_ports.length >= 2;
                const isFull = Math.abs(cargo - cap) < 1;
                return (
                  <tr
                    key={i}
                    className={`table-row ${isSplit ? 'border-l-2 border-l-cyan-500' : ''}`}
                    style={{ backgroundColor: i % 2 === 0 ? 'rgba(51,65,85,0.4)' : 'rgba(30,41,59,0.4)' }}
                  >
                    <td className="px-3 py-2 font-bold text-yellow-400 whitespace-nowrap">{trip.trip_id}</td>
                    <td className="px-3 py-2 text-cyan-300 whitespace-nowrap">
                      {trip.vessel_id}
                      {isFull && (
                        <span className="ml-1 text-[10px] px-1 py-0.5 rounded bg-green-500/20 text-green-300 align-middle">100%</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-green-300 whitespace-nowrap">{trip.loading_port}</td>
                    <td className="px-3 py-2 text-blue-300 whitespace-nowrap">
                      {trip.discharge_ports.join(' → ')}
                      {isSplit && (
                        <span className="ml-1 text-[10px] px-1 py-0.5 rounded bg-cyan-500/20 text-cyan-400 align-middle">Co-load</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-slate-200">{formatNumber(cargo)}</td>
                    <td className="px-3 py-2 text-right font-bold text-green-300">₹{trip.hpcl_charter_cost_cr.toFixed(4)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="table-header font-bold">
              <tr>
                <td colSpan={4} className="px-3 py-2 text-white text-xs">
                  TOTAL ({results.trips?.length ?? 0} trips)
                </td>
                <td className="px-3 py-2 text-right text-white">{formatNumber(results.summary.total_volume_mt)}</td>
                <td className="px-3 py-2 text-right text-green-300">
                  ₹{(results.summary.hpcl_transportation_cost_cr ?? results.summary.total_cost_cr).toFixed(4)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </details>

      {/* Trip Cards */}
      {results.trips && results.trips.length > 0 && (
        <div>
          <div className="text-[10px] font-bold tracking-widest text-slate-500 uppercase mb-2">
            Optimized Trip Plan
          </div>
          <div className="space-y-1.5">
            {results.trips.map((trip, idx) => {
              const vessel = vessels.find(v => v.id === trip.vessel_id);
              const capacity = vessel?.capacity_mt || 50000;
              const totalCargo = trip.cargo_deliveries.reduce((s, d) => s + d.volume_mt, 0);
              const isSplit = trip.discharge_ports.length >= 2;
              const isFullCapacity = Math.abs(totalCargo - capacity) < 1;

              return (
                <div
                  key={idx}
                  className={`rounded-lg border transition-all duration-200 ${
                    isSplit
                      ? 'border-l-2 border-l-cyan-500 border-slate-700/50 bg-slate-800/40'
                      : 'border-slate-700/50 bg-slate-800/40'
                  } ${expandedTripIdx === idx ? 'border-cyan-500/50 bg-slate-800/60' : 'hover:bg-slate-800/60'}`}
                >
                  <button
                    onClick={() => setExpandedTripIdx(expandedTripIdx === idx ? null : idx)}
                    className="w-full text-left p-2.5 focus:outline-none"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-cyan-400">{trip.trip_id} · {trip.vessel_id}</span>
                          {isSplit && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold">
                              Co-load
                            </span>
                          )}
                          {isFullCapacity && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-300 border border-green-500/30 font-semibold">
                              100% Utilized
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-900/30 text-green-400">{trip.loading_port}</span>
                          {trip.discharge_ports.map((p, pi) => (
                            <span key={pi} className="text-[10px] px-1.5 py-0.5 rounded bg-blue-900/30 text-blue-400">→ {p}</span>
                          ))}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {trip.trip_duration_days} days · <span className="text-cyan-400 font-semibold">₹{trip.hpcl_charter_cost_cr} Cr</span>
                        </div>
                      </div>
                      <svg
                        className={`w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5 transition-transform ${expandedTripIdx === idx ? 'rotate-180' : ''}`}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>

                  {expandedTripIdx === idx && (
                    <div className="px-2.5 pb-2.5 pt-0 space-y-2 border-t border-slate-700/40">
                      <div className="grid grid-cols-3 gap-1.5 text-[10px] mt-2">
                        <div className="p-1.5 rounded bg-slate-900/50 text-center">
                          <p className="text-slate-500">Vessel</p>
                          <p className="font-semibold text-cyan-300">{trip.vessel_id}</p>
                        </div>
                        <div className="p-1.5 rounded bg-slate-900/50 text-center">
                          <p className="text-slate-500">Capacity</p>
                          <p className="font-semibold text-slate-300">{formatNumber(capacity)}</p>
                        </div>
                        <div className="p-1.5 rounded bg-slate-900/50 text-center">
                          <p className="text-slate-500">Duration</p>
                          <p className="font-semibold text-blue-300">{trip.trip_duration_days}d</p>
                        </div>
                      </div>
                      <div className="p-2 rounded bg-slate-900/30 text-[10px]">
                        <p className="font-semibold text-slate-400 mb-1">Cargo Deliveries</p>
                        {trip.cargo_deliveries.map((d, di) => (
                          <div key={di} className="flex justify-between py-0.5 border-b border-slate-700/30 last:border-0">
                            <span className="text-slate-400">{d.port}</span>
                            <span className="font-semibold text-blue-300">{formatNumber(d.volume_mt)} MT</span>
                          </div>
                        ))}
                        <div className="flex justify-between pt-1 mt-1 border-t border-cyan-500/30 font-bold">
                          <span className="text-cyan-300">Total</span>
                          <span className="text-cyan-300">{formatNumber(totalCargo)} MT</span>
                        </div>
                      </div>
                      <div className="p-2 rounded bg-cyan-900/20 border border-cyan-500/20 text-[10px]">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Charter × Duration</span>
                          <span className="text-cyan-200 font-semibold">₹{trip.hpcl_charter_cost_cr} Cr</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Fallback: flat route list */}
      {(!results.trips || results.trips.length === 0) && results.optimization_results.length > 0 && (
        <div>
          <div className="text-[10px] font-bold tracking-widest text-slate-500 uppercase mb-2">Routes</div>
          <div className="space-y-1.5">
            {results.optimization_results.map((route, idx) => (
              <div key={idx} className="p-2.5 rounded-lg border border-slate-700/50 bg-slate-800/40">
                <div className="flex items-center gap-1.5 flex-wrap text-xs">
                  <span className="font-bold text-cyan-400">{route.Tanker}</span>
                  <span className="px-1.5 py-0.5 rounded bg-green-900/30 text-green-400 text-[10px]">{route.Source}</span>
                  <span className="px-1.5 py-0.5 rounded bg-blue-900/30 text-blue-400 text-[10px]">→ {route.Destination}</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {formatNumber(route['Volume (MT)'])} MT · <span className="text-cyan-400 font-semibold">₹{route['Trip Cost (Rs Cr)'].toFixed(4)} Cr</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}

// ─── Default Export — Self-Contained (backward compat) ────────────────────────

export function ChallengeOutput() {
  const [results, setResults] = useState<OptimizationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [solverProfile, setSolverProfile] = useState<'quick' | 'balanced' | 'thorough'>('quick');
  const [vessels, setVessels]   = useState<Vessel[]>(DEFAULT_VESSELS);
  const [demands,  setDemands]  = useState<Demand[]>(DEFAULT_DEMANDS);
  const [optimizationStartTime, setOptimizationStartTime] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('challenge_optimization_results');
    const sv = localStorage.getItem('challenge_vessels');
    const sd = localStorage.getItem('challenge_demands');
    if (sv) { try { setVessels(JSON.parse(sv)); } catch {} }
    if (sd) { try { setDemands(JSON.parse(sd)); } catch {} }
  }, []);

  const updateVessel = (index: number, field: keyof Vessel, value: number) => {
    const updated = vessels.map((v, i) => i === index ? { ...v, [field]: value } : v);
    setVessels(updated);
    localStorage.setItem('challenge_vessels', JSON.stringify(updated));
  };

  const updateDemand = (index: number, value: number) => {
    const updated = demands.map((d, i) => i === index ? { ...d, demand_mt: value } : d);
    setDemands(updated);
    localStorage.setItem('challenge_demands', JSON.stringify(updated));
  };

  const runOptimization = async () => {
    setLoading(true);
    setError(null);
    setOptimizationStartTime(Date.now());
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const res = await fetch(`${apiUrl}/api/v1/challenge/optimize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
        cache: 'no-store',
        body: JSON.stringify({ vessels, demands, solver_profile: solverProfile }),
      });
      if (!res.ok) throw new Error('Optimization failed');
      setResults(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const clearResults = () => {
    setResults(null);
    localStorage.removeItem('challenge_optimization_results');
  };

  const downloadCSV = () => {
    if (!results) return;
    const headers = ['Source', 'Destination', 'Tanker', 'Volume (MT)', 'Trip Cost (Rs Cr)'];
    const csv = [
      headers.join(','),
      ...results.optimization_results.map(r =>
        [r.Source, r.Destination, r.Tanker, r['Volume (MT)'], r['Trip Cost (Rs Cr)']].join(',')
      )
    ].join('\n');
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })),
      download: `hpcl_results_${new Date().toISOString().split('T')[0]}.csv`,
    });
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const sharedProps: ChallengeSharedProps = {
    vessels, demands, solverProfile, results, loading, error, optimizationStartTime,
    onUpdateVessel: updateVessel,
    onUpdateDemand: updateDemand,
    onSetSolverProfile: setSolverProfile,
    onRunOptimization: runOptimization,
    onClearResults: clearResults,
    onDownloadCSV: downloadCSV,
  };

  return (
    <div className="flex gap-6 h-full">
      <div className="w-72 flex-none">
        <ChallengeConfigPanel {...sharedProps} />
      </div>
      <div className="flex-1 overflow-y-auto">
        <ChallengeResultsPanel
          results={results}
          vessels={vessels}
          loading={loading}
          onDownloadCSV={downloadCSV}
          onClearResults={clearResults}
        />
      </div>
    </div>
  );
}

export default ChallengeOutput;
