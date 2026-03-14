'use client';

import React, { useState, useEffect } from 'react';
import { MaritimeMap, COASTAL_COORD_MAP } from './MaritimeMap';
import {
  ChallengeConfigPanel,
  ChallengeResultsPanel,
  DEFAULT_VESSELS,
  DEFAULT_DEMANDS,
  type Vessel,
  type Demand,
  type OptimizationResponse,
  type ChallengeSharedProps,
} from './ChallengeOutput';
import { formatNumber } from '../utils/formatters';

// ─── Re-exported interfaces (other components import from here) ───────────────

export interface HPCLVessel {
  id: string;
  name: string;
  capacity_mt: number;
  status: string;
  current_port?: string;
}

export interface HPCLPort {
  id: string;
  name: string;
  officialName: string;
  locationCode?: string;
  type: 'loading' | 'unloading';
  latitude: number;
  longitude: number;
  state: string;
}

export interface OptimizationResult {
  request_id: string;
  total_cost: number;
  fleet_utilization: number;
  demand_satisfaction_rate: number;
  selected_routes: any[];
  routes_generated?: number;
  summary?: {
    round_trip: boolean;
    total_cost_cr: string;
  };
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function HPCLDashboard() {
  // ── Challenge optimization state (lifted from ChallengeOutput) ───────────
  const [vessels, setVessels] = useState<Vessel[]>(DEFAULT_VESSELS);
  const [demands, setDemands] = useState<Demand[]>(DEFAULT_DEMANDS);
  const [solverProfile, setSolverProfile] = useState<'quick' | 'balanced' | 'thorough'>('quick');
  const [results, setResults]   = useState<OptimizationResponse | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [optimizationStartTime, setOptimizationStartTime] = useState<number | null>(null);

  // ── Map vessels (for MaritimeMap markers) ────────────────────────────────
  const [mapVessels] = useState<HPCLVessel[]>([
    { id: 'T1', name: 'Tanker T1 (50K)', capacity_mt: 50000, status: 'available', current_port: 'L1' },
    { id: 'T2', name: 'Tanker T2 (50K)', capacity_mt: 50000, status: 'available', current_port: 'L2' },
    { id: 'T3', name: 'Tanker T3 (50K)', capacity_mt: 50000, status: 'available', current_port: 'L3' },
    { id: 'T4', name: 'Tanker T4 (50K)', capacity_mt: 50000, status: 'sailing',   current_port: 'En Route' },
    { id: 'T5', name: 'Tanker T5 (50K)', capacity_mt: 50000, status: 'available', current_port: 'L5' },
    { id: 'T6', name: 'Tanker T6 (50K)', capacity_mt: 50000, status: 'loading',   current_port: 'L6' },
    { id: 'T7', name: 'Tanker T7 (50K)', capacity_mt: 50000, status: 'available', current_port: 'L4' },
    { id: 'T8', name: 'Tanker T8 (25K)', capacity_mt: 25000, status: 'sailing',   current_port: 'En Route' },
    { id: 'T9', name: 'Tanker T9 (25K)', capacity_mt: 25000, status: 'unloading', current_port: 'U7' },
  ]);
  const [mapPorts] = useState<HPCLPort[]>(() =>
    Object.entries(COASTAL_COORD_MAP).map(([id, info]) => ({
      id,
      name: `${id} — ${info.name}`,
      officialName: info.name,
      locationCode: info.locationCode,
      type: (id.startsWith('L') ? 'loading' : 'unloading') as 'loading' | 'unloading',
      latitude: info.lat,
      longitude: info.lng,
      state: info.state,
    }))
  );

  // ── Restore saved inputs from localStorage ───────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('challenge_optimization_results');
    const sv = localStorage.getItem('challenge_vessels');
    const sd = localStorage.getItem('challenge_demands');
    if (sv) { try { setVessels(JSON.parse(sv)); } catch {} }
    if (sd) { try { setDemands(JSON.parse(sd)); } catch {} }
  }, []);

  // ── Handlers ─────────────────────────────────────────────────────────────
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
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      setResults(await res.json());
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An error occurred';
      setError(`Unable to connect to the optimization server. ${msg}`);
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
      ),
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

  // Real trips from the latest successful optimization (drives map routing)
  const challengeTrips = results?.trips ?? [];

  return (
    <div
      className="relative w-screen h-screen overflow-hidden"
      style={{ background: '#001529' }}
    >
      {/* Subtle ambient glow overlays */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-1/4 left-1/3 w-96 h-96 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #1890ff 0%, transparent 70%)' }} />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 rounded-full opacity-8"
          style={{ background: 'radial-gradient(circle, #22d3ee 0%, transparent 70%)' }} />
      </div>

      {/* ── Top Header Bar ─────────────────────────────────────────────────── */}
      <header className="relative z-20 flex items-center justify-between px-5 py-2.5 border-b border-slate-800/60"
        style={{ background: 'rgba(0, 21, 41, 0.95)', backdropFilter: 'blur(12px)' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
            </svg>
          </div>
          <div>
            <span className="text-sm font-bold text-slate-100">RouteX</span>
            <span className="ml-2 text-xs text-slate-500">HPCL Challenge 7.1 — Coastal Fleet Optimizer</span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-500">
          {results && (
            <span className="text-green-400 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
              Solution Ready
            </span>
          )}
          {loading && (
            <span className="text-cyan-400 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 inline-block animate-pulse" />
              Optimizing…
            </span>
          )}
          <span className="text-slate-600">9 Tankers · 6 Loading · 11 Unloading</span>
          <span className="text-slate-600">440,000 MT/month</span>
        </div>
      </header>

      {/* ── Three-Pane Body ────────────────────────────────────────────────── */}
      <div className="relative z-10 flex" style={{ height: 'calc(100vh - 46px)' }}>

        {/* LEFT — Solver Config Sidebar */}
        <div
          className="flex-none overflow-hidden border-r border-slate-800/60"
          style={{
            width: '280px',
            background: 'rgba(2, 12, 27, 0.92)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <ChallengeConfigPanel {...sharedProps} />
        </div>

        {/* CENTER — MaritimeMap (fullscreen) */}
        <div className="flex-1 relative overflow-hidden">
          <MaritimeMap
            vessels={mapVessels}
            ports={mapPorts}
            showLiveStatus={true}
            challengeTrips={challengeTrips}
          />
        </div>

        {/* RIGHT — Impact / Results Panel */}
        <div
          className="flex-none overflow-hidden border-l border-slate-800/60"
          style={{
            width: '380px',
            background: 'rgba(2, 12, 27, 0.92)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <ChallengeResultsPanel
            results={results}
            vessels={vessels}
            loading={loading}
            onDownloadCSV={downloadCSV}
            onClearResults={clearResults}
          />
        </div>
      </div>
    </div>
  );
}
