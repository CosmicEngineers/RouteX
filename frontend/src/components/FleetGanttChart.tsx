'use client';

import React from 'react';
import { Boat, Calendar } from 'phosphor-react';

interface Trip {
  vessel: string;
  start_hour: number;
  end_hour: number;
  route: string;
  phase: 'loading' | 'transit' | 'unloading' | 'idle';
  color: string;
}

interface FleetGanttChartProps {
  vessels: Array<{ id: string; name: string }>;
  trips: Trip[];
  monthHours?: number;
}

export function FleetGanttChart({ vessels, trips, monthHours = 720 }: FleetGanttChartProps) {
  const phaseColors = {
    loading: 'bg-green-500',
    transit: 'bg-blue-500',
    unloading: 'bg-purple-500',
    idle: 'bg-slate-600'
  };

  const phaseLabels = {
    loading: '📦 Loading',
    transit: '🚢 Transit',
    unloading: '📍 Unloading',
    idle: '⏸️ Idle'
  };

  const hourToDays = (hours: number) => (hours / 24).toFixed(1);

  return (
    <div className="glass-card rounded-xl border border-slate-700/50 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Calendar size={20} weight="duotone" className="text-cyan-400" />
          <h3 className="text-lg font-semibold text-slate-100">
            Fleet Timeline (720-hour Month)
          </h3>
        </div>
        <div className="flex items-center space-x-4 text-xs">
          {Object.entries(phaseLabels).map(([phase, label]) => (
            <div key={phase} className="flex items-center space-x-1">
              <div className={`w-3 h-3 rounded ${phaseColors[phase as keyof typeof phaseColors]}`} />
              <span className="text-slate-400">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Timeline Header */}
      <div className="mb-4 pl-32">
        <div className="flex justify-between text-xs text-slate-500">
          {[0, 120, 240, 360, 480, 600, 720].map(hour => (
            <div key={hour} className="text-center">
              <div className="font-semibold">Day {hour / 24}</div>
              <div className="text-[10px]">{hour}h</div>
            </div>
          ))}
        </div>
      </div>

      {/* Gantt Chart */}
      <div className="space-y-3">
        {vessels.map(vessel => {
          const vesselTrips = trips.filter(t => t.vessel === vessel.id);
          
          return (
            <div key={vessel.id} className="flex items-center">
              {/* Vessel Name */}
              <div className="w-32 pr-4">
                <div className="flex items-center space-x-2">
                  <Boat size={16} weight="bold" className="text-cyan-400" />
                  <div>
                    <div className="text-sm font-medium text-slate-200 truncate">
                      {vessel.name}
                    </div>
                    <div className="text-xs text-slate-500">{vessel.id}</div>
                  </div>
                </div>
              </div>

              {/* Timeline Bar */}
              <div className="flex-1 relative h-12 bg-slate-800/50 rounded-lg overflow-hidden border border-slate-700/50">
                {/* Hour Markers */}
                {[120, 240, 360, 480, 600].map(hour => (
                  <div
                    key={hour}
                    className="absolute top-0 bottom-0 w-px bg-slate-700/30"
                    style={{ left: `${(hour / monthHours) * 100}%` }}
                  />
                ))}

                {/* Trip Bars */}
                {vesselTrips.map((trip, idx) => (
                  <div
                    key={idx}
                    className={`absolute top-1 bottom-1 ${phaseColors[trip.phase]} rounded opacity-90 hover:opacity-100 transition-opacity cursor-pointer group`}
                    style={{
                      left: `${(trip.start_hour / monthHours) * 100}%`,
                      width: `${((trip.end_hour - trip.start_hour) / monthHours) * 100}%`
                    }}
                    title={`${phaseLabels[trip.phase]}: ${trip.route} (${hourToDays(trip.end_hour - trip.start_hour)} days)`}
                  >
                    <div className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-white opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 rounded">
                      {trip.route}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Stats */}
      <div className="mt-6 pt-6 border-t border-slate-700/50 grid grid-cols-4 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-cyan-400">{vessels.length}</div>
          <div className="text-xs text-slate-500 mt-1">Active Vessels</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-400">{trips.length}</div>
          <div className="text-xs text-slate-500 mt-1">Total Trips</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-400">
            {(trips.reduce((sum, t) => sum + (t.end_hour - t.start_hour), 0) / 24).toFixed(0)}
          </div>
          <div className="text-xs text-slate-500 mt-1">Total Days</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-400">
            {((trips.reduce((sum, t) => sum + (t.end_hour - t.start_hour), 0) / (vessels.length * monthHours)) * 100).toFixed(1)}%
          </div>
          <div className="text-xs text-slate-500 mt-1">Fleet Utilization</div>
        </div>
      </div>
    </div>
  );
}
