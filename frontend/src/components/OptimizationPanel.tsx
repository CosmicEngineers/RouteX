'use client';

import React, { useState } from 'react';
import { Play, Settings, Calendar, DollarSign, Target } from 'lucide-react';
import { HPCLVessel, HPCLPort } from './HPCLDashboard';

interface OptimizationPanelProps {
  vessels: HPCLVessel[];
  ports: HPCLPort[];
  onStartOptimization: (params: any) => void;
  isOptimizing: boolean;
}

export function OptimizationPanel({ vessels, ports, onStartOptimization, isOptimizing }: OptimizationPanelProps) {
  const [fuelPrice, setFuelPrice] = useState(45000); // ₹45,000 per MT
  const [optimizationObjective, setOptimizationObjective] = useState('cost');
  const [maxSolveTime, setMaxSolveTime] = useState(300); // 5 minutes
  const [selectedVessels, setSelectedVessels] = useState<string[]>([]);
  const [isRoundTrip, setIsRoundTrip] = useState(false);
  const [demands] = useState([
    { port_id: 'INCHE', port_name: 'Chennai', demand_mt: 45000, priority: 'high' },
    { port_id: 'INJAW', port_name: 'Jawaharlal Nehru Port', demand_mt: 55000, priority: 'critical' },
    { port_id: 'INMANG', port_name: 'Mangalore', demand_mt: 38000, priority: 'high' },
    { port_id: 'INTUT', port_name: 'Tuticorin', demand_mt: 32000, priority: 'medium' },
    { port_id: 'INDAH', port_name: 'Dahej', demand_mt: 28000, priority: 'medium' },
    { port_id: 'INENN', port_name: 'Ennore', demand_mt: 25000, priority: 'medium' },
    { port_id: 'INKAR', port_name: 'Kakinada', demand_mt: 35000, priority: 'high' }
  ]);

  const availableVessels = vessels.filter(v => v.status === 'available');
  const totalDemand = demands.reduce((sum, d) => sum + d.demand_mt, 0);
  const totalCapacity = (selectedVessels.length > 0 
    ? vessels.filter(v => selectedVessels.includes(v.id)) 
    : availableVessels
  ).reduce((sum, v) => sum + v.capacity_mt, 0);

  const handleVesselSelection = (vesselId: string, selected: boolean) => {
    if (selected) {
      setSelectedVessels([...selectedVessels, vesselId]);
    } else {
      setSelectedVessels(selectedVessels.filter(id => id !== vesselId));
    }
  };

  const handleOptimization = () => {
    const params = {
      demands,
      fuel_price_per_mt: fuelPrice,
      optimize_for: optimizationObjective,
      max_solve_time_seconds: maxSolveTime,
      available_vessels: selectedVessels.length > 0 ? selectedVessels : availableVessels.map(v => v.id),
      month: "2025-11",
      round_trip: isRoundTrip
    };
    
    onStartOptimization(params);
  };

  return (
    <div className="space-y-6">
      {/* Optimization Parameters */}
      <div className="glass-card rounded-xl border border-slate-700/50 p-8">
        <h3 className="text-xl font-semibold text-slate-100 mb-6 flex items-center">
          <Settings className="h-6 w-6 text-cyan-400 mr-2" />
          Optimization Parameters
        </h3>

        <div className="space-y-5">
          {/* Fuel Price */}
          <div>
            <label className="block text-base font-medium text-slate-200 mb-3">
              <DollarSign className="inline h-5 w-5 mr-1" />
              Fuel Price (₹ per MT)
            </label>
            <input
              type="number"
              value={fuelPrice}
              onChange={(e) => setFuelPrice(Number(e.target.value))}
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-lg text-slate-100 text-base focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              min="20000"
              max="80000"
              step="1000"
            />
            <p className="text-sm text-slate-400 mt-2">Current market rate: ₹42,000 - ₹48,000 per MT</p>
          </div>

          {/* Optimization Objective */}
          <div>
            <label className="block text-base font-medium text-slate-200 mb-3">
              <Target className="inline h-5 w-5 mr-1" />
              Optimization Objective
            </label>
            <select
              value={optimizationObjective}
              onChange={(e) => setOptimizationObjective(e.target.value)}
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-lg text-slate-100 text-base focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            >
              <option value="cost">Minimize Total Cost</option>
              <option value="time">Minimize Transit Time</option>
              <option value="emission">Minimize Emissions (EEOI)</option>
              <option value="utilization">Maximize Fleet Utilization</option>
            </select>
          </div>

          {/* Max Solve Time */}
          <div>
            <label className="block text-base font-medium text-slate-200 mb-3">
              <Calendar className="inline h-5 w-5 mr-1" />
              Max Solve Time (seconds)
            </label>
            <select
              value={maxSolveTime}
              onChange={(e) => setMaxSolveTime(Number(e.target.value))}
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-lg text-slate-100 text-base focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            >
              <option value={60}>1 minute (Quick)</option>
              <option value={180}>3 minutes (Balanced)</option>
              <option value={300}>5 minutes (Thorough)</option>
              <option value={600}>10 minutes (Comprehensive)</option>
            </select>
          </div>

          {/* Round Trip */}
          <div>
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isRoundTrip}
                onChange={(e) => setIsRoundTrip(e.target.checked)}
                className="h-5 w-5 text-cyan-500 focus:ring-cyan-500 border-slate-600 rounded bg-slate-800"
              />
              <span className="text-base font-medium text-slate-200">
                Round Trip (Return to loading port)
              </span>
            </label>
            <p className="text-sm text-slate-400 mt-2 ml-8">
              {isRoundTrip ? 'Vessels will return to loading port after delivery (costs doubled)' : 'One-way trip only'}
            </p>
          </div>
        </div>
      </div>

      {/* Vessel Selection */}
      <div className="glass-card rounded-xl border border-slate-700/50 p-8">
        <h3 className="text-xl font-semibold text-slate-100 mb-6">
          Select Vessels ({selectedVessels.length || availableVessels.length}/{vessels.length})
        </h3>

        <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
          {availableVessels.map((vessel) => (
            <label key={vessel.id} className="flex items-center space-x-3 p-4 hover:bg-slate-800/30 rounded-lg transition-colors">
              <input
                type="checkbox"
                checked={selectedVessels.length === 0 || selectedVessels.includes(vessel.id)}
                onChange={(e) => handleVesselSelection(vessel.id, e.target.checked)}
                className="h-5 w-5 text-cyan-500 focus:ring-cyan-500 border-slate-600 rounded bg-slate-800"
              />
              <div className="flex-1 min-w-0">
                <div className="text-base font-medium text-slate-100">{vessel.name}</div>
                <div className="text-sm text-slate-400">
                  {(vessel.capacity_mt / 1000).toFixed(0)}K MT • {vessel.current_port}
                </div>
              </div>
            </label>
          ))}
        </div>

        {availableVessels.length === 0 && (
          <div className="text-center py-6 text-slate-400 text-base">
            No available vessels for optimization
          </div>
        )}
      </div>

      {/* Demand Summary */}
      <div className="glass-card rounded-xl border border-slate-700/50 p-8">
        <h3 className="text-xl font-semibold text-slate-100 mb-6">
          November 2025 Demand Profile
        </h3>

        <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
          {demands.map((demand) => (
            <div key={demand.port_id} className="flex justify-between items-center py-3">
              <div className="flex-1">
                <span className="text-base font-medium text-slate-200">{demand.port_name}</span>
                <span className={`ml-2 px-3 py-1 text-sm rounded-full ${
                  demand.priority === 'critical' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                  demand.priority === 'high' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                  'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                }`}>
                  {demand.priority}
                </span>
              </div>
              <span className="text-base text-slate-300 font-medium">
                {(demand.demand_mt / 1000).toFixed(0)}K MT
              </span>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-6 border-t border-slate-700/50">
          <div className="flex justify-between text-base py-2">
            <span className="text-slate-300">Total Demand</span>
            <span className="font-semibold text-slate-100">{(totalDemand / 1000).toFixed(0)}K MT</span>
          </div>
          <div className="flex justify-between text-base py-2">
            <span className="text-slate-300">Available Capacity</span>
            <span className="font-semibold text-slate-100">{(totalCapacity / 1000).toFixed(0)}K MT</span>
          </div>
          <div className="flex justify-between text-base py-2">
            <span className="text-slate-300">Capacity Utilization</span>
            <span className={`font-semibold ${
              totalCapacity > 0 && (totalDemand / totalCapacity) > 0.9 ? 'text-red-400' : 
              totalCapacity > 0 && (totalDemand / totalCapacity) > 0.8 ? 'text-orange-400' : 
              'text-green-400'
            }`}>
              {totalCapacity > 0 ? ((totalDemand / totalCapacity) * 100).toFixed(1) : 0}%
            </span>
          </div>
        </div>
      </div>

      {/* Start Optimization Button */}
      <button
        onClick={handleOptimization}
        disabled={isOptimizing || availableVessels.length === 0}
        className={`w-full flex items-center justify-center space-x-2 py-4 px-4 rounded-lg font-semibold text-base transition-all ${
          isOptimizing || availableVessels.length === 0
            ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
            : 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white hover:shadow-lg hover:shadow-cyan-500/50'
        }`}
      >
        <Play className="h-6 w-6" />
        <span>
          {isOptimizing ? 'Optimizing...' : 'Start HPCL Fleet Optimization'}
        </span>
      </button>

      {availableVessels.length === 0 && (
        <div className="text-center text-base text-slate-400">
          No available vessels. Check fleet status.
        </div>
      )}
    </div>
  );
}
