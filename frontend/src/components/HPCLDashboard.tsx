'use client';

import React, { useState, useEffect } from 'react';
import { Ship, MapPin, Activity, DollarSign, Fuel, BarChart3, Settings, Play, Pause, AlertCircle, CheckCircle } from 'lucide-react';
import { HPCLHeader } from './HPCLHeader';
import { FleetOverview } from './FleetOverview';
import { OptimizationPanel } from './OptimizationPanel';
import { MaritimeMap } from './MaritimeMap';
import { ResultsDisplay } from './ResultsDisplay';
import { ChallengeOutput } from './ChallengeOutput';

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
}

export default function HPCLDashboard() {
  // Hardcoded HPCL data for demo mode
  const [vessels, setVessels] = useState<HPCLVessel[]>([]);
  const [ports, setPorts] = useState<HPCLPort[]>([]);
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [systemStatus, setSystemStatus] = useState<'connecting' | 'connected' | 'error'>('connected');
  const [activeTab, setActiveTab] = useState<'overview' | 'optimize' | 'results' | 'analytics' | 'challenge'>('challenge');

  // Route visualization states
  const [currentRouteIndex, setCurrentRouteIndex] = useState(0);
  const [isPlayingRoutes, setIsPlayingRoutes] = useState(false);
  const [showLiveStatus, setShowLiveStatus] = useState(false);

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

  // Load demo data immediately
  useEffect(() => {
    loadMockData();
  }, []);

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
    // Demo mode - use mock result after delay
    setTimeout(() => {
      setOptimizationResult({
        request_id: 'demo_' + Date.now(),
        total_cost: 8750000,
        fleet_utilization: 87.5,
        demand_satisfaction_rate: 98.2,
        selected_routes: []
      });
      setIsOptimizing(false);
      setActiveTab('results');
    }, 3000);
  };

  // Poll optimization status (demo mode - not used)
  const pollOptimizationStatus = async (taskId: string) => {
    // Demo mode - not needed
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <HPCLHeader 
        systemStatus={systemStatus}
        isOptimizing={isOptimizing}
      />

      {/* Navigation */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { id: 'challenge', name: 'Challenge Output', icon: BarChart3 },
              { id: 'overview', name: 'Fleet Overview', icon: Ship },
              { id: 'optimize', name: 'Optimization', icon: Settings },
              { id: 'results', name: 'Results', icon: CheckCircle },
              { id: 'analytics', name: 'Analytics', icon: Activity }
            ].map(({ id, name, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as any)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === id
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon size={16} />
                <span>{name}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 gap-6">
            {/* Route Control Panel */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">HPCL Algorithmic Route Optimization</h3>
                  <p className="text-sm text-gray-600">Step-by-step optimized delivery routes</p>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowLiveStatus(!showLiveStatus)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      showLiveStatus 
                        ? 'bg-green-100 text-green-700 border border-green-200' 
                        : 'bg-gray-100 text-gray-700 border border-gray-200'
                    }`}
                  >
                    {showLiveStatus ? 'Route View' : 'Live Status'}
                  </button>
                  {!showLiveStatus && (
                    <>
                      <button
                        onClick={() => setIsPlayingRoutes(!isPlayingRoutes)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          isPlayingRoutes 
                            ? 'bg-red-100 text-red-700 border border-red-200' 
                            : 'bg-blue-100 text-blue-700 border border-blue-200'
                        }`}
                      >
                        {isPlayingRoutes ? <><Pause size={16} className="mr-1" />Pause</> : <><Play size={16} className="mr-1" />Play Routes</>}
                      </button>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">Route:</span>
                        <select 
                          value={currentRouteIndex} 
                          onChange={(e) => goToRoute(parseInt(e.target.value))}
                          className="border border-gray-300 rounded px-2 py-1 text-sm"
                        >
                          {mockOptimizationResult.routes.map((route, index) => (
                            <option key={index} value={index}>
                              {route.sequence}. {route.description}
                            </option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Current Route Info */}
              {!showLiveStatus && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{mockOptimizationResult.routes[currentRouteIndex].sequence}</div>
                    <div className="text-sm text-gray-600">Current Route</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">₹{(mockOptimizationResult.routes[currentRouteIndex].cost / 100000).toFixed(0)}L</div>
                    <div className="text-sm text-gray-600">Cost ({mockOptimizationResult.routes[currentRouteIndex].duration} days)</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{mockOptimizationResult.routes[currentRouteIndex].cargo.toLocaleString()}</div>
                    <div className="text-sm text-gray-600">MT Cargo</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">₹{(mockOptimizationResult.savings / 100000).toFixed(0)}L</div>
                    <div className="text-sm text-gray-600">Total Saved ({mockOptimizationResult.savingsPercentage}%)</div>
                  </div>
                </div>
              )}
            </div>

            {/* Map */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <FleetOverview vessels={vessels} ports={ports} />
              </div>
              <div className="lg:col-span-2">
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
            <OptimizationPanel 
              vessels={vessels}
              ports={ports}
              onStartOptimization={startOptimization}
              isOptimizing={isOptimizing}
            />
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Live Optimization Progress</h3>
              {isOptimizing ? (
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-orange-600"></div>
                    <span className="text-sm text-gray-600">Optimizing HPCL fleet...</span>
                  </div>
                  <div className="bg-gray-200 rounded-full h-2">
                    <div className="bg-orange-600 h-2 rounded-full animate-pulse" style={{ width: '45%' }}></div>
                  </div>
                  <p className="text-xs text-gray-500">
                    Generating ~6,534 route combinations for 9 vessels...
                  </p>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <Settings className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2">Ready to optimize HPCL fleet</p>
                  <p className="text-sm">Configure parameters and click "Start Optimization"</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'results' && (
          <ResultsDisplay result={optimizationResult} vessels={vessels} ports={ports} />
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-6">
          {/* Top Metrics Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Analytics with Progress Indicators */}
            <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-md">
                    <DollarSign className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Cost Savings</p>
                    <p className="text-2xl font-semibold text-gray-900">₹15.2L</p>
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Target: ₹20L</span>
                  <span>76%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-600 h-2 rounded-full transition-all duration-1000" style={{ width: '76%' }}></div>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-md">
                    <Fuel className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Fuel Efficiency</p>
                    <p className="text-2xl font-semibold text-gray-900">23.8MT/day</p>
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Industry Avg: 28MT</span>
                  <span>85%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full transition-all duration-1000" style={{ width: '85%' }}></div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center">
                  <div className="p-2 bg-orange-100 rounded-md">
                    <Activity className="h-6 w-6 text-orange-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Fleet Utilization</p>
                    <p className="text-2xl font-semibold text-gray-900">87.5%</p>
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Optimal: 90%</span>
                  <span>87.5%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-orange-600 h-2 rounded-full transition-all duration-1000" style={{ width: '87.5%' }}></div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-md">
                    <BarChart3 className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Demand Satisfaction</p>
                    <p className="text-2xl font-semibold text-gray-900">98.2%</p>
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Target: 100%</span>
                  <span>98.2%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-purple-600 h-2 rounded-full transition-all duration-1000" style={{ width: '98.2%' }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Cost Breakdown and Vessel Performance Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Cost Breakdown Chart */}
            <div className="bg-linear-to-br from-blue-50 via-white to-blue-50 rounded-lg shadow-lg border border-blue-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost Breakdown Analysis</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Fuel Costs</span>
                    <span className="font-semibold text-gray-900">₹8.5L (56%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div className="bg-blue-500 h-3 rounded-full" style={{ width: '56%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Charter Costs</span>
                    <span className="font-semibold text-gray-900">₹4.2L (28%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div className="bg-green-500 h-3 rounded-full" style={{ width: '28%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Port Charges</span>
                    <span className="font-semibold text-gray-900">₹1.8L (12%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div className="bg-orange-500 h-3 rounded-full" style={{ width: '12%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Operational Costs</span>
                    <span className="font-semibold text-gray-900">₹0.7L (4%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div className="bg-purple-500 h-3 rounded-full" style={{ width: '4%' }}></div>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-900">Total Monthly Cost</span>
                  <span className="text-lg font-bold text-gray-900">₹15.2L</span>
                </div>
              </div>
            </div>

            {/* Top Performing Vessels */}
            <div className="bg-linear-to-br from-green-50 via-white to-green-50 rounded-lg shadow-lg border border-green-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Vessels</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div>
                    <p className="font-semibold text-gray-900">HPCL-CT-003</p>
                    <p className="text-xs text-gray-600">Maritime Excel</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-green-600">95.2% Efficiency</p>
                    <p className="text-xs text-gray-600">4 trips/month</p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div>
                    <p className="font-semibold text-gray-900">HPCL-CT-001</p>
                    <p className="text-xs text-gray-600">Coastal Spirit</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-blue-600">92.8% Efficiency</p>
                    <p className="text-xs text-gray-600">3 trips/month</p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                  <div>
                    <p className="font-semibold text-gray-900">HPCL-CT-006</p>
                    <p className="text-xs text-gray-600">Eastern Star</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-orange-600">89.5% Efficiency</p>
                    <p className="text-xs text-gray-600">3 trips/month</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Route Performance and Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Most Efficient Routes */}
            <div className="lg:col-span-2 bg-linear-to-br from-amber-50 via-white to-amber-50 rounded-lg shadow-lg border border-amber-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Most Efficient Routes</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left text-xs font-medium text-gray-500 uppercase py-2">Route</th>
                      <th className="text-right text-xs font-medium text-gray-500 uppercase py-2">Distance</th>
                      <th className="text-right text-xs font-medium text-gray-500 uppercase py-2">Cost</th>
                      <th className="text-right text-xs font-medium text-gray-500 uppercase py-2">Efficiency</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    <tr>
                      <td className="py-3 text-sm">
                        <div className="font-medium text-gray-900">Mumbai → Kochi</div>
                        <div className="text-xs text-gray-500">HPCL-CT-003</div>
                      </td>
                      <td className="py-3 text-right text-sm text-gray-900">682 NM</td>
                      <td className="py-3 text-right text-sm text-gray-900">₹2.1L</td>
                      <td className="py-3 text-right">
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          Excellent
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 text-sm">
                        <div className="font-medium text-gray-900">Kandla → Mangalore → Goa</div>
                        <div className="text-xs text-gray-500">HPCL-CT-001</div>
                      </td>
                      <td className="py-3 text-right text-sm text-gray-900">845 NM</td>
                      <td className="py-3 text-right text-sm text-gray-900">₹2.8L</td>
                      <td className="py-3 text-right">
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          Good
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 text-sm">
                        <div className="font-medium text-gray-900">Visakhapatnam → Chennai</div>
                        <div className="text-xs text-gray-500">HPCL-CT-006</div>
                      </td>
                      <td className="py-3 text-right text-sm text-gray-900">425 NM</td>
                      <td className="py-3 text-right text-sm text-gray-900">₹1.6L</td>
                      <td className="py-3 text-right">
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          Excellent
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Key Insights */}
            <div className="bg-linear-to-br from-purple-50 via-white to-purple-50 rounded-lg shadow-lg border border-purple-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Insights</h3>
              <div className="space-y-4">
                <div className="p-3 bg-green-50 rounded-lg border-l-4 border-green-500">
                  <p className="text-xs font-semibold text-green-800 mb-1">Cost Optimization</p>
                  <p className="text-xs text-gray-700">Achieved 22% cost reduction vs manual planning</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                  <p className="text-xs font-semibold text-blue-800 mb-1">Fleet Efficiency</p>
                  <p className="text-xs text-gray-700">87.5% utilization - above industry avg of 75%</p>
                </div>
                <div className="p-3 bg-orange-50 rounded-lg border-l-4 border-orange-500">
                  <p className="text-xs font-semibold text-orange-800 mb-1">Carbon Footprint</p>
                  <p className="text-xs text-gray-700">15% reduction in CO2 emissions per MT cargo</p>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg border-l-4 border-purple-500">
                  <p className="text-xs font-semibold text-purple-800 mb-1">Demand Coverage</p>
                  <p className="text-xs text-gray-700">98.2% demand satisfied with optimal routing</p>
                </div>
              </div>
            </div>
          </div>

          {/* Port Activity Heatmap - Enhanced Design */}
          <div className="bg-linear-to-br from-slate-50 via-blue-50 to-indigo-50 rounded-lg shadow-lg border border-blue-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Port Activity Heatmap</h3>
                <p className="text-xs text-gray-500 mt-1">Monthly vessel visits across major Indian ports</p>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white/80 backdrop-blur-sm rounded-lg shadow-sm">
                <span className="text-xs font-medium text-gray-600">Avg:</span>
                <span className="text-sm font-bold text-gray-900">17</span>
                <span className="text-xs text-gray-500">visits/mo</span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Mumbai - Highest */}
              <div className="relative overflow-hidden rounded-xl border-2 border-red-200 bg-linear-to-br from-red-50 to-red-100 p-5 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/10 rounded-full -mr-12 -mt-12"></div>
                <div className="relative">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="text-sm font-bold text-gray-700">Mumbai Port</h4>
                      <p className="text-xs text-gray-500">West Coast Hub</p>
                    </div>
                    <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-md">🔥 #1</span>
                  </div>
                  <div className="flex items-end gap-2 mb-3">
                    <span className="text-4xl font-black text-red-600">28</span>
                    <span className="text-sm text-gray-600 mb-2">visits/mo</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">vs Average</span>
                      <span className="font-bold text-green-600">+65% ↑</span>
                    </div>
                    <div className="h-2 bg-red-200 rounded-full overflow-hidden">
                      <div className="h-full bg-red-500 rounded-full animate-pulse" style={{ width: '100%' }}></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Kandla */}
              <div className="relative overflow-hidden rounded-xl border-2 border-orange-200 bg-linear-to-br from-orange-50 to-orange-100 p-5 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/10 rounded-full -mr-12 -mt-12"></div>
                <div className="relative">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="text-sm font-bold text-gray-700">Kandla Port</h4>
                      <p className="text-xs text-gray-500">Gujarat Gateway</p>
                    </div>
                    <span className="px-2 py-1 bg-orange-500 text-white text-xs font-bold rounded-md">#2</span>
                  </div>
                  <div className="flex items-end gap-2 mb-3">
                    <span className="text-4xl font-black text-orange-600">22</span>
                    <span className="text-sm text-gray-600 mb-2">visits/mo</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">vs Average</span>
                      <span className="font-bold text-green-600">+29% ↑</span>
                    </div>
                    <div className="h-2 bg-orange-200 rounded-full overflow-hidden">
                      <div className="h-full bg-orange-500 rounded-full" style={{ width: '79%' }}></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Vizag */}
              <div className="relative overflow-hidden rounded-xl border-2 border-amber-200 bg-linear-to-br from-amber-50 to-amber-100 p-5 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full -mr-12 -mt-12"></div>
                <div className="relative">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="text-sm font-bold text-gray-700">Vizag Port</h4>
                      <p className="text-xs text-gray-500">East Coast Major</p>
                    </div>
                    <span className="px-2 py-1 bg-amber-500 text-white text-xs font-bold rounded-md">#3</span>
                  </div>
                  <div className="flex items-end gap-2 mb-3">
                    <span className="text-4xl font-black text-amber-600">18</span>
                    <span className="text-sm text-gray-600 mb-2">visits/mo</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">vs Average</span>
                      <span className="font-bold text-green-600">+6% ↑</span>
                    </div>
                    <div className="h-2 bg-amber-200 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full" style={{ width: '64%' }}></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Kochi */}
              <div className="relative overflow-hidden rounded-xl border-2 border-blue-200 bg-linear-to-br from-blue-50 to-blue-100 p-5 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full -mr-12 -mt-12"></div>
                <div className="relative">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="text-sm font-bold text-gray-700">Kochi Port</h4>
                      <p className="text-xs text-gray-500">Kerala Hub</p>
                    </div>
                    <span className="px-2 py-1 bg-blue-500 text-white text-xs font-bold rounded-md">#4</span>
                  </div>
                  <div className="flex items-end gap-2 mb-3">
                    <span className="text-4xl font-black text-blue-600">15</span>
                    <span className="text-sm text-gray-600 mb-2">visits/mo</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">vs Average</span>
                      <span className="font-bold text-red-600">-12% ↓</span>
                    </div>
                    <div className="h-2 bg-blue-200 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: '54%' }}></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Chennai */}
              <div className="relative overflow-hidden rounded-xl border-2 border-indigo-200 bg-linear-to-br from-indigo-50 to-indigo-100 p-5 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full -mr-12 -mt-12"></div>
                <div className="relative">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="text-sm font-bold text-gray-700">Chennai Port</h4>
                      <p className="text-xs text-gray-500">Tamil Nadu</p>
                    </div>
                    <span className="px-2 py-1 bg-indigo-500 text-white text-xs font-bold rounded-md">#5</span>
                  </div>
                  <div className="flex items-end gap-2 mb-3">
                    <span className="text-4xl font-black text-indigo-600">14</span>
                    <span className="text-sm text-gray-600 mb-2">visits/mo</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">vs Average</span>
                      <span className="font-bold text-red-600">-18% ↓</span>
                    </div>
                    <div className="h-2 bg-indigo-200 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: '50%' }}></div>
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
          <div className="space-y-6">
            <ChallengeOutput />
          </div>
        )}
      </div>
    </div>
  );
}
