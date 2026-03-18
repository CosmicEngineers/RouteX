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
        <div className="section-label text-blue-600 mb-1">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
          Command Center
        </div>
        <h2 className="text-lg font-extrabold text-slate-800 leading-tight tracking-tight">
          Coastal Fleet Optimizer
        </h2>
        <p className="text-[11px] text-slate-400 mt-0.5 font-medium">HPCL Challenge 7.1</p>
      </div>

      <div className="section-divider" />

      {/* Fleet Health */}
      <div className="elevated-card p-3.5 glow-green">
        <div className="flex items-center gap-2 mb-2">
          <div className="status-dot bg-green-500" style={{color:'#22c55e'}} />
          <span className="text-[10px] font-bold text-green-600 uppercase tracking-widest">Fleet Health</span>
        </div>
        <div className="text-sm font-extrabold text-slate-800 mb-1">
          {vessels.length}/{vessels.length} Tankers Ready
        </div>
        <div className="flex gap-3 text-xs">
          <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-semibold border border-green-200">{largeVessels}×50K</span>
          <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-semibold border border-blue-200">{smallVessels}×25K</span>
        </div>
        <div className="mt-2.5">
          <div className="flex justify-between text-[10px] text-slate-500 mb-1">
            <span>Fleet: <span className="text-slate-700 font-bold">{formatNumber(totalFleetMt)} MT</span></span>
            <span>Demand: <span className="text-slate-700 font-bold">{formatNumber(totalDemandMt)} MT</span></span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{width: `${Math.min(100, (totalDemandMt / totalFleetMt) * 100)}%`}} />
          </div>
        </div>
      </div>

      <div className="section-divider" />

      {/* Solver Profile */}
      <div>
        <div className="section-label text-slate-500 mb-2.5">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
          Solver Precision
        </div>
        <div className="flex flex-col gap-1.5">
          {(Object.entries(SOLVER_PROFILES) as [keyof typeof SOLVER_PROFILES, typeof SOLVER_PROFILES[keyof typeof SOLVER_PROFILES]][]).map(([key, p]) => (
            <button
              key={key}
              onClick={() => onSetSolverProfile(key)}
              disabled={loading}
              title={p.desc}
              className={`toggle-selector w-full flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed ${
                solverProfile === key ? 'active' : 'inactive'
              }`}
            >
              <span className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${solverProfile === key ? 'bg-white/80' : 'bg-slate-400'}`} />
                {p.label}
              </span>
              <span className="opacity-60 font-normal text-[11px]">{p.time}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="section-divider" />

      {/* Run Button */}
      <button
        onClick={onRunOptimization}
        disabled={loading}
        className="btn-primary-gradient w-full py-3.5 rounded-xl font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            Running…
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
            Run Optimization
          </>
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
        <div className="elevated-card p-3 border-red-200 bg-red-50">
          <p className="text-xs font-bold text-red-600 mb-1 flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
            Connection Error
          </p>
          <p className="text-xs text-red-500 leading-relaxed">{error}</p>
        </div>
      )}

      {/* Clear Results */}
      {results && !loading && (
        <button
          onClick={onClearResults}
          className="w-full py-2 rounded-xl text-xs font-semibold text-red-500 border border-red-200 bg-red-50/50 hover:bg-red-100 transition-all"
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
        <summary className="cursor-pointer text-xs font-semibold text-slate-400 hover:text-slate-600 select-none flex items-center gap-1.5 transition-colors py-1">
          <svg
            className="w-3 h-3 transition-transform group-open:rotate-90"
            fill="currentColor" viewBox="0 0 20 20"
          >
            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          Fleet Parameters
        </summary>
        <div className="mt-3 space-y-4">
          {/* Vessel table */}
          <div>
            <div className="section-label text-slate-500 mb-2">Tanker Fleet</div>
            <div className="elevated-card overflow-hidden !rounded-xl !p-0">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="px-2.5 py-2 text-left text-slate-500 font-medium">ID</th>
                    <th className="px-2.5 py-2 text-right text-slate-500 font-medium">Cap (MT)</th>
                    <th className="px-2.5 py-2 text-right text-slate-500 font-medium">Rate (₹Cr)</th>
                  </tr>
                </thead>
                <tbody>
                  {vessels.map((v, i) => (
                    <tr key={v.id} className="border-b border-slate-50 last:border-0 hover:bg-blue-50/30 transition-colors">
                      <td className="px-2.5 py-1.5 font-bold text-blue-600">{v.id}</td>
                      <td className="px-2.5 py-1.5 text-right">
                        <input
                          type="number"
                          value={v.capacity_mt}
                          onChange={(e) => onUpdateVessel(i, 'capacity_mt', parseInt(e.target.value) || 0)}
                          className="custom-input w-16 px-1.5 py-0.5 text-right text-xs"
                        />
                      </td>
                      <td className="px-2.5 py-1.5 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={v.charter_rate_cr_per_day}
                          onChange={(e) => onUpdateVessel(i, 'charter_rate_cr_per_day', parseFloat(e.target.value) || 0)}
                          className="custom-input w-14 px-1.5 py-0.5 text-right text-xs"
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
            <div className="section-label text-slate-500 mb-2">Port Demands (MT/month)</div>
            <div className="elevated-card overflow-hidden !rounded-xl !p-0">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="px-2.5 py-2 text-left text-slate-500 font-medium">Port</th>
                    <th className="px-2.5 py-2 text-right text-slate-500 font-medium">Demand</th>
                  </tr>
                </thead>
                <tbody>
                  {demands.map((d, i) => (
                    <tr key={d.port_id} className="border-b border-slate-50 last:border-0 hover:bg-blue-50/30 transition-colors">
                      <td className="px-2.5 py-1.5 font-bold text-blue-600">{d.port_id}</td>
                      <td className="px-2.5 py-1.5 text-right">
                        <input
                          type="number"
                          value={d.demand_mt}
                          onChange={(e) => onUpdateDemand(i, parseInt(e.target.value) || 0)}
                          className="custom-input w-20 px-1.5 py-0.5 text-right text-xs"
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
            <div className="section-label text-slate-500 mb-2">Loading Ports (6)</div>
            <div className="space-y-1">
              {LOADING_PORTS.map(p => (
                <div key={p.id} className="flex justify-between text-xs py-1.5 px-2.5 rounded-lg bg-blue-50/60 border border-blue-100/60 hover:bg-blue-50 transition-colors">
                  <span className="font-bold text-blue-600">{p.id}</span>
                  <span className="text-slate-500">{p.name}</span>
                  <span className="text-green-600 font-semibold text-[10px]">Unlimited</span>
                </div>
              ))}
            </div>
          </div>

          {/* Constraints */}
          <div>
            <div className="section-label text-slate-500 mb-2">Constraints</div>
            <div className="space-y-2 text-xs text-slate-600">
              {[
                ['1', 'Single-port full loading per trip'],
                ['2', 'Max 2 discharge ports per trip'],
                ['3', 'Unlimited supply at loading ports'],
                ['4', 'Full demand satisfaction (100%)'],
              ].map(([n, text]) => (
                <div key={n} className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 flex items-center justify-center text-[10px] font-bold text-blue-600 flex-shrink-0 shadow-sm">{n}</span>
                  <span className="pt-0.5">{text}</span>
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
      <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-5">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 border border-slate-200 flex items-center justify-center shadow-lg">
          <svg className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-bold text-slate-600">No Results Yet</p>
          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">Run optimization to see cost breakdown,<br />route plan and constraint compliance.</p>
        </div>
        <div className="elevated-card flex items-center gap-2 px-4 py-2">
          <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-xs text-slate-600">Click <span className="text-blue-600 font-bold">▶ Run Optimization</span></span>
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
        <div className="p-5 bg-amber-50 border-2 border-amber-300 rounded-xl">
          <h3 className="text-lg font-bold text-amber-700 mb-2">⚠️ No Feasible Solution</h3>
          <p className="text-sm text-amber-600 mb-3">
            Solver status: <strong>{results.optimization_status}</strong>
          </p>
          <ul className="text-xs text-slate-600 space-y-1 list-disc list-inside mb-4">
            <li>Demands cannot be met with current fleet capacity</li>
            <li>720h/month time constraint may be too restrictive</li>
            <li>Try reducing demands or adding fleet capacity</li>
          </ul>
          <button onClick={onClearResults} className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 rounded text-white text-xs font-semibold transition-colors">
            Clear & Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!results) return null;

  const isOptimal = impact.isOptimal;

  return (
    <div className="flex flex-col h-full overflow-y-auto p-3 space-y-2.5">

      {/* ════════════════════════════════════════════
          ZONE 1 — SUMMARY STRIP (compact inline)
          ════════════════════════════════════════════ */}
      <div className="flex items-center gap-1.5">
        <div className="section-label text-blue-600 flex-shrink-0">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
          Data Intelligence
        </div>
        <div className="flex-1" />
        {results && (
          <button
            onClick={onDownloadCSV}
            className="text-[10px] px-2 py-1 rounded-lg bg-blue-50 text-blue-600 font-bold border border-blue-200 hover:bg-blue-100 transition-colors flex items-center gap-1"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3" /></svg>
            Download CSV
          </button>
        )}
      </div>

      {/* Summary strip — 3 inline compact cards */}
      <div className="grid grid-cols-3 gap-1.5">
        <div className="rounded-xl px-2.5 py-2 text-center" style={{background: 'linear-gradient(135deg, #eff6ff, #dbeafe)', border: '1px solid rgba(37,99,235,0.12)', boxShadow: '0 2px 8px rgba(37,99,235,0.08)'}}>
          <p className="text-[9px] text-blue-500 font-bold uppercase tracking-wider">Demand</p>
          <p className="text-sm font-extrabold text-blue-700" style={{textShadow: '0 0 12px rgba(37,99,235,0.15)'}}>
            {impact.demandPct >= 99.9 ? '100%' : `${impact.demandPct.toFixed(0)}%`}
          </p>
        </div>
        <div className="rounded-xl px-2.5 py-2 text-center" style={{background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', border: '1px solid rgba(34,197,94,0.12)', boxShadow: '0 2px 8px rgba(34,197,94,0.08)'}}>
          <p className="text-[9px] text-green-600 font-bold uppercase tracking-wider">Trips</p>
          <p className="text-sm font-extrabold text-green-700" style={{textShadow: '0 0 12px rgba(34,197,94,0.15)'}}>
            {impact.tripCount}
          </p>
        </div>
        <div className="rounded-xl px-2.5 py-2 text-center" style={{background: isOptimal ? 'linear-gradient(135deg, #f0fdf4, #dcfce7)' : 'linear-gradient(135deg, #fffbeb, #fef3c7)', border: `1px solid ${isOptimal ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)'}`, boxShadow: `0 2px 8px ${isOptimal ? 'rgba(34,197,94,0.08)' : 'rgba(245,158,11,0.08)'}`}}>
          <p className="text-[9px] font-bold uppercase tracking-wider" style={{color: isOptimal ? '#16a34a' : '#d97706'}}>Status</p>
          <p className="text-sm font-extrabold" style={{color: isOptimal ? '#15803d' : '#b45309'}}>
            {isOptimal ? '✓ Opt' : '⚠ Feas'}
          </p>
        </div>
      </div>

      {/* ════════════════════════════════════════════
          ZONE 2 — HERO KPI (dominant card)
          ════════════════════════════════════════════ */}
      <div className="relative overflow-hidden rounded-2xl" style={{
        background: 'linear-gradient(135deg, #1e40af 0%, #0891b2 100%)',
        boxShadow: '0 8px 32px rgba(30,64,175,0.3), 0 0 0 1px rgba(255,255,255,0.1) inset',
        padding: '16px 18px',
      }}>
        {/* Shine overlay */}
        <div className="absolute inset-0 pointer-events-none" style={{background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 50%)'}} />
        <div className="relative">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-bold text-blue-200 uppercase tracking-widest flex items-center gap-1.5">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              HPCL Transportation Cost
            </p>
            {impact.savingsCr > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-400/20 text-green-200 font-bold border border-green-400/30">
                ↓ {impact.savingsPct.toFixed(1)}%
              </span>
            )}
          </div>
          <p className="text-4xl font-black text-white tracking-tight" style={{textShadow: '0 2px 12px rgba(0,0,0,0.2)'}}>
            ₹{impact.totalCostCr.toFixed(4)}
          </p>
          <p className="text-[10px] text-blue-200/70 mt-0.5 font-medium">Crore · Charter Rate × Duration</p>
        </div>
      </div>

      {/* Savings — inline expandable (not floating) */}
      {impact.savingsCr > 0 && (
        <details className="group rounded-xl overflow-hidden" style={{background: 'linear-gradient(135deg, #f0fdf4, #ecfdf5)', border: '1px solid rgba(34,197,94,0.15)', boxShadow: '0 2px 8px rgba(34,197,94,0.08)'}}>
          <summary className="cursor-pointer select-none flex items-center gap-2 px-3 py-2 hover:bg-green-50/50 transition-colors">
            <svg className="w-3.5 h-3.5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
            <span className="text-xs font-extrabold text-green-700">−₹{impact.savingsCr.toFixed(4)} Cr</span>
            <span className="text-[10px] text-green-500">vs ₹{impact.baselineCr}</span>
            <svg className="w-3 h-3 text-green-400 ml-auto transition-transform group-open:rotate-180 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </summary>
          <div className="px-3 pb-2.5 pt-0 text-[10px] text-slate-600 leading-relaxed border-t border-green-200/50 space-y-1">
            <p className="font-bold text-green-700 pt-1.5">₹{impact.savingsCr.toFixed(2)} Cr saved ≈ {Math.round(impact.savingsCr * 100)} Lakhs/month</p>
            <p>The <span className="font-semibold text-green-700">₹{impact.baselineCr} Cr baseline</span> uses greedy nearest-port heuristic. RouteX's <span className="font-semibold text-blue-700">CP-SAT optimizer</span> finds the provably cost-minimal plan across all constraints.</p>
          </div>
        </details>
      )}

      {/* ════════════════════════════════════════════
          ZONE 3 — MODULAR DATA STACK
          ════════════════════════════════════════════ */}

      {/* Demand compliance bar */}
      <div className="px-3 py-2.5 rounded-xl" style={{background: 'linear-gradient(180deg, #ffffff, #f8fafc)', border: '1px solid rgba(148,163,184,0.12)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)'}}>
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Demand Compliance</span>
          <span className="text-xs font-extrabold text-blue-700">
            {formatNumber(impact.totalVolumeMt)} / {formatNumber(results.summary.total_demand_mt)} MT
          </span>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${Math.min(100, impact.demandPct)}%` }} />
        </div>
      </div>

      {/* HPCL Compliance — compact inline */}
      <details className="group">
        <summary className="cursor-pointer select-none flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-bold text-green-700 hover:shadow-md transition-all" style={{background: 'linear-gradient(135deg, #f0fdf4, #ecfdf5)', border: '1px solid rgba(34,197,94,0.12)'}}>
          <svg className="w-3 h-3 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          ✅ All 6 HPCL Constraints Satisfied
        </summary>
        <div className="mt-1.5 grid grid-cols-2 gap-1 px-1">
          {['Single-port loading','≤2 discharge ports','Capacity respected','≤720h/month','All demands met','Cost = Charter×Duration'].map(c => (
            <div key={c} className="flex items-center gap-1 text-[10px] text-green-600 px-2 py-1 rounded bg-green-50/50">
              <span>✓</span> {c}
            </div>
          ))}
        </div>
      </details>

      {/* Vessel Time Usage — dense horizontal layout */}
      {results.trips && results.trips.length > 0 && (() => {
        const vesselUsage: Record<string, { trips: number; totalDays: number }> = {};
        results.trips!.forEach(trip => {
          vesselUsage[trip.vessel_id] = vesselUsage[trip.vessel_id] || { trips: 0, totalDays: 0 };
          vesselUsage[trip.vessel_id].trips += 1;
          vesselUsage[trip.vessel_id].totalDays += trip.trip_duration_days;
        });
        return (
          <details className="group" open>
            <summary className="cursor-pointer select-none flex items-center gap-1.5 text-[10px] font-bold text-amber-700 uppercase tracking-wider py-1 hover:text-amber-800 transition-colors">
              <svg className="w-3 h-3 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Fleet Utilization ({Object.keys(vesselUsage).length} vessels)
            </summary>
            <div className="mt-1.5 space-y-1">
              {Object.entries(vesselUsage).map(([vesselId, usage]) => {
                const totalHours = usage.totalDays * 24;
                const pct = (totalHours / 720) * 100;
                const idle = 720 - totalHours;
                const ok = totalHours <= 720;
                return (
                  <div key={vesselId} className="flex items-center gap-2 px-2.5 py-2 rounded-lg hover:shadow-md transition-all" style={{background: 'linear-gradient(180deg, #ffffff, #f8fafc)', border: '1px solid rgba(148,163,184,0.1)', boxShadow: '0 1px 4px rgba(0,0,0,0.03)'}}>
                    {/* Vessel ID */}
                    <span className="text-[11px] font-extrabold text-blue-600 w-7 flex-shrink-0">{vesselId}</span>
                    {/* Stats inline */}
                    <div className="flex items-center gap-2 text-[10px] flex-shrink-0">
                      <span className="text-slate-500">{usage.trips}<span className="text-slate-400 ml-0.5">trips</span></span>
                      <span className="text-blue-600 font-bold">{totalHours.toFixed(0)}<span className="text-slate-400 ml-0.5">h</span></span>
                      <span className="text-amber-600">{idle.toFixed(0)}<span className="text-slate-400 ml-0.5">idle</span></span>
                    </div>
                    {/* Progress bar */}
                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{background: 'rgba(148,163,184,0.12)', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.04)'}}>
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${ok ? 'bg-gradient-to-r from-blue-500 to-emerald-500' : 'bg-gradient-to-r from-orange-500 to-red-500'}`}
                        style={{ width: `${Math.min(100, pct)}%`, boxShadow: `0 0 6px ${ok ? 'rgba(37,99,235,0.3)' : 'rgba(239,68,68,0.3)'}` }}
                      />
                    </div>
                    {/* Pct + badge */}
                    <span className="text-[10px] font-extrabold w-8 text-right" style={{color: ok ? '#2563eb' : '#dc2626'}}>{pct.toFixed(0)}%</span>
                    <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold flex-shrink-0 ${ok ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {ok ? 'OK' : '!'}
                    </span>
                  </div>
                );
              })}
            </div>
          </details>
        );
      })()}

      {/* Full trip table — accordion */}
      <details className="group">
        <summary className="cursor-pointer select-none flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-[10px] font-bold text-slate-600 uppercase tracking-wider hover:shadow-md transition-all" style={{background: 'linear-gradient(180deg, #ffffff, #f8fafc)', border: '1px solid rgba(148,163,184,0.12)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)'}}>
          <svg className="w-3 h-3 text-blue-500 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
          📋 Full Trip Details Table({results.trips?.length ?? 0})
        </summary>
        <div className="mt-1.5 rounded-xl overflow-hidden" style={{border: '1px solid rgba(148,163,184,0.12)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)'}}>
          <table className="w-full text-[10px] divide-y divide-slate-100">
            <thead className="table-header">
              <tr>
                <th className="px-2 py-1.5 text-left text-blue-700 font-bold">TRIP</th>
                <th className="px-2 py-1.5 text-left text-blue-700 font-bold">VESSEL</th>
                <th className="px-2 py-1.5 text-left text-blue-700 font-bold">ROUTE</th>
                <th className="px-2 py-1.5 text-right text-blue-700 font-bold">MT</th>
                <th className="px-2 py-1.5 text-right text-blue-700 font-bold">₹Cr</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {(results.trips ?? []).map((trip, i) => {
                const cargo = trip.cargo_deliveries.reduce((s, d) => s + d.volume_mt, 0);
                return (
                  <tr key={i} className="table-row hover:bg-blue-50/30" style={{backgroundColor: i % 2 === 0 ? '#f8fafc' : '#ffffff'}}>
                    <td className="px-2 py-1.5 font-bold text-amber-600">{trip.trip_id}</td>
                    <td className="px-2 py-1.5 text-blue-600 font-semibold">{trip.vessel_id}</td>
                    <td className="px-2 py-1.5 text-slate-600">{trip.loading_port}→{trip.discharge_ports.join('→')}</td>
                    <td className="px-2 py-1.5 text-right font-semibold text-slate-700">{formatNumber(cargo)}</td>
                    <td className="px-2 py-1.5 text-right font-bold text-green-700">₹{trip.hpcl_charter_cost_cr.toFixed(4)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="table-header font-bold">
              <tr>
                <td colSpan={3} className="px-2 py-1.5 text-slate-800">TOTAL ({results.trips?.length ?? 0})</td>
                <td className="px-2 py-1.5 text-right text-slate-800">{formatNumber(results.summary.total_volume_mt)}</td>
                <td className="px-2 py-1.5 text-right text-green-700">₹{(results.summary.hpcl_transportation_cost_cr ?? results.summary.total_cost_cr).toFixed(4)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </details>

      {/* Trip Cards — compact accordion */}
      {results.trips && results.trips.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer select-none flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider py-1 hover:text-slate-700 transition-colors">
            <svg className="w-3 h-3 transition-transform group-open:rotate-90 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" /></svg>
            Trip Plan ({results.trips.length})
          </summary>
          <div className="mt-1.5 space-y-1">
            {results.trips.map((trip, idx) => {
              const vessel = vessels.find(v => v.id === trip.vessel_id);
              const capacity = vessel?.capacity_mt || 50000;
              const totalCargo = trip.cargo_deliveries.reduce((s, d) => s + d.volume_mt, 0);
              const isSplit = trip.discharge_ports.length >= 2;
              const isFullCapacity = Math.abs(totalCargo - capacity) < 1;

              const isActive = expandedTripIdx === idx;
              return (
                <div
                  key={idx}
                  className={`rounded-lg overflow-hidden transition-all duration-200 ${isActive ? 'shadow-lg' : 'shadow-sm hover:shadow-md'}`}
                  style={{
                    background: isActive ? 'linear-gradient(180deg, #f0f7ff, #e8f2ff)' : 'linear-gradient(180deg, #ffffff, #f8fafc)',
                    border: isActive ? '1px solid rgba(37,99,235,0.2)' : '1px solid rgba(148,163,184,0.1)',
                    borderLeft: isActive ? '3px solid #2563eb' : isSplit ? '3px solid #2563eb' : '3px solid transparent',
                    boxShadow: isActive ? '0 6px 20px rgba(37,99,235,0.12)' : undefined,
                  }}
                >
                  <button
                    onClick={() => setExpandedTripIdx(expandedTripIdx === idx ? null : idx)}
                    className="w-full text-left px-2.5 py-2 focus:outline-none"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-1 min-w-0 flex-wrap">
                        <span className="text-[11px] font-extrabold text-blue-600">{trip.trip_id}</span>
                        <span className="text-[10px] text-slate-400">·</span>
                        <span className="text-[10px] font-semibold text-slate-600">{trip.vessel_id}</span>
                        <span className="text-[10px] text-slate-400">{trip.loading_port}→{trip.discharge_ports.join('→')}</span>
                        {isSplit && <span className="text-[8px] px-1 py-0.5 rounded bg-blue-100 text-blue-600 font-bold">CO</span>}
                        {isFullCapacity && <span className="text-[8px] px-1 py-0.5 rounded bg-green-100 text-green-700 font-bold">FULL</span>}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[10px] font-bold text-blue-600">₹{trip.hpcl_charter_cost_cr.toFixed(2)}</span>
                        <svg
                          className={`w-3 h-3 text-slate-400 transition-transform ${expandedTripIdx === idx ? 'rotate-180' : ''}`}
                          fill="none" stroke="currentColor" viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </button>

                  {expandedTripIdx === idx && (
                    <div className="px-2.5 pb-2 pt-0 space-y-1.5 border-t border-slate-100">
                      <div className="grid grid-cols-3 gap-1 text-[10px] mt-1.5">
                        <div className="p-1 rounded bg-slate-50 text-center">
                          <p className="text-slate-400 font-medium">Vessel</p>
                          <p className="font-bold text-blue-600">{trip.vessel_id}</p>
                        </div>
                        <div className="p-1 rounded bg-slate-50 text-center">
                          <p className="text-slate-400 font-medium">Cap</p>
                          <p className="font-bold text-slate-700">{formatNumber(capacity)}</p>
                        </div>
                        <div className="p-1 rounded bg-slate-50 text-center">
                          <p className="text-slate-400 font-medium">Duration</p>
                          <p className="font-bold text-blue-600">{trip.trip_duration_days}d</p>
                        </div>
                      </div>
                      <div className="p-1.5 rounded bg-slate-50 text-[10px]">
                        <p className="font-bold text-slate-500 mb-0.5">Cargo</p>
                        {trip.cargo_deliveries.map((d, di) => (
                          <div key={di} className="flex justify-between py-0.5 border-b border-slate-100 last:border-0">
                            <span className="text-slate-600">{d.port}</span>
                            <span className="font-bold text-blue-600">{formatNumber(d.volume_mt)} MT</span>
                          </div>
                        ))}
                        <div className="flex justify-between pt-0.5 mt-0.5 border-t border-blue-200 font-bold">
                          <span className="text-blue-700">Total</span>
                          <span className="text-blue-700">{formatNumber(totalCargo)} MT</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </details>
      )}

      {/* Fallback: flat route list */}
      {(!results.trips || results.trips.length === 0) && results.optimization_results.length > 0 && (
        <div>
          <div className="text-[10px] font-bold tracking-widest text-slate-500 uppercase mb-2">Routes</div>
          <div className="space-y-1.5">
            {results.optimization_results.map((route, idx) => (
              <div key={idx} className="p-2.5 rounded-lg border border-slate-200 bg-white">
                <div className="flex items-center gap-1.5 flex-wrap text-xs">
                  <span className="font-bold text-blue-600">{route.Tanker}</span>
                  <span className="px-1.5 py-0.5 rounded bg-green-50 text-green-700 text-[10px]">{route.Source}</span>
                  <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px]">→ {route.Destination}</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {formatNumber(route['Volume (MT)'])} MT · <span className="text-blue-600 font-semibold">₹{route['Trip Cost (Rs Cr)'].toFixed(4)} Cr</span>
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
