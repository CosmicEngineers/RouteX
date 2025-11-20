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
  const [vessels, setVessels] = useState<HPCLVessel[]>([]);
  const [ports, setPorts] = useState<HPCLPort[]>([]);
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [systemStatus, setSystemStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [activeTab, setActiveTab] = useState<'overview' | 'optimize' | 'results' | 'analytics'>('overview');

  // API base URL
  const API_BASE = process.env.NODE_ENV === 'development' 
    ? 'http://localhost:8000' 
    : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  // Check system status
  useEffect(() => {
    const checkSystemStatus = async () => {
      try {
        const response = await fetch(`${API_BASE}/health`);
        if (response.ok) {
          setSystemStatus('connected');
          loadInitialData();
        } else {
          setSystemStatus('error');
        }
      } catch (error) {
        console.error('System health check failed:', error);
        setSystemStatus('error');
        // Load mock data for development
        loadMockData();
      }
    };

    checkSystemStatus();
    const interval = setInterval(checkSystemStatus, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Load initial data from API
  const loadInitialData = async () => {
    try {
      const [vesselsResponse, portsResponse] = await Promise.all([
        fetch(`${API_BASE}/api/v1/fleet`),
        fetch(`${API_BASE}/api/v1/ports`)
      ]);

      if (vesselsResponse.ok && portsResponse.ok) {
        const vesselsData = await vesselsResponse.json();
        const portsData = await portsResponse.json();
        
        setVessels(vesselsData.vessels || []);
        setPorts([...(portsData.loading_ports || []), ...(portsData.unloading_ports || [])]);
      }
    } catch (error) {
      console.error('Failed to load initial data:', error);
      loadMockData();
    }
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
    try {
      const response = await fetch(`${API_BASE}/api/v1/optimize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(optimizationParams),
      });

      if (response.ok) {
        const result = await response.json();
        // Start polling for results
        pollOptimizationStatus(result.task_id);
      } else {
        throw new Error('Optimization request failed');
      }
    } catch (error) {
      console.error('Optimization failed:', error);
      setIsOptimizing(false);
      // Use mock result for demo
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
    }
  };

  // Poll optimization status
  const pollOptimizationStatus = async (taskId: string) => {
    const poll = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/v1/optimize/task/${taskId}`);
        if (response.ok) {
          const status = await response.json();
          
          if (status.status === 'completed') {
            // Get the results
            const resultResponse = await fetch(`${API_BASE}/api/v1/optimize/results/${taskId}`);
            if (resultResponse.ok) {
              const result = await resultResponse.json();
              setOptimizationResult(result);
              setIsOptimizing(false);
              setActiveTab('results');
            }
          } else if (status.status === 'failed') {
            setIsOptimizing(false);
            console.error('Optimization failed:', status.message);
          } else {
            // Continue polling
            setTimeout(poll, 2000);
          }
        }
      } catch (error) {
        console.error('Polling failed:', error);
        setIsOptimizing(false);
      }
    };

    poll();
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <FleetOverview vessels={vessels} ports={ports} />
            </div>
            <div className="lg:col-span-2">
              <MaritimeMap vessels={vessels} ports={ports} />
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
