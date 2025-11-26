'use client';

import React, { useState, useEffect } from 'react';

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
  };

  const updateDemand = (index: number, value: number) => {
    const updated = [...demands];
    updated[index] = { ...updated[index], demand_mt: value };
    setDemands(updated);
  };

  const runOptimization = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('http://localhost:8000/api/v1/challenge/optimize', {
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
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

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-blue-50">
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Challenge 7.1: Coastal Vessel Optimization</h2>
            <p className="text-sm text-gray-600 mt-1">
              Minimizing Bulk Cargo Transportation Cost
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowInputs(!showInputs)}
              className="px-4 py-2 rounded-lg font-medium border-2 border-gray-300 text-gray-700 hover:bg-gray-50 transition-all"
            >
              {showInputs ? 'Hide Inputs' : 'Show Inputs'}
            </button>
            <button
              onClick={runOptimization}
              disabled={loading}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                loading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg'
              }`}
            >
              {loading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Running Optimization...
                </span>
              ) : (
                'Run Optimization'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Input Tables */}
      {showInputs && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tankers Input */}
          <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Tanker Fleet (9 Vessels)</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tanker</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Capacity (MT)</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Charter Rate (₹Cr/day)</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {vessels.map((vessel, index) => (
                    <tr key={vessel.id}>
                      <td className="px-3 py-2 text-sm font-medium text-gray-900">{vessel.id}</td>
                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          value={vessel.capacity_mt}
                          onChange={(e) => updateVessel(index, 'capacity_mt', parseInt(e.target.value) || 0)}
                          className="w-24 px-2 py-1 text-sm text-right border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={vessel.charter_rate_cr_per_day}
                          onChange={(e) => updateVessel(index, 'charter_rate_cr_per_day', parseFloat(e.target.value) || 0)}
                          className="w-20 px-2 py-1 text-sm text-right border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 text-xs text-gray-500">
              <p>Total Fleet Capacity: <span className="font-semibold">{vessels.reduce((sum, v) => sum + v.capacity_mt, 0).toLocaleString()} MT</span></p>
            </div>
          </div>

          {/* Demands Input */}
          <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Unloading Port Demands</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Port</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Demand (MT/month)</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {demands.map((demand, index) => (
                    <tr key={demand.port_id}>
                      <td className="px-3 py-2 text-sm font-medium text-gray-900">{demand.port_id}</td>
                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          value={demand.demand_mt}
                          onChange={(e) => updateDemand(index, parseInt(e.target.value) || 0)}
                          className="w-28 px-2 py-1 text-sm text-right border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 text-xs text-gray-500">
              <p>Total Monthly Demand: <span className="font-semibold">{demands.reduce((sum, d) => sum + d.demand_mt, 0).toLocaleString()} MT</span></p>
            </div>
          </div>

          {/* Loading Ports Info */}
          <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Loading Ports (6 Ports)</h3>
            <div className="space-y-2">
              {loadingPorts.map((port) => (
                <div key={port.id} className="flex items-center justify-between py-2 px-3 bg-green-50 rounded">
                  <span className="text-sm font-medium text-gray-900">{port.id}</span>
                  <span className="text-xs text-gray-600">{port.name}</span>
                  <span className="text-xs font-semibold text-green-600">Unlimited Supply</span>
                </div>
              ))}
            </div>
          </div>

          {/* Constraints Info */}
          <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Operational Constraints</h3>
            <div className="space-y-3">
              <div className="flex items-start">
                <div className="shrink-0 h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center mt-0.5">
                  <span className="text-blue-600 text-xs font-bold">1</span>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">Single-port Full Loading</p>
                  <p className="text-xs text-gray-600">Each tanker loads full capacity from only one port</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="shrink-0 h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center mt-0.5">
                  <span className="text-blue-600 text-xs font-bold">2</span>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">Maximum Two-port Discharge</p>
                  <p className="text-xs text-gray-600">Tanker may unload at maximum of 2 ports per trip</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="shrink-0 h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center mt-0.5">
                  <span className="text-blue-600 text-xs font-bold">3</span>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">Unlimited Supply at Loading Ports</p>
                  <p className="text-xs text-gray-600">No supply constraints at any loading port</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="shrink-0 h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center mt-0.5">
                  <span className="text-blue-600 text-xs font-bold">4</span>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">Full Demand Satisfaction</p>
                  <p className="text-xs text-gray-600">All unloading port demands must be fully met</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results Section */}
      <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-lg p-6">

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 font-medium">Error: {error}</p>
          </div>
        )}

        {results && (
        <>
          {/* Summary Section */}
          <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-600 font-medium">Total Cost</p>
              <p className="text-2xl font-bold text-blue-900">₹{results.summary.total_cost_cr} Cr</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <p className="text-sm text-green-600 font-medium">Total Routes</p>
              <p className="text-2xl font-bold text-green-900">{results.summary.total_routes}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <p className="text-sm text-purple-600 font-medium">Volume Delivered</p>
              <p className="text-2xl font-bold text-purple-900">{results.summary.total_volume_mt.toLocaleString()} MT</p>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
              <p className="text-sm text-orange-600 font-medium">Demand Satisfied</p>
              <p className="text-2xl font-bold text-orange-900">{results.summary.demand_satisfaction_percentage}%</p>
            </div>
          </div>

          {/* Download Button */}
          <div className="mb-4 flex justify-end">
            <button
              onClick={downloadCSV}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-all flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download CSV
            </button>
          </div>

          {/* Results Table */}
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Source
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Destination
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tanker
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Volume (MT)
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Trip Cost (Rs Cr)
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {results.optimization_results.map((row, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {row.Source}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {row.Destination}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {row.Tanker}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {row['Volume (MT)'].toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                      ₹{row['Trip Cost (Rs Cr)'].toFixed(4)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 font-bold">
                <tr>
                  <td colSpan={3} className="px-6 py-4 text-sm text-gray-900">
                    TOTAL
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 text-right">
                    {results.summary.total_volume_mt.toLocaleString()} MT
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 text-right">
                    ₹{results.summary.total_cost_cr.toFixed(2)} Cr
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
          </>
        )}

        {!results && !loading && (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="mt-4 text-gray-600">Click "Run Optimization" to generate results</p>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
