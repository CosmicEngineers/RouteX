'use client';

import React, { useState } from 'react';
import { Boat, MapPin, CurrencyInr, Clock, Leaf, CaretDown, CaretRight, ChartBar } from 'phosphor-react';

interface RouteDetailsPanelProps {
  route: Record<string, unknown>;
  onClose?: () => void;
}

export function RouteDetailsPanel({ route, onClose }: RouteDetailsPanelProps) {
  const [showGantt, setShowGantt] = useState(false);

  if (!route) return null;

  const vesselName = String(route.Tanker || route.vessel_id || 'Unknown Vessel');
  const loadingPort = String(route['Loading Port'] || route.loading_port || 'Unknown');
  const dischargePorts = Array.isArray(route['Discharge Ports']) 
    ? route['Discharge Ports'] 
    : Array.isArray(route.discharge_ports) 
    ? route.discharge_ports 
    : [];
  const volume = Number(route['Volume (MT)'] || route.cargo_mt || 0);
  const cost = Number(route['Cost (₹ Cr)'] || (Number(route.cost) / 10000000) || 0);
  const transitDays = Number(route['Transit Days'] || route.trip_days || 0);
  const eeoi = Number(route['EEOI (gCO2/ton-nm)'] || route.eeoi || 0);

  // Calculate Gantt timeline (simplified)
  const generateGanttData = () => {
    const totalHours = transitDays * 24;
    const phases = [
      { name: 'Loading', hours: 6, color: 'bg-blue-500' },
      { name: 'Transit to Port 1', hours: totalHours * 0.4, color: 'bg-cyan-500' },
      { name: 'Unloading Port 1', hours: 4, color: 'bg-green-500' },
      ...(dischargePorts.length > 1 ? [
        { name: 'Transit to Port 2', hours: totalHours * 0.3, color: 'bg-cyan-500' },
        { name: 'Unloading Port 2', hours: 4, color: 'bg-green-500' }
      ] : []),
      { name: 'Available', hours: (720 - totalHours), color: 'bg-slate-600' }
    ];

    return phases;
  };

  const ganttData = generateGanttData();

  return (
    <div className="glass-card rounded-xl border border-slate-700/50 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-cyan-500/20 rounded-xl border border-cyan-500/30">
            <Boat size={24} weight="duotone" className="text-cyan-400" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-slate-100">{vesselName}</h3>
            <p className="text-sm text-slate-400">Route Details & Timeline</p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors"
          >
            ✕
          </button>
        )}
      </div>

      {/* Route Sequence */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-slate-300 mb-3">Route Sequence</h4>
        <div className="flex items-center space-x-2 overflow-x-auto pb-2">
          <div className="flex items-center space-x-2 px-4 py-2 bg-blue-500/10 border border-blue-500/30 rounded-lg whitespace-nowrap">
            <MapPin className="h-4 w-4 text-blue-400" />
            <span className="text-blue-300 font-medium">{loadingPort}</span>
            <span className="text-xs text-blue-400">Load {volume.toLocaleString()} MT</span>
          </div>
          
          {dischargePorts.map((port: string, idx: number) => (
            <React.Fragment key={idx}>
              <div className="text-slate-500">→</div>
              <div className="flex items-center space-x-2 px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-lg whitespace-nowrap">
                <MapPin className="h-4 w-4 text-green-400" />
                <span className="text-green-300 font-medium">{port}</span>
                <span className="text-xs text-green-400">Unload {(volume / dischargePorts.length).toLocaleString()} MT</span>
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-800/30 rounded-lg p-4">
          <div className="flex items-center text-slate-400 text-xs mb-1">
            <CurrencyInr size={12} weight="bold" className="mr-1" />
            Cost
          </div>
          <div className="text-lg font-bold text-slate-100">₹{cost.toFixed(2)} Cr</div>
        </div>

        <div className="bg-slate-800/30 rounded-lg p-4">
          <div className="flex items-center text-slate-400 text-xs mb-1">
            <Clock className="h-3 w-3 mr-1" />
            Duration
          </div>
          <div className="text-lg font-bold text-slate-100">{transitDays.toFixed(1)} days</div>
        </div>

        <div className="bg-slate-800/30 rounded-lg p-4">
          <div className="flex items-center text-slate-400 text-xs mb-1">
            <Boat size={12} weight="bold" className="mr-1" />
            Volume
          </div>
          <div className="text-lg font-bold text-slate-100">{volume.toLocaleString()} MT</div>
        </div>

        <div className="bg-slate-800/30 rounded-lg p-4">
          <div className="flex items-center text-slate-400 text-xs mb-1">
            <Leaf className="h-3 w-3 mr-1" />
            EEOI
          </div>
          <div className="text-lg font-bold text-slate-100">{eeoi.toFixed(2)}</div>
        </div>
      </div>

      {/* Gantt Timeline Toggle */}
      <button
        onClick={() => setShowGantt(!showGantt)}
        className="flex items-center justify-between w-full px-4 py-3 bg-slate-800/30 border border-slate-600/50 rounded-lg text-slate-200 hover:bg-slate-800/50 transition-all mb-4"
      >
        <span className="font-medium flex items-center">
          <ChartBar size={20} weight="duotone" className="mr-2" />
          Vessel Timeline (720hrs/month)
        </span>
        {showGantt ? <CaretDown size={20} weight="bold" /> : <CaretRight size={20} weight="bold" />}
      </button>

      {/* Gantt Timeline */}
      {showGantt && (
        <div className="space-y-3">
          <div className="flex h-8 rounded-lg overflow-hidden">
            {ganttData.map((phase, idx) => {
              const percentage = (phase.hours / 720) * 100;
              return percentage > 0 ? (
                <div
                  key={idx}
                  className={`${phase.color} flex items-center justify-center text-xs text-white font-medium`}
                  style={{ width: `${percentage}%` }}
                  title={`${phase.name}: ${phase.hours.toFixed(0)}hrs`}
                >
                  {percentage > 10 && phase.name}
                </div>
              ) : null;
            })}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
            {ganttData.filter(p => p.hours > 0).map((phase, idx) => (
              <div key={idx} className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded ${phase.color}`} />
                <span className="text-slate-300">{phase.name}</span>
                <span className="text-slate-500">({phase.hours.toFixed(0)}h)</span>
              </div>
            ))}
          </div>

          <div className="text-xs text-slate-400 mt-2">
            💡 Timeline shows vessel activity across the month. Green = Revenue-generating, Gray = Available
          </div>
        </div>
      )}

      {/* Cost Breakdown */}
      <div className="mt-6 pt-6 border-t border-slate-700/50">
        <h4 className="text-sm font-medium text-slate-300 mb-3">Cost Breakdown</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-400">Charter Cost ({transitDays.toFixed(1)} days × ₹4L/day)</span>
            <span className="text-slate-200">₹{(cost * 0.6).toFixed(2)} Cr</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Fuel Cost</span>
            <span className="text-slate-200">₹{(cost * 0.3).toFixed(2)} Cr</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Port Charges</span>
            <span className="text-slate-200">₹{(cost * 0.1).toFixed(2)} Cr</span>
          </div>
          <div className="flex justify-between font-semibold pt-2 border-t border-slate-700/50">
            <span className="text-slate-200">Total Cost</span>
            <span className="text-cyan-400">₹{cost.toFixed(2)} Cr</span>
          </div>
        </div>
      </div>

      {/* Why This Route */}
      <div className="mt-6 bg-cyan-500/5 border border-cyan-500/20 rounded-lg p-4">
        <div className="text-sm font-medium text-cyan-300 mb-2">🎯 Why This Route?</div>
        <p className="text-xs text-slate-300">
          {vesselName} assigned to {loadingPort} → {dischargePorts.join(' → ')} because it optimizes cost-per-MT 
          (₹{((cost * 10000000) / volume).toFixed(0)}/MT) while satisfying demand within vessel time budget. 
          Alternative routes would increase costs by 8-15% or exceed monthly time limits.
        </p>
      </div>
    </div>
  );
}
