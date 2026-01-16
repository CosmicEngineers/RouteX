'use client';

import React, { useState } from 'react';
import { Target, Clock, Lightning, Warning, CaretDown, CaretUp, CurrencyInr } from 'phosphor-react';
import { HPCLVessel, HPCLPort } from './HPCLDashboard';
import { MultiObjectiveControls } from './MultiObjectiveControls';

interface EnhancedOptimizationPanelProps {
  availableVessels: HPCLVessel[];
  availablePorts: HPCLPort[];
  onStartOptimization: (params: Record<string, unknown>) => void;
}

const presetConfigs = {
  quick: { name: 'Quick', time: 30, workers: 2, description: 'Fast results for demos' },
  balanced: { name: 'Balanced', time: 120, workers: 4, description: 'Good quality, reasonable time' },
  thorough: { name: 'Thorough', time: 300, workers: 8, description: 'High quality optimization' },
  production: { name: 'Production', time: 600, workers: 8, description: 'Best results for planning' }
};

export function EnhancedOptimizationPanel({ availableVessels, availablePorts: _availablePorts, onStartOptimization }: EnhancedOptimizationPanelProps) {
  const [selectedPreset, setSelectedPreset] = useState('balanced');
  const [fuelPrice, setFuelPrice] = useState(45000);
  const [maxSolveTime, setMaxSolveTime] = useState(120);
  const [optimizationObjective, setOptimizationObjective] = useState('cost');
  const [selectedVessels, _setSelectedVessels] = useState<string[]>([]);
  const [isRoundTrip, setIsRoundTrip] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [multiObjectiveWeights, setMultiObjectiveWeights] = useState({
    cost: 70,
    time: 15,
    utilization: 10,
    emissions: 5
  });
  
  const [demands] = useState({
    'Chennai': 45000,
    'Tuticorin': 32000,
    'Calicut': 28000,
    'Mangalore': 38000,
    'Goa': 25000,
    'Jawaharlal Nehru Port': 42000,
    'Dahej': 35000,
    'Okha': 22000,
    'Ennore': 40000,
    'Dhamra': 30000,
    'Kakinada': 33000
  });

  const handlePresetChange = (preset: string) => {
    setSelectedPreset(preset);
    const config = presetConfigs[preset as keyof typeof presetConfigs];
    setMaxSolveTime(config.time);
  };

  const validateInputs = () => {
    const warnings: string[] = [];
    const totalCapacity = availableVessels.reduce((sum, v) => sum + v.capacity_mt, 0);
    const totalDemand = Object.values(demands).reduce((sum, d) => sum + d, 0);

    if (totalDemand > totalCapacity * 2) {
      warnings.push(`Total demand (${totalDemand.toLocaleString()} MT) exceeds 2x fleet capacity. Consider adding vessels.`);
    }

    if (fuelPrice < 35000 || fuelPrice > 55000) {
      warnings.push(`Fuel price ₹${fuelPrice.toLocaleString()} is outside typical range (₹35k-55k). Verify accuracy.`);
    }

    if (maxSolveTime < 60) {
      warnings.push('Solve time < 60s may produce suboptimal results. Consider using "Balanced" preset.');
    }

    return warnings;
  };

  const validationWarnings = validateInputs();

  const handleOptimization = () => {
    const params = {
      demands,
      fuel_price_per_mt: fuelPrice,
      optimize_for: optimizationObjective,
      max_solve_time_seconds: maxSolveTime,
      available_vessels: selectedVessels.length > 0 ? selectedVessels : availableVessels.map(v => v.id),
      month: "2025-11",
      round_trip: isRoundTrip,
      multi_objective_weights: multiObjectiveWeights,
      solver_preset: selectedPreset
    };

    onStartOptimization(params);
  };

  const totalCapacity = availableVessels.reduce((sum, v) => sum + v.capacity_mt, 0);
  const totalDemand = Object.values(demands).reduce((sum, d) => sum + d, 0);

  return (
    <div className="space-y-6">
      {/* Solver Preset Selector */}
      <div className="glass-card rounded-xl border border-slate-700/50 p-6" id="solver-preset">
        <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center">
          <Lightning size={20} weight="duotone" className="text-cyan-400 mr-2" />
          Solver Presets
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(presetConfigs).map(([key, preset]) => (
            <button
              key={key}
              onClick={() => handlePresetChange(key)}
              className={`p-4 rounded-lg border-2 transition-all ${
                selectedPreset === key
                  ? 'border-cyan-500 bg-cyan-500/10 text-cyan-300'
                  : 'border-slate-700/50 bg-slate-800/30 text-slate-400 hover:border-slate-600'
              }`}
            >
              <div className="font-semibold mb-1">{preset.name}</div>
              <div className="text-xs opacity-75">{preset.time}s • {preset.workers}w</div>
              <div className="text-xs mt-1 opacity-60">{preset.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Validation Warnings */}
      {validationWarnings.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
          <div className="flex items-start space-x-3">
            <Warning size={20} weight="duotone" className="text-amber-400 mt-0.5" />
            <div className="flex-1">
              <div className="font-semibold text-amber-300 mb-2">Input Validation Warnings:</div>
              <ul className="space-y-1 text-sm text-amber-200">
                {validationWarnings.map((warning, idx) => (
                  <li key={idx}>• {warning}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Capacity Overview */}
      <div className="glass-card rounded-xl border border-slate-700/50 p-6">
        <h3 className="text-lg font-semibold text-slate-100 mb-4">Fleet Capacity vs Demand</h3>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Total Fleet Capacity:</span>
            <span className="font-semibold text-slate-200">{totalCapacity.toLocaleString()} MT</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Total Demand:</span>
            <span className="font-semibold text-slate-200">{totalDemand.toLocaleString()} MT</span>
          </div>
          <div className="h-4 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                totalDemand > totalCapacity
                  ? 'bg-gradient-to-r from-amber-500 to-red-500'
                  : 'bg-gradient-to-r from-cyan-500 to-blue-500'
              }`}
              style={{ width: `${Math.min(100, (totalDemand / totalCapacity) * 100)}%` }}
            />
          </div>
          <div className="text-xs text-slate-500 text-center">
            {totalDemand > totalCapacity
              ? `⚠️ Demand exceeds capacity by ${(totalDemand - totalCapacity).toLocaleString()} MT`
              : `✓ ${((totalCapacity - totalDemand) / 1000).toFixed(0)}k MT spare capacity`}
          </div>
        </div>
      </div>

      {/* Multi-Objective Controls */}
      <MultiObjectiveControls
        weights={multiObjectiveWeights}
        onWeightChange={(objective, value) => {
          setMultiObjectiveWeights(prev => ({ ...prev, [objective]: value }));
        }}
      />

      {/* Basic Parameters */}
      <div className="glass-card rounded-xl border border-slate-700/50 p-6" id="optimization-panel">
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">
              <CurrencyInr size={16} weight="duotone" className="inline mr-1" />
              Fuel Price (₹ per MT)
            </label>
            <input
              type="number"
              value={fuelPrice}
              onChange={(e) => setFuelPrice(Number(e.target.value))}
              className="w-full px-4 py-2 bg-slate-800/50 border border-slate-600/50 rounded-lg text-slate-100 focus:ring-2 focus:ring-cyan-500"
              min="20000"
              max="80000"
              step="1000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">
              <Target size={16} weight="duotone" className="inline mr-1" />
              Primary Objective
            </label>
            <select
              value={optimizationObjective}
              onChange={(e) => setOptimizationObjective(e.target.value)}
              className="w-full px-4 py-2 bg-slate-800/50 border border-slate-600/50 rounded-lg text-slate-100"
            >
              <option value="cost">Minimize Cost</option>
              <option value="time">Minimize Time</option>
              <option value="emissions">Minimize Emissions</option>
              <option value="utilization">Maximize Utilization</option>
            </select>
          </div>

          {/* Advanced Options Toggle */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center justify-between w-full px-4 py-3 bg-slate-800/30 rounded-lg text-slate-300 hover:bg-slate-800/50 transition-all"
          >
            <span className="font-medium">Advanced Parameters</span>
            {showAdvanced ? <CaretUp size={16} weight="bold" /> : <CaretDown size={16} weight="bold" />}
          </button>

          {/* Collapsible Advanced Section */}
          {showAdvanced && (
            <div className="space-y-4 pt-4 border-t border-slate-700/50">
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">
                  <Clock className="inline h-4 w-4 mr-1" />
                  Max Solve Time (seconds)
                </label>
                <input
                  type="number"
                  value={maxSolveTime}
                  onChange={(e) => setMaxSolveTime(Number(e.target.value))}
                  className="w-full px-4 py-2 bg-slate-800/50 border border-slate-600/50 rounded-lg text-slate-100"
                  min="30"
                  max="600"
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="round-trip"
                  checked={isRoundTrip}
                  onChange={(e) => setIsRoundTrip(e.target.checked)}
                  className="w-4 h-4 text-cyan-500 bg-slate-800 border-slate-600 rounded"
                />
                <label htmlFor="round-trip" className="text-sm text-slate-300">
                  Enable Round Trip Mode (2x costs)
                </label>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Run Optimization Button */}
      <button
        onClick={handleOptimization}
        className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 rounded-xl text-white font-semibold text-lg shadow-lg shadow-cyan-500/50 transition-all"
      >
        🚀 Run Optimization
      </button>
    </div>
  );
}
