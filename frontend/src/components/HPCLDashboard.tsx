'use client';

import React, { useState, useEffect } from 'react';
import { Boat, MapPin, Activity, CurrencyInr, GasPump, ChartBar, Gear, Play, Pause, WarningCircle, CheckCircle, MapTrifold, Compass, Lightning } from 'phosphor-react';
// Removed ImprovedHeader - using floating dock instead
import { FleetOverview } from './FleetOverview';
import { OptimizationPanel } from './OptimizationPanel';
import { MaritimeMap } from './MaritimeMap';
import { ResultsDisplay } from './ResultsDisplay';
import { ChallengeOutput } from './ChallengeOutput';
import { RunStatusCard } from './RunStatusCard';
import { GuidedTour } from './GuidedTour';
import { RunHistory } from './RunHistory';
import { EnhancedErrorDisplay } from './EnhancedErrorDisplay';
import { OptimizationLoadingState } from './LoadingSkeleton';
import { formatNumber } from '../utils/formatters';

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

export default function HPCLDashboard() {
  // Hardcoded HPCL data for demo mode
  const [vessels, setVessels] = useState<HPCLVessel[]>([]);
  const [ports, setPorts] = useState<HPCLPort[]>([]);
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [systemStatus, setSystemStatus] = useState<'connecting' | 'connected' | 'error'>('connected');
  const [activeTab, setActiveTab] = useState<'overview' | 'optimize' | 'results' | 'analytics' | 'challenge'>('challenge');
  const [optimizationError, setOptimizationError] = useState<any>(null);
  const [currentResultId, setCurrentResultId] = useState<string | null>(null);

  // Route visualization states
  const [currentRouteIndex, setCurrentRouteIndex] = useState(0);
  const [isPlayingRoutes, setIsPlayingRoutes] = useState(false);
  const [showLiveStatus, setShowLiveStatus] = useState(false);

  // Load saved data from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedResult = localStorage.getItem('hpcl_optimization_result');
      const savedActiveTab = localStorage.getItem('hpcl_active_tab');
      
      if (savedResult) {
        try {
          setOptimizationResult(JSON.parse(savedResult));
        } catch (e) {
          console.error('Failed to load saved optimization result:', e);
        }
      }
      
      if (savedActiveTab) {
        setActiveTab(savedActiveTab as any);
      }
    }
    
    loadMockData();
  }, []);

  // Mock optimization results with step-by-step routes (like your example)
  const mockOptimizationResult = {
    totalCost: 48000000, // ₹48 Lakhs
    totalDuration: 12, // days
    manualCost: 90000000, // ₹90 Lakhs (manual planning)
    savings: 42000000, // ₹42 Lakhs saved
    savingsPercentage: 46.7,
    routes: [
      {
        id: 'route-1',
        vessel: 'HPCL-CT-002', // Economy Ship
        vesselName: 'HPCL Ocean Pride',
        capacity: 28000,
        dailyRate: 400000, // ₹4 Lakhs/day
        sequence: 1,
        duration: 4, // days
        cost: 1600000, // ₹16 Lakhs
        cargo: 15000,
        route: [
          { port: 'Mumbai', type: 'loading', lat: 18.9667, lon: 72.8333, action: 'Load 15,000 MT' },
          { port: 'Kochi', type: 'unloading', lat: 9.9667, lon: 76.2833, action: 'Deliver 15,000 MT' }
        ],
        description: 'Ship B delivers 15,000 MT to Port 1 (Kochi)',
        color: '#3B82F6' // Blue
      },
      {
        id: 'route-2', 
        vessel: 'HPCL-CT-002',
        vesselName: 'HPCL Ocean Pride',
        capacity: 28000,
        dailyRate: 400000,
        sequence: 2,
        duration: 4,
        cost: 1600000,
        cargo: 15000,
        route: [
          { port: 'Mumbai', type: 'loading', lat: 18.9667, lon: 72.8333, action: 'Load 15,000 MT' },
          { port: 'Tuticorin', type: 'unloading', lat: 8.8, lon: 78.15, action: 'Deliver 15,000 MT' }
        ],
        description: 'Ship B delivers 15,000 MT to Port 2 (Tuticorin)',
        color: '#10B981' // Green
      },
      {
        id: 'route-3',
        vessel: 'HPCL-CT-002',
        vesselName: 'HPCL Ocean Pride', 
        capacity: 28000,
        dailyRate: 400000,
        sequence: 3,
        duration: 4,
        cost: 1600000,
        cargo: 10000,
        route: [
          { port: 'Mumbai', type: 'loading', lat: 18.9667, lon: 72.8333, action: 'Load 10,000 MT' },
          { port: 'Mangalore', type: 'unloading', lat: 12.85, lon: 74.85, action: 'Deliver 10,000 MT' }
        ],
        description: 'Ship B delivers 10,000 MT to Port 3 (Mangalore)',
        color: '#F59E0B' // Yellow
      }
    ]
  };

  // Route navigation functions
  const goToNextRoute = () => {
    if (currentRouteIndex < mockOptimizationResult.routes.length - 1) {
      setCurrentRouteIndex(prev => prev + 1);
    }
  };

  const goToPrevRoute = () => {
    if (currentRouteIndex > 0) {
      setCurrentRouteIndex(prev => prev - 1);
    }
  };

  const goToRoute = (index: number) => {
    if (index >= 0 && index < mockOptimizationResult.routes.length) {
      setCurrentRouteIndex(index);
    }
  };

  // Auto-play through routes
  useEffect(() => {
    if (isPlayingRoutes && !showLiveStatus) {
      const interval = setInterval(() => {
        setCurrentRouteIndex(prev => {
          if (prev >= mockOptimizationResult.routes.length - 1) {
            setIsPlayingRoutes(false);
            return 0;
          }
          return prev + 1;
        });
      }, 4000); // Change route every 4 seconds
      return () => clearInterval(interval);
    }
  }, [isPlayingRoutes, showLiveStatus]);

  // Load initial data from API
  const loadInitialData = async () => {
    // Demo mode - use mock data only
    loadMockData();
  };

  // Load mock data for development/demo
  const loadMockData = () => {
    const mockVessels: HPCLVessel[] = [
      { id: 'HPCL-CT-001', name: 'HPCL Coastal Spirit', capacity_mt: 32000, status: 'available', current_port: 'Mumbai' },
      { id: 'HPCL-CT-002', name: 'HPCL Ocean Pride', capacity_mt: 28000, status: 'sailing', current_port: 'Kandla' },
      { id: 'HPCL-CT-003', name: 'HPCL Maritime Excel', capacity_mt: 35000, status: 'available', current_port: 'Visakhapatnam' },
      { id: 'HPCL-CT-004', name: 'HPCL Coastal Warrior', capacity_mt: 30000, status: 'available', current_port: 'Kochi' },
      { id: 'HPCL-CT-005', name: 'HPCL Blue Navigator', capacity_mt: 25000, status: 'maintenance', current_port: 'Chennai' },
      { id: 'HPCL-CT-006', name: 'HPCL Eastern Star', capacity_mt: 33000, status: 'available', current_port: 'Haldia' },
      { id: 'HPCL-CT-007', name: 'HPCL Western Gem', capacity_mt: 27000, status: 'sailing', current_port: 'Goa' },
      { id: 'HPCL-CT-008', name: 'HPCL Southern Belle', capacity_mt: 29000, status: 'available', current_port: 'Tuticorin' },
      { id: 'HPCL-CT-009', name: 'HPCL Coastal Champion', capacity_mt: 31000, status: 'available', current_port: 'Paradip' }
    ];

    const mockPorts: HPCLPort[] = [
      // Loading Ports
      { id: 'INMUN', name: 'Mumbai', type: 'loading', latitude: 18.9667, longitude: 72.8333, state: 'Maharashtra' },
      { id: 'INKAN', name: 'Kandla', type: 'loading', latitude: 23.0333, longitude: 70.2167, state: 'Gujarat' },
      { id: 'INVIZ', name: 'Visakhapatnam', type: 'loading', latitude: 17.7, longitude: 83.3, state: 'Andhra Pradesh' },
      { id: 'INHAL', name: 'Haldia', type: 'loading', latitude: 22.0667, longitude: 88.1, state: 'West Bengal' },
      { id: 'INPAR', name: 'Paradip', type: 'loading', latitude: 20.2667, longitude: 86.6167, state: 'Odisha' },
      { id: 'INKOC', name: 'Kochi', type: 'loading', latitude: 9.9667, longitude: 76.2833, state: 'Kerala' },
      // Unloading Ports  
      { id: 'INCHE', name: 'Chennai', type: 'unloading', latitude: 13.0833, longitude: 80.2833, state: 'Tamil Nadu' },
      { id: 'INTUT', name: 'Tuticorin', type: 'unloading', latitude: 8.8, longitude: 78.15, state: 'Tamil Nadu' },
      { id: 'INCAL', name: 'Calicut', type: 'unloading', latitude: 11.25, longitude: 75.7833, state: 'Kerala' },
      { id: 'INMANG', name: 'Mangalore', type: 'unloading', latitude: 12.85, longitude: 74.85, state: 'Karnataka' },
      { id: 'INGOA', name: 'Goa', type: 'unloading', latitude: 15.4833, longitude: 73.8167, state: 'Goa' },
      { id: 'INJAW', name: 'Jawaharlal Nehru Port', type: 'unloading', latitude: 18.9333, longitude: 72.95, state: 'Maharashtra' },
      { id: 'INDAH', name: 'Dahej', type: 'unloading', latitude: 21.7, longitude: 72.6, state: 'Gujarat' },
      { id: 'INORK', name: 'Okha', type: 'unloading', latitude: 22.4667, longitude: 69.0833, state: 'Gujarat' },
      { id: 'INENN', name: 'Ennore', type: 'unloading', latitude: 13.2167, longitude: 80.3167, state: 'Tamil Nadu' },
      { id: 'INDHA', name: 'Dhamra', type: 'unloading', latitude: 20.9167, longitude: 87.0333, state: 'Odisha' },
      { id: 'INKAR', name: 'Kakinada', type: 'unloading', latitude: 16.9333, longitude: 82.2167, state: 'Andhra Pradesh' }
    ];

    setVessels(mockVessels);
    setPorts(mockPorts);
    setSystemStatus('connected');
  };

  // Start optimization
  const startOptimization = async (optimizationParams: any) => {
    setIsOptimizing(true);
    const isRoundTrip = optimizationParams?.round_trip || false;
    
    // Demo mode - use mock result after delay
    setTimeout(() => {
      // Base routes data
      const baseRoutes = [
        { Source: 'Vizag', Destination: 'Chennai', Tanker: 'HPCL Pride', 'Volume (MT)': 25000, 'Trip Cost (Rs Cr)': 0.45, 'Transit Days': 2.5 },
        { Source: 'Mumbai', Destination: 'Mangalore', Tanker: 'HPCL Spirit', 'Volume (MT)': 30000, 'Trip Cost (Rs Cr)': 0.52, 'Transit Days': 3.2 },
        { Source: 'Paradip', Destination: 'Tuticorin', Tanker: 'HPCL Fortune', 'Volume (MT)': 28000, 'Trip Cost (Rs Cr)': 0.58, 'Transit Days': 4.1 },
        { Source: 'Kochi', Destination: 'Jawaharlal Nehru Port', Tanker: 'HPCL Valor', 'Volume (MT)': 32000, 'Trip Cost (Rs Cr)': 0.62, 'Transit Days': 3.8 },
        { Source: 'Vizag', Destination: 'Ennore', Tanker: 'HPCL Victory', 'Volume (MT)': 27000, 'Trip Cost (Rs Cr)': 0.48, 'Transit Days': 1.8 },
        { Source: 'Mumbai', Destination: 'Dahej', Tanker: 'HPCL Triumph', 'Volume (MT)': 29000, 'Trip Cost (Rs Cr)': 0.41, 'Transit Days': 1.5 },
        { Source: 'Paradip', Destination: 'Kakinada', Tanker: 'HPCL Progress', 'Volume (MT)': 26000, 'Trip Cost (Rs Cr)': 0.38, 'Transit Days': 2.2 },
        { Source: 'Kochi', Destination: 'Calicut', Tanker: 'HPCL Enterprise', 'Volume (MT)': 24000, 'Trip Cost (Rs Cr)': 0.35, 'Transit Days': 1.2 },
        { Source: 'Vizag', Destination: 'Dhamra', Tanker: 'HPCL Navigator', 'Volume (MT)': 31000, 'Trip Cost (Rs Cr)': 0.44, 'Transit Days': 2.8 },
        { Source: 'Mumbai', Destination: 'Goa', Tanker: 'HPCL Explorer', 'Volume (MT)': 28500, 'Trip Cost (Rs Cr)': 0.39, 'Transit Days': 1.9 },
        { Source: 'Paradip', Destination: 'Chennai', Tanker: 'HPCL Voyager', 'Volume (MT)': 29500, 'Trip Cost (Rs Cr)': 0.53, 'Transit Days': 3.5 },
        { Source: 'Kochi', Destination: 'Tuticorin', Tanker: 'HPCL Pioneer', 'Volume (MT)': 27500, 'Trip Cost (Rs Cr)': 0.46, 'Transit Days': 2.1 },
        { Source: 'Vizag', Destination: 'Mangalore', Tanker: 'HPCL Endeavor', 'Volume (MT)': 30500, 'Trip Cost (Rs Cr)': 0.61, 'Transit Days': 4.5 },
        { Source: 'Mumbai', Destination: 'Okha', Tanker: 'HPCL Champion', 'Volume (MT)': 26500, 'Trip Cost (Rs Cr)': 0.42, 'Transit Days': 2.4 },
        { Source: 'Paradip', Destination: 'Jawaharlal Nehru Port', Tanker: 'HPCL Liberty', 'Volume (MT)': 32500, 'Trip Cost (Rs Cr)': 0.68, 'Transit Days': 5.2 },
        { Source: 'Kochi', Destination: 'Ennore', Tanker: 'HPCL Horizon', 'Volume (MT)': 28000, 'Trip Cost (Rs Cr)': 0.57, 'Transit Days': 3.1 },
        { Source: 'Vizag', Destination: 'Goa', Tanker: 'HPCL Destiny', 'Volume (MT)': 29000, 'Trip Cost (Rs Cr)': 0.59, 'Transit Days': 4.0 }
      ];
      
      // Apply round trip multiplier if enabled (costs doubled for return journey)
      const routes = isRoundTrip 
        ? baseRoutes.map(r => ({
            ...r, 
            'Trip Cost (Rs Cr)': r['Trip Cost (Rs Cr)'] * 2,
            'Transit Days': r['Transit Days'] * 2
          }))
        : baseRoutes;
      
      // Calculate actual total cost from routes (in Rs, not Cr)
      const totalCostCr = routes.reduce((sum, r) => sum + r['Trip Cost (Rs Cr)'], 0);
      const totalCostRs = totalCostCr * 10000000; // Convert Cr to Rs
      
      const result = {
        request_id: 'demo_' + Date.now(),
        total_cost: totalCostRs,
        fleet_utilization: 87.5,
        demand_satisfaction_rate: 98.2,
        routes_generated: routes.length * 3, // Simulated: 3x routes were considered
        selected_routes: routes,
        summary: {
          round_trip: isRoundTrip,
          total_cost_cr: totalCostCr.toFixed(2)
        }
      };
      
      setOptimizationResult(result);
      
      // Save to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('hpcl_optimization_result', JSON.stringify(result));
      }
      
      setIsOptimizing(false);
      setActiveTab('results');
    }, 3000);
  };

  // Poll optimization status (demo mode - not used)
  const pollOptimizationStatus = async (taskId: string) => {
    // Demo mode - not needed
  };

  return (
    <div className="min-h-screen text-slate-100 relative">
      {/* Maritime Background Image Layer - Full Coverage */}
      <div 
        className="fixed inset-0 w-full h-full bg-cover bg-center bg-no-repeat bg-fixed"
        style={{
          backgroundImage: 'url(/hermansyah-j1WmK7_KpQI-unsplash.jpg)',
          zIndex: -20
        }}
      ></div>
      
      {/* Dark Overlay for Readability */}
      <div 
        className="fixed inset-0 w-full h-full"
        style={{
          background: 'linear-gradient(to bottom, rgba(0, 21, 41, 0.85), rgba(15, 23, 42, 0.75), rgba(2, 6, 23, 0.9))',
          zIndex: -19
        }}
      ></div>
      
      {/* Enhanced Maritime Tactical Background - Lighter Navy to Black Radial Gradient Overlay */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-950/30 via-transparent to-transparent" style={{ zIndex: -18 }}></div>
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-cyan-950/20 via-transparent to-transparent" style={{ zIndex: -17 }}></div>
      
      {/* Single Row Header */}
      <div className="fixed top-6 left-6 right-6 z-50 flex items-center justify-between gap-4">
        {/* Brand Badge - Left */}
        <div className="glass-card rounded-2xl p-4 border border-cyan-500/30 shadow-2xl shadow-cyan-500/20">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-xl blur-lg opacity-75"></div>
              <div className="relative bg-gradient-to-br from-blue-600 to-cyan-500 p-2.5 rounded-xl">
                <Boat size={24} weight="duotone" className="text-white" />
              </div>
            </div>
            <div>
              <div className="text-sm font-black tracking-tight bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">HPCL RouteX</div>
              <div className="text-xs text-slate-400 flex items-center gap-1">
                <Lightning size={12} weight="bold" className="text-cyan-400" />
                Command Center
              </div>
            </div>
          </div>
        </div>

        {/* Centered Navigation */}
        <div className="glass-card rounded-full px-3 py-3 border border-slate-700/50 shadow-2xl shadow-blue-500/20">
          <div className="flex items-center gap-2">
            {[
              { id: 'challenge', name: 'Optimizer', icon: ChartBar, tooltip: 'Route Optimization & Cost Calculator' },
              { id: 'overview', name: 'Fleet', icon: Boat, tooltip: 'View Available Coastal Tankers' },
              { id: 'optimize', name: 'Configure', icon: Compass, tooltip: 'Advanced Optimization Settings' },
              { id: 'results', name: 'Results', icon: CheckCircle, tooltip: 'View Optimized Routes & Costs' },
              { id: 'analytics', name: 'Analytics', icon: Activity, tooltip: 'Performance Metrics & Insights' }
            ].map(({ id, name, icon: Icon, tooltip }) => (
              <button
                key={id}
                onClick={() => {
                  setActiveTab(id as any);
                  // Save active tab to localStorage
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('hpcl_active_tab', id);
                  }
                }}
                title={tooltip}
                className={`group relative flex items-center justify-center gap-2 px-6 py-3 rounded-full font-semibold text-sm transition-all duration-300 ${
                  activeTab === id
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/50'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Icon size={18} className={activeTab === id ? 'drop-shadow-[0_0_10px_rgba(34,211,238,1)]' : ''} />
                <span className="hidden md:inline">{name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Status Indicator - Right */}
        <div className="glass-card rounded-2xl px-4 py-3 border border-slate-700">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-400"></span>
              </span>
              <span className="text-xs font-semibold text-green-400">OPERATIONAL</span>
            </div>
            <div className="h-4 w-px bg-slate-700 mx-2"></div>
            <Activity className="h-4 w-4 text-cyan-400" />
          </div>
        </div>
      </div>

      {/* Main Content Container - Centered with Glass Effect */}
      <div className="pt-28 pb-16 px-6">
        <div className="max-w-[1600px] mx-auto">

        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Route Control Panel */}
            <div className="glass-card rounded-3xl border border-slate-700/50 shadow-2xl shadow-blue-500/10 p-8">
              {/* Fleet Overview Section */}
              <div className="mb-10">
                <FleetOverview vessels={vessels} ports={ports} />
              </div>
              
              {/* Route Optimization Control Panel */}
              <div className="flex flex-wrap justify-between items-center mb-8 gap-6">
                <div>
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                    HPCL Algorithmic Route Optimization
                  </h3>
                  <p className="text-sm text-slate-400 mt-2">Step-by-step optimized delivery routes with real-time monitoring</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => setShowLiveStatus(!showLiveStatus)}
                    className={`group px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
                      showLiveStatus 
                        ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/50' 
                        : 'glass-card border border-slate-700 text-slate-300 hover:border-cyan-500/50'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      {showLiveStatus ? <Activity size={16} className="animate-pulse" /> : <MapTrifold size={16} />}
                      {showLiveStatus ? 'Live Status' : 'Route View'}
                    </span>
                  </button>
                  {!showLiveStatus && (
                    <>
                      <button
                        onClick={() => setIsPlayingRoutes(!isPlayingRoutes)}
                        className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
                          isPlayingRoutes 
                            ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-lg shadow-red-500/50' 
                            : 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/50 hover:shadow-cyan-500/50'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          {isPlayingRoutes ? <><Pause size={16} />Pause</> : <><Play size={16} />Play Routes</>}
                        </span>
                      </button>
                      <div className="flex items-center gap-3 glass-card border border-slate-700 rounded-xl px-4 py-2">
                        <span className="text-sm text-cyan-400 font-medium">Route:</span>
                        <select 
                          value={currentRouteIndex} 
                          onChange={(e) => goToRoute(parseInt(e.target.value))}
                          className="bg-transparent text-white font-medium text-sm focus:outline-none cursor-pointer"
                        >
                          {mockOptimizationResult.routes.map((route, index) => (
                            <option key={index} value={index} className="bg-gray-800">
                              {route.sequence}. {route.description}
                            </option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Current Route Info Cards */}
              {!showLiveStatus && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                  <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 backdrop-blur-lg rounded-2xl p-6 border border-white/20 card-hover">
                    <div className="text-3xl font-bold text-white mb-1">{mockOptimizationResult.routes[currentRouteIndex].sequence}</div>
                    <div className="text-sm text-gray-300">Current Route</div>
                  </div>
                  <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-lg rounded-2xl p-6 border border-white/20 card-hover">
                    <div className="text-3xl font-bold text-white mb-1">₹{(mockOptimizationResult.routes[currentRouteIndex].cost / 100000).toFixed(0)}L</div>
                    <div className="text-sm text-gray-300">Cost ({mockOptimizationResult.routes[currentRouteIndex].duration} days)</div>
                  </div>
                  <div className="bg-gradient-to-br from-teal-500/20 to-cyan-500/20 backdrop-blur-lg rounded-2xl p-6 border border-white/20 card-hover">
                    <div className="text-3xl font-bold text-white mb-1">{formatNumber(mockOptimizationResult.routes[currentRouteIndex].cargo)}</div>
                    <div className="text-sm text-gray-300">MT Cargo</div>
                  </div>
                  <div className="bg-gradient-to-br from-orange-500/20 to-red-500/20 backdrop-blur-lg rounded-2xl p-6 border border-white/20 card-hover">
                    <div className="text-3xl font-bold text-white mb-1">₹{(mockOptimizationResult.savings / 100000).toFixed(0)}L</div>
                    <div className="text-sm text-gray-300">Total Saved ({mockOptimizationResult.savingsPercentage}%)</div>
                  </div>
                </div>
              )}
            </div>

            {/* Map and Fleet Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
              <div className="lg:col-span-1 glass-card rounded-2xl shadow-xl p-6 border border-slate-700/50 flex flex-col">
                <FleetOverview vessels={vessels} ports={ports} />
              </div>
              <div className="lg:col-span-2 glass-card rounded-2xl shadow-xl overflow-hidden border border-slate-700/50 flex flex-col">
                <MaritimeMap 
                  vessels={vessels} 
                  ports={ports} 
                  optimizationRoutes={mockOptimizationResult.routes}
                  currentRouteIndex={showLiveStatus ? -1 : currentRouteIndex}
                  showLiveStatus={showLiveStatus}
                  onNextRoute={goToNextRoute}
                  onPrevRoute={goToPrevRoute}
                  onGoToRoute={goToRoute}
                  totalRoutes={mockOptimizationResult.routes.length}
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'optimize' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-card rounded-2xl shadow-xl p-6 border border-slate-700/50">
              <OptimizationPanel 
                vessels={vessels}
                ports={ports}
                onStartOptimization={startOptimization}
                isOptimizing={isOptimizing}
              />
            </div>
            <div className="glass-card rounded-2xl shadow-xl p-6 border border-slate-700/50">
              <h3 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent mb-6">
                Live Optimization Progress
              </h3>
              {isOptimizing ? (
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-t-2 border-cyan-500"></div>
                    <div className="flex-1">
                      <span className="text-sm font-medium text-slate-200">Optimizing HPCL fleet...</span>
                      <p className="text-xs text-slate-400 mt-1">Analyzing 6,534 route combinations</p>
                    </div>
                  </div>
                  <div className="bg-slate-700/30 rounded-full h-3 overflow-hidden">
                    <div className="bg-gradient-to-r from-cyan-500 to-blue-500 h-3 rounded-full animate-pulse shadow-lg" style={{ width: '45%' }}></div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-700/50">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">9</div>
                      <div className="text-xs text-gray-500">Vessels</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-cyan-600">17</div>
                      <div className="text-xs text-gray-500">Ports</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">6.5K</div>
                      <div className="text-xs text-gray-500">Combinations</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-12">
                  <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                    <Gear size={40} weight="duotone" className="text-blue-600" />
                  </div>
                  <p className="text-lg font-medium text-gray-700">Ready to optimize HPCL fleet</p>
                  <p className="text-sm text-gray-500 mt-2">Configure parameters and click "Start Optimization"</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'results' && (
          <div className="space-y-6">
            {/* Run Status Card if optimizing */}
            {isOptimizing && currentResultId && (
              <RunStatusCard resultId={currentResultId} />
            )}
            
            {/* Error Display */}
            {optimizationError && (
              <EnhancedErrorDisplay error={optimizationError} solverLogs={[]} />
            )}
            
            {/* Loading State */}
            {isOptimizing && !optimizationResult && (
              <OptimizationLoadingState />
            )}
            
            {/* Results Display */}
            {optimizationResult && !isOptimizing && (
              <div className="glass-card rounded-3xl border border-slate-700/50 shadow-2xl shadow-blue-500/10 p-8">
                <ResultsDisplay result={optimizationResult} vessels={vessels} ports={ports} />
              </div>
            )}
            
            {/* Run History */}
            <RunHistory 
              onRevertToRun={(runId) => {
                // Load run from history and display
                const history = JSON.parse(localStorage.getItem('hpcl-optimization-history') || '[]');
                const run = history.find((r: any) => r.id === runId);
                if (run) {
                  setOptimizationResult({
                    request_id: run.id,
                    total_cost: run.summary.total_cost,
                    fleet_utilization: run.summary.fleet_utilization,
                    demand_satisfaction_rate: 98.2,
                    selected_routes: [],
                    routes_generated: run.summary.routes_count
                  });
                }
              }}
              onDeleteRun={(runId) => {
                // Already handled in RunHistory component
                console.log('Deleted run:', runId);
              }}
            />
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-6">
          {/* Top Metrics Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Analytics with Progress Indicators */}
            <div className="glass-card border border-slate-700/50 rounded-2xl shadow-xl shadow-green-500/10 p-6 card-hover">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center">
                  <div className="p-3 bg-gradient-to-br from-green-400 to-emerald-400 rounded-xl shadow-lg shadow-green-500/50">
                    <CurrencyInr size={24} weight="duotone" className="text-white" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-cyan-400">Cost Savings</p>
                    <p className="text-3xl font-bold text-slate-100">₹1.9 Cr</p>
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-xs mb-1 text-slate-400">
                  <span>Target: ₹2.5 Cr</span>
                  <span className="font-bold text-green-400">76%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2.5">
                  <div className="bg-gradient-to-r from-green-400 to-emerald-400 h-2.5 rounded-full transition-all duration-1000 shadow-lg shadow-green-500/50" style={{ width: '76%' }}></div>
                </div>
              </div>
            </div>
            
            <div className="glass-card border border-slate-700/50 rounded-2xl shadow-xl shadow-blue-500/10 p-6 card-hover">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center">
                  <div className="p-3 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-xl shadow-lg shadow-blue-500/50">
                    <GasPump size={24} weight="duotone" className="text-white" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-cyan-400">Fuel Efficiency</p>
                    <p className="text-3xl font-bold text-slate-100">23.8MT/day</p>
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-xs mb-1 text-slate-400">
                  <span>Industry Avg: 28MT</span>
                  <span className="font-bold text-blue-400">85%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2.5">
                  <div className="bg-gradient-to-r from-blue-400 to-cyan-400 h-2.5 rounded-full transition-all duration-1000 shadow-lg shadow-blue-500/50" style={{ width: '85%' }}></div>
                </div>
              </div>
            </div>

            <div className="glass-card border border-slate-700/50 rounded-2xl shadow-xl shadow-purple-500/10 p-6 card-hover">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center">
                  <div className="p-3 bg-gradient-to-br from-purple-400 to-pink-400 rounded-xl shadow-lg shadow-purple-500/50">
                    <Activity className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-cyan-400">Fleet Utilization</p>
                    <p className="text-3xl font-bold text-slate-100">87.5%</p>
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-xs mb-1 text-slate-400">
                  <span>Optimal: 90%</span>
                  <span className="font-bold text-purple-400">87.5%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2.5">
                  <div className="bg-gradient-to-r from-purple-400 to-pink-400 h-2.5 rounded-full transition-all duration-1000 shadow-lg shadow-purple-500/50" style={{ width: '87.5%' }}></div>
                </div>
              </div>
            </div>

            <div className="glass-card rounded-2xl shadow-xl p-6 border border-slate-700/50">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl shadow-lg">
                    <ChartBar size={24} weight="duotone" className="text-white" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-cyan-300">Demand Satisfaction</p>
                    <p className="text-3xl font-bold text-cyan-400">98.2%</p>
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-xs mb-1 text-slate-300">
                  <span>Target: 100%</span>
                  <span className="font-bold text-cyan-400">98.2%</span>
                </div>
                <div className="w-full bg-slate-700/30 rounded-full h-2.5">
                  <div className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2.5 rounded-full transition-all duration-1000 shadow-lg" style={{ width: '98.2%' }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Cost Breakdown and Vessel Performance Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Cost Breakdown Chart */}
            <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-6">
              <h3 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent mb-6">
                Cost Breakdown Analysis
              </h3>
              <div className="space-y-5">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-300 font-medium">Fuel Costs</span>
                    <span className="font-bold text-white">₹4.76 Cr (56%)</span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-400 to-blue-600 h-3 rounded-full shadow-lg animate-pulse" style={{ width: '56%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-300 font-medium">Charter Costs</span>
                    <span className="font-bold text-white">₹2.38 Cr (28%)</span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
                    <div className="bg-gradient-to-r from-green-400 to-emerald-600 h-3 rounded-full shadow-lg animate-pulse" style={{ width: '28%', animationDelay: '0.2s' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-300 font-medium">Port Charges</span>
                    <span className="font-bold text-white">₹1.02 Cr (12%)</span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
                    <div className="bg-gradient-to-r from-orange-400 to-red-600 h-3 rounded-full shadow-lg animate-pulse" style={{ width: '12%', animationDelay: '0.4s' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-300 font-medium">Operational Costs</span>
                    <span className="font-bold text-white">₹0.34 Cr (4%)</span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
                    <div className="bg-gradient-to-r from-indigo-400 to-blue-600 h-3 rounded-full shadow-lg animate-pulse" style={{ width: '4%', animationDelay: '0.6s' }}></div>
                  </div>
                </div>
              </div>
              <div className="mt-6 pt-6 border-t border-white/20">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-300">Total Monthly Cost</span>
                  <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">₹8.5 Cr</span>
                </div>
              </div>
            </div>

            {/* Top Performing Vessels */}
            <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-6">
              <h3 className="text-xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent mb-6">
                Top Performing Vessels
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-xl border border-white/10 card-hover">
                  <div>
                    <p className="font-bold text-white">HPCL-CT-003</p>
                    <p className="text-xs text-gray-300 mt-1">Maritime Excel</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">96.2% Efficiency</p>
                    <p className="text-xs text-gray-300 mt-1">4 trips/month</p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-xl border border-white/10 card-hover">
                  <div>
                    <p className="font-bold text-white">HPCL-CT-001</p>
                    <p className="text-xs text-gray-300 mt-1">Coastal Spirit</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">92.8% Efficiency</p>
                    <p className="text-xs text-gray-300 mt-1">3 trips/month</p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-xl border border-white/10 card-hover">
                  <div>
                    <p className="font-bold text-white">HPCL-CT-006</p>
                    <p className="text-xs text-gray-300 mt-1">Eastern Star</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">89.5% Efficiency</p>
                    <p className="text-xs text-gray-300 mt-1">3 trips/month</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Route Performance and Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Most Efficient Routes */}
            <div className="lg:col-span-2 bg-gradient-to-br from-amber-500/20 to-orange-500/20 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-6">
              <h3 className="text-xl font-bold bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent mb-6">
                Most Efficient Routes
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-white/20">
                      <th className="text-left text-xs font-bold text-gray-300 uppercase py-3">Route</th>
                      <th className="text-right text-xs font-bold text-gray-300 uppercase py-3">Distance</th>
                      <th className="text-right text-xs font-bold text-gray-300 uppercase py-3">Cost</th>
                      <th className="text-right text-xs font-bold text-gray-300 uppercase py-3">Efficiency</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    <tr className="hover:bg-white/10 transition-colors">
                      <td className="py-4 text-sm">
                        <div className="font-bold text-white">Mumbai → Kochi</div>
                        <div className="text-xs text-gray-300 mt-1">HPCL-CT-003</div>
                      </td>
                      <td className="py-4 text-right text-sm font-medium text-white">682 NM</td>
                      <td className="py-4 text-right text-sm font-medium text-white">₹0.52 Cr</td>
                      <td className="py-4 text-right">
                        <span className="px-3 py-1.5 text-xs font-bold rounded-full bg-gradient-to-r from-green-400 to-emerald-400 text-white shadow-lg">
                          Excellent
                        </span>
                      </td>
                    </tr>
                    <tr className="hover:bg-white/10 transition-colors">
                      <td className="py-4 text-sm">
                        <div className="font-bold text-white">Kandla → Mangalore → Goa</div>
                        <div className="text-xs text-gray-300 mt-1">HPCL-CT-001</div>
                      </td>
                      <td className="py-4 text-right text-sm font-medium text-white">845 NM</td>
                      <td className="py-4 text-right text-sm font-medium text-white">₹0.68 Cr</td>
                      <td className="py-4 text-right">
                        <span className="px-3 py-1.5 text-xs font-bold rounded-full bg-gradient-to-r from-blue-400 to-cyan-400 text-white shadow-lg">
                          Good
                        </span>
                      </td>
                    </tr>
                    <tr className="hover:bg-white/10 transition-colors">
                      <td className="py-4 text-sm">
                        <div className="font-bold text-white">Visakhapatnam → Chennai</div>
                        <div className="text-xs text-gray-300 mt-1">HPCL-CT-006</div>
                      </td>
                      <td className="py-4 text-right text-sm font-medium text-white">425 NM</td>
                      <td className="py-4 text-right text-sm font-medium text-white">₹0.45 Cr</td>
                      <td className="py-4 text-right">
                        <span className="px-3 py-1.5 text-xs font-bold rounded-full bg-gradient-to-r from-green-400 to-emerald-400 text-white shadow-lg">
                          Excellent
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Key Insights */}
            <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-6">
              <h3 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent mb-6">
                Key Insights
              </h3>
              <div className="space-y-4">
                <div className="p-4 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-xl border-l-4 border-green-400 card-hover">
                  <p className="text-sm font-bold text-green-300 mb-2">Cost Optimization</p>
                  <p className="text-xs text-gray-200">Achieved 18% cost reduction vs manual planning</p>
                </div>
                <div className="p-4 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-xl border-l-4 border-blue-400 card-hover">
                  <p className="text-sm font-bold text-blue-300 mb-2">Fleet Efficiency</p>
                  <p className="text-xs text-gray-200">87.5% utilization - above industry avg of 75%</p>
                </div>
                <div className="p-4 bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-xl border-l-4 border-orange-400 card-hover">
                  <p className="text-sm font-bold text-orange-300 mb-2">Carbon Footprint</p>
                  <p className="text-xs text-gray-200">15% reduction in CO2 emissions per MT cargo</p>
                </div>
                <div className="p-4 bg-gradient-to-r from-teal-500/20 to-cyan-500/20 rounded-xl border-l-4 border-teal-400 card-hover">
                  <p className="text-sm font-bold text-teal-300 mb-2">Demand Coverage</p>
                  <p className="text-xs text-gray-200">98.2% demand satisfied with optimal routing</p>
                </div>
              </div>
            </div>
          </div>

          {/* Port Activity Heatmap - Enhanced Design */}
          <div className="bg-gradient-to-br from-blue-500/20 to-indigo-500/20 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold bg-gradient-to-r from-blue-300 to-cyan-300 bg-clip-text text-transparent">Port Activity Heatmap</h3>
                <p className="text-sm text-gray-300 mt-2">Monthly vessel visits across major Indian ports</p>
              </div>
              <div className="flex items-center gap-3 px-4 py-2.5 bg-white/10 backdrop-blur-lg rounded-xl shadow-lg border border-white/20">
                <span className="text-sm font-medium text-gray-300">Avg:</span>
                <span className="text-2xl font-bold text-white">17</span>
                <span className="text-xs text-gray-300">visits/mo</span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Mumbai - Highest */}
              <div className="relative overflow-hidden rounded-2xl border-2 border-red-400/50 bg-gradient-to-br from-red-500/30 to-pink-500/30 backdrop-blur-lg p-6 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 cursor-pointer group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/20 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform"></div>
                <div className="relative">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="text-base font-bold text-white">Mumbai Port</h4>
                      <p className="text-xs text-gray-200 mt-1">West Coast Hub</p>
                    </div>
                    <span className="px-3 py-1.5 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-bold rounded-lg shadow-lg">🔥 #1</span>
                  </div>
                  <div className="flex items-end gap-2 mb-4">
                    <span className="text-5xl font-black text-white">28</span>
                    <span className="text-sm text-gray-200 mb-3">visits/mo</span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-200">vs Average</span>
                      <span className="font-bold text-green-300">+65% ↑</span>
                    </div>
                    <div className="h-3 bg-white/20 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-red-400 to-pink-400 rounded-full animate-pulse shadow-lg" style={{ width: '100%' }}></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Kandla */}
              <div className="relative overflow-hidden rounded-2xl border-2 border-orange-400/50 bg-gradient-to-br from-orange-500/30 to-amber-500/30 backdrop-blur-lg p-6 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 cursor-pointer group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/20 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform"></div>
                <div className="relative">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="text-base font-bold text-white">Kandla Port</h4>
                      <p className="text-xs text-gray-200 mt-1">Gujarat Gateway</p>
                    </div>
                    <span className="px-3 py-1.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-bold rounded-lg shadow-lg">#2</span>
                  </div>
                  <div className="flex items-end gap-2 mb-4">
                    <span className="text-5xl font-black text-white">22</span>
                    <span className="text-sm text-gray-200 mb-3">visits/mo</span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-200">vs Average</span>
                      <span className="font-bold text-green-300">+29% ↑</span>
                    </div>
                    <div className="h-3 bg-white/20 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-orange-400 to-amber-400 rounded-full shadow-lg" style={{ width: '79%' }}></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Vizag */}
              <div className="relative overflow-hidden rounded-2xl border-2 border-amber-400/50 bg-gradient-to-br from-amber-500/30 to-yellow-500/30 backdrop-blur-lg p-6 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 cursor-pointer group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/20 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform"></div>
                <div className="relative">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="text-base font-bold text-white">Vizag Port</h4>
                      <p className="text-xs text-gray-200 mt-1">East Coast Major</p>
                    </div>
                    <span className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-yellow-500 text-white text-xs font-bold rounded-lg shadow-lg">#3</span>
                  </div>
                  <div className="flex items-end gap-2 mb-4">
                    <span className="text-5xl font-black text-white">18</span>
                    <span className="text-sm text-gray-200 mb-3">visits/mo</span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-200">vs Average</span>
                      <span className="font-bold text-green-300">+6% ↑</span>
                    </div>
                    <div className="h-3 bg-white/20 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-amber-400 to-yellow-400 rounded-full shadow-lg" style={{ width: '64%' }}></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Kochi */}
              <div className="relative overflow-hidden rounded-2xl border-2 border-blue-400/50 bg-gradient-to-br from-blue-500/30 to-cyan-500/30 backdrop-blur-lg p-6 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 cursor-pointer group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform"></div>
                <div className="relative">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="text-base font-bold text-white">Kochi Port</h4>
                      <p className="text-xs text-gray-200 mt-1">Kerala Hub</p>
                    </div>
                    <span className="px-3 py-1.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-xs font-bold rounded-lg shadow-lg">#4</span>
                  </div>
                  <div className="flex items-end gap-2 mb-4">
                    <span className="text-5xl font-black text-white">15</span>
                    <span className="text-sm text-gray-200 mb-3">visits/mo</span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-200">vs Average</span>
                      <span className="font-bold text-red-300">-12% ↓</span>
                    </div>
                    <div className="h-3 bg-white/20 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full shadow-lg" style={{ width: '54%' }}></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Chennai */}
              <div className="relative overflow-hidden rounded-2xl border-2 border-indigo-400/50 bg-gradient-to-br from-indigo-500/30 to-purple-500/30 backdrop-blur-lg p-6 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 cursor-pointer group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform"></div>
                <div className="relative">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="text-base font-bold text-white">Chennai Port</h4>
                      <p className="text-xs text-gray-200 mt-1">Tamil Nadu</p>
                    </div>
                    <span className="px-3 py-1.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-bold rounded-lg shadow-lg">#5</span>
                  </div>
                  <div className="flex items-end gap-2 mb-4">
                    <span className="text-5xl font-black text-white">14</span>
                    <span className="text-sm text-gray-200 mb-3">visits/mo</span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-200">vs Average</span>
                      <span className="font-bold text-red-300">-18% ↓</span>
                    </div>
                    <div className="h-3 bg-white/20 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-indigo-400 to-purple-400 rounded-full shadow-lg" style={{ width: '50%' }}></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Haldia */}
              <div className="relative overflow-hidden rounded-xl border-2 border-purple-200 bg-linear-to-br from-purple-50 to-purple-100 p-5 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full -mr-12 -mt-12"></div>
                <div className="relative">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="text-sm font-bold text-gray-700">Haldia Port</h4>
                      <p className="text-xs text-gray-500">West Bengal</p>
                    </div>
                    <span className="px-2 py-1 bg-purple-500 text-white text-xs font-bold rounded-md">#6</span>
                  </div>
                  <div className="flex items-end gap-2 mb-3">
                    <span className="text-4xl font-black text-purple-600">12</span>
                    <span className="text-sm text-gray-600 mb-2">visits/mo</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">vs Average</span>
                      <span className="font-bold text-red-600">-29% ↓</span>
                    </div>
                    <div className="h-2 bg-purple-200 rounded-full overflow-hidden">
                      <div className="h-full bg-purple-500 rounded-full" style={{ width: '43%' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          </div>
        )}

        {activeTab === 'challenge' && (
          <div className="glass-card rounded-3xl border border-slate-700/50 shadow-2xl shadow-cyan-500/10 p-8">
            <ChallengeOutput />
          </div>
        )}
        </div>
      </div>

      {/* Guided Tour */}
      <GuidedTour />
    </div>
  );
}
