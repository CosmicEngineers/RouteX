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
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Settings className="h-5 w-5 text-orange-600 mr-2" />
          Optimization Parameters
        </h3>

        <div className="space-y-4">
          {/* Fuel Price */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <DollarSign className="inline h-4 w-4 mr-1" />
              Fuel Price (₹ per MT)
            </label>
            <input
              type="number"
              value={fuelPrice}
              onChange={(e) => setFuelPrice(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              min="20000"
              max="80000"
              step="1000"
            />
            <p className="text-xs text-gray-500 mt-1">Current market rate: ₹42,000 - ₹48,000 per MT</p>
          </div>

          {/* Optimization Objective */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Target className="inline h-4 w-4 mr-1" />
              Optimization Objective
            </label>
            <select
              value={optimizationObjective}
              onChange={(e) => setOptimizationObjective(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="cost">Minimize Total Cost</option>
              <option value="time">Minimize Transit Time</option>
              <option value="emission">Minimize Emissions (EEOI)</option>
              <option value="utilization">Maximize Fleet Utilization</option>
            </select>
          </div>

          {/* Max Solve Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Calendar className="inline h-4 w-4 mr-1" />
              Max Solve Time (seconds)
            </label>
            <select
              value={maxSolveTime}
              onChange={(e) => setMaxSolveTime(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value={60}>1 minute (Quick)</option>
              <option value={180}>3 minutes (Balanced)</option>
              <option value={300}>5 minutes (Thorough)</option>
              <option value={600}>10 minutes (Comprehensive)</option>
            </select>
          </div>

          {/* Round Trip */}
          <div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isRoundTrip}
                onChange={(e) => setIsRoundTrip(e.target.checked)}
                className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
              />
              <span className="text-sm font-medium text-gray-700">
                Round Trip (Return to loading port)
              </span>
            </label>
            <p className="text-xs text-gray-500 mt-1 ml-6">
              {isRoundTrip ? 'Vessels will return to loading port after delivery (costs doubled)' : 'One-way trip only'}
            </p>
          </div>
        </div>
      </div>

      {/* Vessel Selection */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Select Vessels ({selectedVessels.length || availableVessels.length}/{vessels.length})
        </h3>

        <div className="space-y-2 max-h-48 overflow-y-auto">
          {availableVessels.map((vessel) => (
            <label key={vessel.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded">
              <input
                type="checkbox"
                checked={selectedVessels.length === 0 || selectedVessels.includes(vessel.id)}
                onChange={(e) => handleVesselSelection(vessel.id, e.target.checked)}
                className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900">{vessel.name}</div>
                <div className="text-xs text-gray-500">
                  {(vessel.capacity_mt / 1000).toFixed(0)}K MT • {vessel.current_port}
                </div>
              </div>
            </label>
          ))}
        </div>

        {availableVessels.length === 0 && (
          <div className="text-center py-4 text-gray-500">
            No available vessels for optimization
          </div>
        )}
      </div>

      {/* Demand Summary */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          November 2025 Demand Profile
        </h3>

        <div className="space-y-2 max-h-32 overflow-y-auto">
          {demands.map((demand) => (
            <div key={demand.port_id} className="flex justify-between items-center py-1">
              <div className="flex-1">
                <span className="text-sm font-medium">{demand.port_name}</span>
                <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                  demand.priority === 'critical' ? 'bg-red-100 text-red-700' :
                  demand.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {demand.priority}
                </span>
              </div>
              <span className="text-sm text-gray-600">
                {(demand.demand_mt / 1000).toFixed(0)}K MT
              </span>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Total Demand</span>
            <span className="font-medium">{(totalDemand / 1000).toFixed(0)}K MT</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Available Capacity</span>
            <span className="font-medium">{(totalCapacity / 1000).toFixed(0)}K MT</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Capacity Utilization</span>
            <span className={`font-medium ${
              totalCapacity > 0 && (totalDemand / totalCapacity) > 0.9 ? 'text-red-600' : 
              totalCapacity > 0 && (totalDemand / totalCapacity) > 0.8 ? 'text-orange-600' : 
              'text-green-600'
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
        className={`w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-colors ${
          isOptimizing || availableVessels.length === 0
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-orange-600 text-white hover:bg-orange-700'
        }`}
      >
        <Play className="h-5 w-5" />
        <span>
          {isOptimizing ? 'Optimizing...' : 'Start HPCL Fleet Optimization'}
        </span>
      </button>

      {availableVessels.length === 0 && (
        <div className="text-center text-sm text-gray-500">
          No available vessels. Check fleet status.
        </div>
      )}
    </div>
  );
}
