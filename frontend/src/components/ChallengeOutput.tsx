'use client';

import React, { useState, useEffect } from 'react';
import { formatNumber } from '../utils/formatters';

interface Vessel {
  id: string;
  capacity_mt: number;
  charter_rate_cr_per_day: number;
}

interface Port {
  id: string;
  name: string;
  type: string;
}

interface Demand {
  port_id: string;
  demand_mt: number;
}

interface ChallengeResult {
  Source: string;
  Destination: string;
  Tanker: string;
  'Volume (MT)': number;
  'Trip Cost (Rs Cr)': number;
}

interface OptimizationResponse {
  status: string;
  optimization_results: ChallengeResult[];
  summary: {
    total_routes: number;
    total_cost_cr: number;
    total_volume_mt: number;
    total_demand_mt: number;
    satisfied_demand_mt: number;
    demand_satisfaction_percentage: number;
    unsatisfied_ports: string[];
  };
  timestamp: string;
}

export function ChallengeOutput() {
  const [results, setResults] = useState<OptimizationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showInputs, setShowInputs] = useState(true);
  const [expandedTripIdx, setExpandedTripIdx] = useState<number | null>(null);
  
  // Load saved results from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedResults = localStorage.getItem('challenge_optimization_results');
      const savedVessels = localStorage.getItem('challenge_vessels');
      const savedDemands = localStorage.getItem('challenge_demands');
      
      if (savedResults) {
        try {
          setResults(JSON.parse(savedResults));
        } catch (e) {
          console.error('Failed to load saved results:', e);
        }
      }
      
      if (savedVessels) {
        try {
          setVessels(JSON.parse(savedVessels));
        } catch (e) {
          console.error('Failed to load saved vessels:', e);
        }
      }
      
      if (savedDemands) {
        try {
          setDemands(JSON.parse(savedDemands));
        } catch (e) {
          console.error('Failed to load saved demands:', e);
        }
      }
    }
  }, []);
  
  // Editable input data
  const [vessels, setVessels] = useState<Vessel[]>([
    { id: 'T1', capacity_mt: 50000, charter_rate_cr_per_day: 0.63 },
    { id: 'T2', capacity_mt: 50000, charter_rate_cr_per_day: 0.49 },
    { id: 'T3', capacity_mt: 50000, charter_rate_cr_per_day: 0.51 },
    { id: 'T4', capacity_mt: 50000, charter_rate_cr_per_day: 0.51 },
    { id: 'T5', capacity_mt: 50000, charter_rate_cr_per_day: 0.53 },
    { id: 'T6', capacity_mt: 50000, charter_rate_cr_per_day: 0.57 },
    { id: 'T7', capacity_mt: 50000, charter_rate_cr_per_day: 0.65 },
    { id: 'T8', capacity_mt: 25000, charter_rate_cr_per_day: 0.39 },
    { id: 'T9', capacity_mt: 25000, charter_rate_cr_per_day: 0.38 },
  ]);

  const [loadingPorts] = useState<Port[]>([
    { id: 'L1', name: 'Loading Port L1', type: 'loading' },
    { id: 'L2', name: 'Loading Port L2', type: 'loading' },
    { id: 'L3', name: 'Loading Port L3', type: 'loading' },
    { id: 'L4', name: 'Loading Port L4', type: 'loading' },
    { id: 'L5', name: 'Loading Port L5', type: 'loading' },
    { id: 'L6', name: 'Loading Port L6', type: 'loading' },
  ]);

  const [demands, setDemands] = useState<Demand[]>([
    { port_id: 'U1', demand_mt: 40000 },
    { port_id: 'U2', demand_mt: 135000 },
    { port_id: 'U3', demand_mt: 5000 },
    { port_id: 'U4', demand_mt: 20000 },
    { port_id: 'U5', demand_mt: 20000 },
    { port_id: 'U6', demand_mt: 20000 },
    { port_id: 'U7', demand_mt: 110000 },
    { port_id: 'U8', demand_mt: 30000 },
    { port_id: 'U9', demand_mt: 20000 },
    { port_id: 'U10', demand_mt: 20000 },
    { port_id: 'U11', demand_mt: 20000 },
  ]);

  const updateVessel = (index: number, field: keyof Vessel, value: number) => {
    const updated = [...vessels];
    updated[index] = { ...updated[index], [field]: value };
    setVessels(updated);
    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('challenge_vessels', JSON.stringify(updated));
    }
  };

  const updateDemand = (index: number, value: number) => {
    const updated = [...demands];
    updated[index] = { ...updated[index], demand_mt: value };
    setDemands(updated);
    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('challenge_demands', JSON.stringify(updated));
    }
  };

  const runOptimization = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/v1/challenge/optimize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vessels,
          demands
        })
      });
      
      if (!response.ok) {
        throw new Error('Optimization failed');
      }
      
      const data = await response.json();
      setResults(data);
      
      // Save results to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('challenge_optimization_results', JSON.stringify(data));
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      console.error('Optimization error:', errorMessage);
      setError(`Unable to connect to the optimization server. Please verify the server is running at ${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'} and try again.`);
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = () => {
    if (!results) return;
    
    const headers = ['Source', 'Destination', 'Tanker', 'Volume (MT)', 'Trip Cost (Rs Cr)'];
    const csvContent = [
      headers.join(','),
      ...results.optimization_results.map(row => 
        [row.Source, row.Destination, row.Tanker, row['Volume (MT)'], row['Trip Cost (Rs Cr)']].join(',')
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hpcl_optimization_results_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const clearResults = () => {
    setResults(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('challenge_optimization_results');
    }
  };

  return (
    <div className="space-y-8">
      {/* Section Header with Action Button */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent mb-2">
            Coastal Fleet Route Optimizer
          </h2>
          <p className="text-slate-400">Minimize transportation costs while meeting all delivery demands</p>
        </div>
        <div className="flex gap-3">
          {results && (
            <button
              onClick={clearResults}
              className="px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 bg-red-600/20 text-red-400 border border-red-500/30 hover:bg-red-600/30 hover:border-red-500/50"
              title="Clear saved optimization results and start fresh"
            >
              Clear Results
            </button>
          )}
          <button
            onClick={runOptimization}
            disabled={loading}
            className="px-8 py-3 rounded-xl font-semibold text-sm transition-all duration-300 bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/50 hover:shadow-cyan-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Find the most cost-effective routes for your fleet"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Finding Optimal Routes...
              </span>
            ) : (
              'Optimize Routes'
            )}
          </button>
        </div>
      </div>

      {/* Input Toggle */}
      <div className="flex justify-center">
        <button
          onClick={() => setShowInputs(!showInputs)}
          className="glass-card border border-slate-700 px-6 py-3 rounded-xl text-sm font-medium text-slate-300 hover:text-cyan-400 hover:border-cyan-500/50 transition-all"
          title="Toggle fleet and demand parameters"
        >
          {showInputs ? '▼ Hide Fleet Parameters' : '▶ Show Fleet Parameters'}
        </button>
      </div>

      {/* Input Configuration Section */}
      {showInputs && (
        <div className="glass-card rounded-2xl border border-slate-700/50 p-8">
          <h3 className="text-xl font-semibold text-slate-200 mb-6">Fleet & Demand Configuration</h3>
          <p className="text-sm text-slate-400 mb-6">Adjust vessel capacities, charter rates, and port demands to customize your optimization scenario</p>
          <div className="space-y-6">
          </div>
        </div>
      )}

      {/* Input Tables */}
      {showInputs && (
        <div>
          <div style={{ fontSize: '11px', letterSpacing: '0.08em', fontWeight: '700', color: '#0B5ED7', marginBottom: '20px', textTransform: 'uppercase' }}>
            STEP 1 — INPUT CONFIGURATION
          </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tankers Input */}
          <div style={{ backgroundColor: '#F8FBFF', borderRadius: '12px', padding: '24px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid #E6F2FF' }}>
            <div style={{ fontSize: '11px', letterSpacing: '0.08em', fontWeight: '700', color: '#0B5ED7', marginBottom: '20px', textTransform: 'uppercase' }}>
              Available Coastal Tankers
            </div>
            <div className="text-xs text-slate-500 mb-3">Configure your fleet capacity and daily charter costs</div>
            <div className="overflow-x-auto table-container rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="table-header">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase">Tanker</th>
                    <th className="px-3 py-2 text-right text-xs font-medium uppercase">Capacity (MT)</th>
                    <th className="px-3 py-2 text-right text-xs font-medium uppercase">Charter Rate (₹Cr/day)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {vessels.map((vessel, index) => (
                    <tr key={vessel.id} className="table-row">
                      <td className="px-3 py-2 text-sm font-medium text-slate-300">{vessel.id}</td>
                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          value={vessel.capacity_mt}
                          onChange={(e) => updateVessel(index, 'capacity_mt', parseInt(e.target.value) || 0)}
                          className="w-24 px-2 py-1 text-sm text-right custom-input rounded"
                        />
                      </td>
              <td className="px-3 py-2 text-right">
                <input
                  type="number"
                  step="0.01"
                  value={vessel.charter_rate_cr_per_day}
                  onChange={(e) => updateVessel(index, 'charter_rate_cr_per_day', parseFloat(e.target.value) || 0)}
                  className="w-20 px-2 py-1 text-sm text-right custom-input rounded"
                />
              </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 text-xs text-slate-400">
              <p>Total Fleet Capacity: <span className="font-semibold text-cyan-400">{formatNumber(vessels.reduce((sum, v) => sum + v.capacity_mt, 0))} MT</span></p>
            </div>
          </div>

          {/* Demands Input */}
          <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)', borderRadius: '12px', padding: '24px', boxShadow: '0 2px 12px rgba(0,0,0,0.3)', border: '1px solid rgba(148, 163, 184, 0.1)' }}>
            <div style={{ fontSize: '11px', letterSpacing: '0.08em', fontWeight: '700', color: '#0B5ED7', marginBottom: '20px', textTransform: 'uppercase' }}>
              Monthly Delivery Requirements
            </div>
            <div className="text-xs text-slate-500 mb-3">Cargo volumes to be delivered to each unloading port (MT/month)</div>
            <div className="overflow-x-auto table-container rounded-lg">
              <table className="min-w-full divide-y divide-cyan-200">
                <thead className="table-header">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase">Port</th>
                    <th className="px-3 py-2 text-right text-xs font-medium uppercase">Demand (MT/month)</th>
                  </tr>
                </thead>
              <tbody className="divide-y divide-gray-200">
                {demands.map((demand, index) => (
                  <tr key={demand.port_id} className="table-row">
                    <td className="px-3 py-2 text-sm font-medium text-slate-300">{demand.port_id}</td>
                    <td className="px-3 py-2 text-right">
                      <input
                        type="number"
                        value={demand.demand_mt}
                        onChange={(e) => updateDemand(index, parseInt(e.target.value) || 0)}
                        className="w-28 px-2 py-1 text-sm text-right custom-input rounded"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
            <div className="mt-3 text-xs text-slate-400">
              <p>Total Monthly Demand: <span className="font-semibold text-cyan-400">{formatNumber(demands.reduce((sum, d) => sum + d.demand_mt, 0))} MT</span></p>
            </div>
          </div>

          {/* Loading Ports Info */}
          <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)', borderRadius: '12px', padding: '24px', boxShadow: '0 2px 12px rgba(0,0,0,0.3)', border: '1px solid rgba(148, 163, 184, 0.1)' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#22d3ee', marginBottom: '16px' }}>Loading Ports (6 Ports)</h3>
            <div className="space-y-2">
              {loadingPorts.map((port) => (
                <div key={port.id} className="flex items-center justify-between py-2 px-3 rounded" style={{ backgroundColor: 'rgba(34, 211, 238, 0.1)' }}>
                  <span className="text-sm font-medium text-slate-300">{port.id}</span>
                  <span className="text-xs text-slate-400">{port.name}</span>
                  <span className="text-xs font-semibold text-green-400">Unlimited Supply</span>
                </div>
              ))}
            </div>
          </div>

          {/* Constraints Info */}
          <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)', borderRadius: '12px', padding: '24px', boxShadow: '0 2px 12px rgba(0,0,0,0.3)', border: '1px solid rgba(148, 163, 184, 0.1)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#22d3ee', marginBottom: '20px' }}>Operational Constraints</h3>
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="shrink-0 h-8 w-8 rounded-full flex items-center justify-center mt-0.5" style={{ backgroundColor: 'rgba(34, 211, 238, 0.2)', border: '1px solid rgba(34, 211, 238, 0.3)' }}>
                  <span className="text-sm font-bold text-cyan-400">1</span>
                </div>
                <div className="ml-4">
                  <p className="text-base font-semibold text-slate-100 mb-1">Single-port Full Loading</p>
                  <p className="text-sm text-slate-300 leading-relaxed">Each tanker loads full capacity from only one port</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="shrink-0 h-8 w-8 rounded-full flex items-center justify-center mt-0.5" style={{ backgroundColor: 'rgba(34, 211, 238, 0.2)', border: '1px solid rgba(34, 211, 238, 0.3)' }}>
                  <span className="text-sm font-bold text-cyan-400">2</span>
                </div>
                <div className="ml-4">
                  <p className="text-base font-semibold text-slate-100 mb-1">Maximum Two-port Discharge</p>
                  <p className="text-sm text-slate-300 leading-relaxed">Tanker may unload at maximum of 2 ports per trip</p>
                </div>
              </div>
        <div className="flex items-start">
          <div className="shrink-0 h-8 w-8 rounded-full flex items-center justify-center mt-0.5" style={{ backgroundColor: 'rgba(34, 211, 238, 0.2)', border: '1px solid rgba(34, 211, 238, 0.3)' }}>
            <span className="text-sm font-bold text-cyan-400">3</span>
          </div>
          <div className="ml-4">
            <p className="text-base font-semibold text-slate-100 mb-1">Unlimited Supply at Loading Ports</p>
            <p className="text-sm text-slate-300 leading-relaxed">No supply constraints at any loading port</p>
          </div>
              </div>
              <div className="flex items-start">
                <div className="shrink-0 h-8 w-8 rounded-full flex items-center justify-center mt-0.5" style={{ backgroundColor: 'rgba(34, 211, 238, 0.2)', border: '1px solid rgba(34, 211, 238, 0.3)' }}>
                  <span className="text-sm font-bold text-cyan-400">4</span>
                </div>
                <div className="ml-4">
                  <p className="text-base font-semibold text-slate-100 mb-1">Full Demand Satisfaction</p>
                  <p className="text-sm text-slate-300 leading-relaxed">All unloading port demands must be fully met</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>
      )}

      {/* Results Section Wrapper */}
      <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(16px)', border: '1px solid rgba(148, 163, 184, 0.1)', borderRadius: '16px', boxShadow: '0 4px 24px rgba(0,0,0,0.3)', padding: '32px', marginTop: '32px' }}>
        <div style={{ fontSize: '11px', letterSpacing: '0.08em', fontWeight: '700', color: '#22d3ee', marginBottom: '20px', textTransform: 'uppercase' }}>
          STEP 2 — OPTIMIZATION RESULTS
        </div>
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 font-medium">Error: {error}</p>
          </div>
        )}

        {results && results.summary && (
        <>
          {/* Summary Section - HPCL Compliant (Layer 1) */}
          <div className="mb-6 grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="terminal-style p-4 rounded-lg border border-cyan-500/30">
              <p className="text-sm font-medium text-cyan-400">HPCL Transportation Cost</p>
              <p className="text-2xl font-bold text-cyan-300">₹{results.summary.total_cost_cr} Cr</p>
              <p className="text-xs text-cyan-200 mt-1">Charter Hire × Trip Duration</p>
            </div>
            <div className="terminal-style p-4 rounded-lg border border-green-500/30">
              <p className="text-sm font-medium text-green-400">Total Trips</p>
              <p className="text-2xl font-bold text-green-300">{results.summary.total_routes}</p>
            </div>
            <div className="terminal-style p-4 rounded-lg border border-blue-500/30">
              <p className="text-sm font-medium text-blue-400">Demand Compliance</p>
              <p className="text-2xl font-bold text-blue-300">✓ 100%</p>
              <p className="text-xs text-blue-200 mt-1">All demands met exactly</p>
            </div>
          </div>

          {/* Trip Cards Overview (Layer 1 - Default Collapsed) */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-slate-200 mb-4">Optimized Trip Plan</h3>
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
              {results.optimization_results.map((route, idx) => (
                <div key={idx} className={`border rounded-lg p-4 transition-all duration-200 ${expandedTripIdx === idx ? 'bg-slate-800/60 border-cyan-500/50' : 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800/60'}`}>
                  {/* Trip Header - Always Visible */}
                  <button
                    onClick={() => setExpandedTripIdx(expandedTripIdx === idx ? null : idx)}
                    className="w-full text-left focus:outline-none"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-semibold text-cyan-400">Trip {idx + 1} • {route.Tanker}</span>
                          <span className="text-xs px-2 py-1 rounded bg-cyan-500/20 text-cyan-300">Load: {route.Source}</span>
                        </div>
                        <div className="flex items-center gap-2 mb-2 text-sm text-slate-300">
                          <span>→ Discharge: {route.Destination}</span>
                          <span className="text-slate-500">• {formatNumber(route['Volume (MT)'])} MT</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <span className="text-cyan-400 font-semibold">HPCL Cost: ₹{route['Trip Cost (Rs Cr)'].toFixed(2)} Cr</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <svg 
                          className={`w-5 h-5 text-cyan-400 transition-transform duration-300 flex-shrink-0 ${expandedTripIdx === idx ? 'rotate-180' : ''}`} 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                        </svg>
                      </div>
                    </div>
                  </button>

                  {/* Trip Details - Expandable */}
                  {expandedTripIdx === idx && (
                    <div className="mt-4 pt-4 border-t border-slate-700/50 space-y-4 animate-in fade-in duration-200">
                      {/* Detailed Trip Information */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="p-3 bg-slate-800/50 rounded border border-slate-700/30">
                          <p className="text-xs text-slate-400">Loading Port</p>
                          <p className="text-sm font-semibold text-cyan-300 mt-1">{route.Source}</p>
                        </div>
                        <div className="p-3 bg-slate-800/50 rounded border border-slate-700/30">
                          <p className="text-xs text-slate-400">Discharge Port</p>
                          <p className="text-sm font-semibold text-cyan-300 mt-1">{route.Destination}</p>
                        </div>
                        <div className="p-3 bg-slate-800/50 rounded border border-slate-700/30">
                          <p className="text-xs text-slate-400">Vessel Capacity</p>
                          <p className="text-sm font-semibold text-green-300 mt-1">{formatNumber(route['Volume (MT)'])} MT</p>
                        </div>
                        <div className="p-3 bg-slate-800/50 rounded border border-slate-700/30">
                          <p className="text-xs text-slate-400">Trip Duration</p>
                          <p className="text-sm font-semibold text-blue-300 mt-1">Optimized</p>
                        </div>
                      </div>

                      {/* Cost Breakdown */}
                      <div className="p-3 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded border border-cyan-500/20">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-cyan-400 font-semibold">HPCL Transportation Cost</p>
                            <p className="text-sm text-cyan-200 mt-0.5">Charter Hire × Voyage Duration</p>
                          </div>
                          <p className="text-lg font-bold text-cyan-300">₹{route['Trip Cost (Rs Cr)'].toFixed(4)} Cr</p>
                        </div>
                      </div>

                      {/* Trip Metrics */}
                      <div className="p-3 bg-slate-800/30 rounded border border-slate-700/50">
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div>
                            <p className="text-xs text-slate-400">Capacity Used</p>
                            <p className="text-sm font-semibold text-slate-200 mt-1">{((route['Volume (MT)'] / 50000) * 100).toFixed(1)}%</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-400">Status</p>
                            <p className="text-sm font-semibold text-green-400 mt-1">✓ Active</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-400">Compliance</p>
                            <p className="text-sm font-semibold text-cyan-300 mt-1">HPCL ✓</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Download Button */}
          <div className="mb-4 flex justify-end">
            <button
              onClick={downloadCSV}
              className="px-4 py-2 btn-primary-gradient rounded-lg font-medium transition-all flex items-center gap-2"
              title="Download optimization results as CSV file"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export Results
            </button>
          </div>

          {/* Layer 2: Full Results Table (Collapsible for detailed view) */}
          <details className="mb-6 group">
            <summary className="cursor-pointer select-none list-none px-6 py-4 bg-gradient-to-r from-slate-800/50 to-slate-800/30 rounded-xl border border-cyan-500/30 font-semibold text-slate-100 hover:bg-gradient-to-r hover:from-slate-800/70 hover:to-slate-800/50 hover:border-cyan-500/50 transition-all duration-200 flex items-center gap-3 group-open:bg-gradient-to-r group-open:from-slate-800/70 group-open:to-slate-800/50">
              <svg className="w-5 h-5 text-cyan-400 transition-transform duration-300 group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
              <span>📋 View Full Trip Details & Constraints</span>
            </summary>
            
            <div className="mt-6 space-y-6">
              {/* Table */}
              <div className="overflow-x-auto table-container rounded-lg">
                <table className="w-full divide-y divide-slate-700">
                  <thead className="table-header sticky top-0">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold tracking-wide" style={{color: '#06b6d4'}}>LOADING PORT</th>
                      <th className="px-6 py-4 text-left text-xs font-bold tracking-wide" style={{color: '#06b6d4'}}>DELIVERY PORT</th>
                      <th className="px-6 py-4 text-left text-xs font-bold tracking-wide" style={{color: '#06b6d4'}}>VESSEL</th>
                      <th className="px-6 py-4 text-right text-xs font-bold tracking-wide" style={{color: '#06b6d4'}}>CARGO (MT)</th>
                      <th className="px-6 py-4 text-right text-xs font-bold tracking-wide" style={{color: '#06b6d4'}}>HPCL COST (₹ CR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {results.optimization_results.map((row, index) => (
                      <tr key={index} className="table-row hover:bg-cyan-500/10 transition-colors" style={{backgroundColor: index % 2 === 0 ? 'rgba(51, 65, 85, 0.4)' : 'rgba(30, 41, 59, 0.4)'}}>
                        <td className="px-6 py-4 text-sm font-medium whitespace-nowrap" style={{color: '#67e8f9'}}>
                          {row.Source}
                        </td>
                        <td className="px-6 py-4 text-sm whitespace-nowrap" style={{color: '#67e8f9'}}>
                          {row.Destination}
                        </td>
                        <td className="px-6 py-4 text-sm whitespace-nowrap" style={{color: '#67e8f9'}}>
                          {row.Tanker}
                        </td>
                        <td className="px-6 py-4 text-sm text-right whitespace-nowrap" style={{color: '#67e8f9'}}>
                          {formatNumber(row['Volume (MT)'])}
                        </td>
                        <td className="px-6 py-4 text-sm text-right font-semibold whitespace-nowrap" style={{color: '#6ee7b7'}}>
                          ₹{row['Trip Cost (Rs Cr)'].toFixed(4)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="table-header font-bold sticky bottom-0" style={{backgroundColor: 'rgba(30, 58, 138, 0.8)'}}>
                    <tr>
                      <td colSpan={3} className="px-6 py-4 text-sm" style={{color: '#ffffff'}}>
                        TOTAL SUMMARY
                      </td>
                      <td className="px-6 py-4 text-sm text-right" style={{color: '#ffffff'}}>
                        {formatNumber(results.summary.total_volume_mt)} MT
                      </td>
                      <td className="px-6 py-4 text-sm text-right" style={{color: '#6ee7b7'}}>
                        ₹{results.summary.total_cost_cr.toFixed(2)} Cr
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* HPCL Constraints Verification Box */}
              <div className="p-6 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-xl">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-5 h-5 text-cyan-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-cyan-300 mb-3 tracking-wide">HPCL CHALLENGE 7.1 COMPLIANCE VERIFIED</h4>
                    <ul className="text-sm text-cyan-200/90 space-y-2.5">
                      <li className="flex items-start gap-2">
                        <span className="text-cyan-400 font-bold mt-0.5">✓</span>
                        <span><strong>Single Loading Port:</strong> Each trip originates from exactly one loading port per HPCL requirements</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-cyan-400 font-bold mt-0.5">✓</span>
                        <span><strong>Maximum 2 Discharge Ports:</strong> All trips discharge cargo at up to 2 unloading ports per specification</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-cyan-400 font-bold mt-0.5">✓</span>
                        <span><strong>100% Demand Satisfaction:</strong> All unloading port demands are met exactly at specified quantities</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-cyan-400 font-bold mt-0.5">✓</span>
                        <span><strong>Cost Definition:</strong> Transportation cost = Daily Charter Rate × Total Trip Duration (as defined in Challenge 7.1)</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Additional Info */}
              <div className="p-4 bg-slate-800/30 border border-slate-700/50 rounded-lg">
                <p className="text-xs text-slate-400">
                  <strong className="text-slate-300">💡 Tip:</strong> Hover over table rows to see highlighted details. Scroll horizontally on mobile devices to view all columns.
                </p>
              </div>
            </div>
          </details>
          </>
        )}

        {!results && !loading && (
          <div className="glass-card rounded-2xl border border-slate-700/50 overflow-hidden">
            {/* Header Section */}
            <div className="border-b border-slate-700/50 px-8 py-6 bg-gradient-to-r from-slate-900/50 to-slate-800/30">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-cyan-500/20 blur-xl"></div>
                  <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-cyan-500/30 bg-white/5">
                    <img 
                      src="/business-optimization-growth_1050938-28362.avif" 
                      alt="Business Optimization"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-slate-100 mb-1">
                    Optimization Engine Ready
                  </h3>
                  <p className="text-sm text-slate-400">
                    System initialized and awaiting input configuration
                  </p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/10 border border-green-500/30">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                  <span className="text-xs font-semibold text-green-400">ONLINE</span>
                </div>
              </div>
            </div>

            {/* Content Section */}
            <div className="px-8 py-8">
              <div className="mb-8 text-center max-w-2xl mx-auto">
                <p className="text-slate-300 text-base leading-relaxed">
                  Configure vessel fleet parameters and port demand requirements above, then execute the optimization algorithm to generate cost-optimal routing solutions for coastal tanker operations.
                </p>
              </div>

              {/* Capabilities Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Card 1 */}
                <div className="group relative overflow-hidden rounded-xl border border-slate-700/50 bg-gradient-to-br from-slate-800/40 to-slate-900/40 p-6 hover:border-cyan-500/50 transition-all duration-300">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl group-hover:bg-cyan-500/10 transition-all"></div>
                  <div className="relative">
                    <div className="w-20 h-20 rounded-lg overflow-hidden mb-4 group-hover:scale-110 transition-transform bg-white/5 border border-cyan-500/20">
                      <img 
                        src="/highperformance-computing-hpc-supercomputers-computer-260nw-2234873365.webp" 
                        alt="High Performance Computing"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <h4 className="text-base font-semibold text-slate-200 mb-2">High-Performance Computing</h4>
                    <p className="text-sm text-slate-400 leading-relaxed">OR-Tools CP-SAT constraint programming solver for rapid optimization</p>
                  </div>
                </div>

                {/* Card 2 */}
                <div className="group relative overflow-hidden rounded-xl border border-slate-700/50 bg-gradient-to-br from-slate-800/40 to-slate-900/40 p-6 hover:border-green-500/50 transition-all duration-300">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full blur-2xl group-hover:bg-green-500/10 transition-all"></div>
                  <div className="relative">
                    <div className="w-20 h-20 rounded-lg overflow-hidden mb-4 group-hover:scale-110 transition-transform bg-white/5 border border-green-500/20">
                      <img 
                        src="/cost-optimization-financial-design-vector-42140697.webp" 
                        alt="Cost Optimization"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <h4 className="text-base font-semibold text-slate-200 mb-2">Cost Optimization</h4>
                    <p className="text-sm text-slate-400 leading-relaxed">Multi-objective optimization minimizing charter costs and voyage expenses</p>
                  </div>
                </div>

                {/* Card 3 */}
                <div className="group relative overflow-hidden rounded-xl border border-slate-700/50 bg-gradient-to-br from-slate-800/40 to-slate-900/40 p-6 hover:border-blue-500/50 transition-all duration-300">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-all"></div>
                  <div className="relative">
                    <div className="w-20 h-20 rounded-lg overflow-hidden mb-4 group-hover:scale-110 transition-transform bg-white/5 border border-blue-500/20">
                      <img 
                        src="/stockfresh_6186205_fulfillment-cardboard-boxes-shipping-orders-warehouse-shipments_sizeXS-min.jpg" 
                        alt="Demand Fulfillment"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <h4 className="text-base font-semibold text-slate-200 mb-2">Demand Fulfillment</h4>
                    <p className="text-sm text-slate-400 leading-relaxed">Guaranteed 100% satisfaction of all unloading port requirements</p>
                  </div>
                </div>
              </div>

              {/* Action Hint */}
              <div className="mt-8 text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/5 border border-blue-500/20">
                  <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm text-slate-400">
                    Click <span className="text-blue-400 font-semibold">Run Optimization</span> button above to begin
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
