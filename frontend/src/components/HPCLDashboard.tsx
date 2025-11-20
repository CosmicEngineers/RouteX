'use client';

import React, { useState, useEffect } from 'react';
import { Ship, MapPin, Activity, DollarSign, Fuel, BarChart3, Settings, Play, Pause, AlertCircle, CheckCircle } from 'lucide-react';
import { HPCLHeader } from './HPCLHeader';
import { FleetOverview } from './FleetOverview';
import { OptimizationPanel } from './OptimizationPanel';
import { MaritimeMap } from './MaritimeMap';
import { ResultsDisplay } from './ResultsDisplay';

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
  const [activeTab, setActiveTab] = useState<'overview' | 'optimize' | 'results' | 'analytics'>('overview');

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
              { id: 'overview', name: 'Fleet Overview', icon: Ship },
              { id: 'optimize', name: 'Optimization', icon: Settings },
              { id: 'results', name: 'Results', icon: BarChart3 },
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Analytics placeholders */}
            <div className="bg-white rounded-lg shadow p-6">
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
            
            <div className="bg-white rounded-lg shadow p-6">
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

            <div className="bg-white rounded-lg shadow p-6">
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

            <div className="bg-white rounded-lg shadow p-6">
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
          </div>
        )}
      </div>
    </div>
  );
}
