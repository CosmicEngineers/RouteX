'use client';

import React from 'react';
import { Ship, Anchor, Settings, AlertTriangle, CheckCircle, MapPin, Fuel } from 'lucide-react';
import { HPCLVessel, HPCLPort } from './HPCLDashboard';

interface FleetOverviewProps {
  vessels: HPCLVessel[];
  ports: HPCLPort[];
}

export function FleetOverview({ vessels, ports }: FleetOverviewProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'sailing':
        return <Ship className="h-4 w-4 text-blue-500" />;
      case 'maintenance':
        return <Settings className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800';
      case 'sailing':
        return 'bg-blue-100 text-blue-800';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-red-100 text-red-800';
    }
  };

  const totalCapacity = vessels.reduce((sum, vessel) => sum + vessel.capacity_mt, 0);
  const availableVessels = vessels.filter(v => v.status === 'available').length;
  const loadingPorts = ports.filter(p => p.type === 'loading').length;
  const unloadingPorts = ports.filter(p => p.type === 'unloading').length;

  return (
    <div className="space-y-6">
      {/* Fleet Summary Card */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Ship className="h-5 w-5 text-orange-600 mr-2" />
          HPCL Fleet Summary
        </h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-orange-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-orange-600">{vessels.length}</div>
            <div className="text-sm text-gray-600">Total Vessels</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-600">{availableVessels}</div>
            <div className="text-sm text-gray-600">Available</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-600">{(totalCapacity / 1000).toFixed(0)}K</div>
            <div className="text-sm text-gray-600">MT Capacity</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-purple-600">
              {((availableVessels / vessels.length) * 100).toFixed(0)}%
            </div>
            <div className="text-sm text-gray-600">Operational</div>
          </div>
        </div>
      </div>

      {/* Port Network Summary */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <MapPin className="h-5 w-5 text-blue-600 mr-2" />
          Port Network
        </h3>
        
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Loading Ports</span>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="font-semibold">{loadingPorts}</span>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Unloading Ports</span>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="font-semibold">{unloadingPorts}</span>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Total Network</span>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
              <span className="font-semibold">{ports.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Vessel List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Anchor className="h-5 w-5 text-gray-600 mr-2" />
            Fleet Status
          </h3>
        </div>
        
        <div className="divide-y divide-gray-200">
          {vessels.map((vessel) => (
            <div key={vessel.id} className="px-6 py-4 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(vessel.status)}
                    <div>
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {vessel.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {vessel.id} • {(vessel.capacity_mt / 1000).toFixed(0)}K MT
                      </p>
                    </div>
                  </div>
                  
                  {vessel.current_port && (
                    <div className="mt-2 flex items-center space-x-1 text-xs text-gray-500">
                      <MapPin className="h-3 w-3" />
                      <span>{vessel.current_port}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex-shrink-0">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(vessel.status)}`}>
                    {vessel.status.charAt(0).toUpperCase() + vessel.status.slice(1)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Key Constraints */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">HPCL Constraints</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Single Loading Rule</span>
            <span className="font-medium text-green-600">✓ Active</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Max Discharge Ports</span>
            <span className="font-medium">2</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Optimization Algorithm</span>
            <span className="font-medium">Set Partitioning</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Solver</span>
            <span className="font-medium">OR-Tools CP-SAT</span>
          </div>
        </div>
      </div>
    </div>
  );
}
