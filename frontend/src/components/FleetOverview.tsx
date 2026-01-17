'use client';

import React from 'react';
import { Boat, Anchor, Gear, Warning, CheckCircle, MapPin, GasPump } from 'phosphor-react';
import { HPCLVessel, HPCLPort } from './HPCLDashboard';
import { formatNumber, formatCompactNumber } from '../utils/formatters';

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
        return <Boat size={16} weight="bold" className="text-blue-500" />;
      case 'maintenance':
        return <Gear size={16} weight="bold" className="text-yellow-500" />;
      default:
        return <Warning size={16} weight="bold" className="text-red-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-500/20 text-green-400 border border-green-500/30';
      case 'sailing':
        return 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
      case 'maintenance':
        return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30';
      default:
        return 'bg-red-500/20 text-red-400 border border-red-500/30';
    }
  };

  const totalCapacity = vessels.reduce((sum, vessel) => sum + vessel.capacity_mt, 0);
  const availableVessels = vessels.filter(v => v.status === 'available').length;
  const loadingPorts = ports.filter(p => p.type === 'loading').length;
  const unloadingPorts = ports.filter(p => p.type === 'unloading').length;

  return (
    <div className="space-y-4">
      {/* Fleet Summary Card */}
      <div className="relative overflow-hidden glass-card rounded-2xl p-4 border border-slate-700/50">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full filter blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full filter blur-3xl" style={{ animationDelay: '1s' }}></div>
        
        <div className="relative">
          <h3 className="text-2xl font-bold text-slate-100 mb-3 flex items-center">
            <Boat size={28} weight="duotone" className="text-cyan-400 mr-3" />
            Fleet Overview
          </h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl blur opacity-50 group-hover:opacity-75 transition"></div>
              <div className="relative bg-slate-800/50 backdrop-blur-lg border border-cyan-500/30 rounded-xl p-4 hover:border-cyan-500/50 transition-all">
                <div className="text-4xl font-bold text-white mb-1">{vessels.length}</div>
                <div className="text-sm text-cyan-200 font-medium">Total Vessels</div>
                <Boat size={32} weight="thin" className="absolute top-4 right-4 text-cyan-400/20" />
              </div>
            </div>
            
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl blur opacity-50 group-hover:opacity-75 transition"></div>
              <div className="relative bg-slate-800/50 backdrop-blur-lg border border-green-500/30 rounded-xl p-4 hover:border-green-500/50 transition-all">
                <div className="text-4xl font-bold text-white mb-1">{availableVessels}</div>
                <div className="text-sm text-green-200 font-medium">Available Now</div>
                <CheckCircle className="absolute top-4 right-4 h-8 w-8 text-green-400/20" />
              </div>
            </div>
            
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl blur opacity-50 group-hover:opacity-75 transition"></div>
              <div className="relative bg-slate-800/50 backdrop-blur-lg border border-blue-500/30 rounded-xl p-4 hover:border-blue-500/50 transition-all">
                <div className="text-4xl font-bold text-white mb-1">{formatCompactNumber(totalCapacity)}</div>
                <div className="text-sm text-blue-200 font-medium">MT Capacity</div>
                <Anchor size={32} weight="thin" className="absolute top-4 right-4 text-blue-400/20" />
              </div>
            </div>
            
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl blur opacity-50 group-hover:opacity-75 transition"></div>
              <div className="relative bg-slate-800/50 backdrop-blur-lg border border-purple-500/30 rounded-xl p-4 hover:border-purple-500/50 transition-all">
                <div className="text-4xl font-bold text-white mb-1">
                  {((availableVessels / vessels.length) * 100).toFixed(0)}%
                </div>
                <div className="text-sm text-purple-200 font-medium">Fleet Availability</div>
                <Gear size={32} weight="thin" className="absolute top-4 right-4 text-purple-400/20" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Port Network Summary */}
      <div className="glass-card rounded-xl border border-slate-700/50 p-4">
        <h3 className="text-lg font-semibold text-slate-100 mb-3 flex items-center">
          <MapPin className="h-5 w-5 text-cyan-400 mr-2" />
          Port Network
        </h3>
        
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-300">Loading Ports</span>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              <span className="font-semibold min-w-8 text-right text-slate-100">{loadingPorts}</span>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-300">Unloading Ports</span>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
              <span className="font-semibold min-w-8 text-right text-slate-100">{unloadingPorts}</span>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-300">Total Network</span>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-orange-400 rounded-full"></div>
              <span className="font-semibold min-w-8 text-right text-slate-100">{ports.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Vessel List */}
      <div className="glass-card rounded-xl border border-slate-700/50 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-700/50 bg-gradient-to-r from-slate-900/50 to-slate-800/30">
          <h3 className="text-lg font-semibold text-slate-100 flex items-center">
            <Anchor size={20} weight="duotone" className="text-cyan-400 mr-2" />
            Vessel Status
          </h3>
        </div>
        
        <div className="divide-y divide-slate-700/30">
          {vessels.map((vessel) => (
            <div key={vessel.id} className="px-5 py-3 hover:bg-slate-800/30 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(vessel.status)}
                    <div>
                      <p className="text-sm font-medium text-slate-100 truncate">
                        {vessel.name}
                      </p>
                      <p className="text-xs text-slate-400">
                        {vessel.id} • {(vessel.capacity_mt / 1000).toFixed(0)}K MT
                      </p>
                    </div>
                  </div>
                  
                  {vessel.current_port && (
                    <div className="mt-2 flex items-center space-x-1 text-xs text-slate-400">
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
      <div className="glass-card rounded-xl border border-slate-700/50 p-6">
        <h3 className="text-lg font-semibold text-slate-100 mb-4">Operational Constraints</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-300">Single Loading Port Per Trip</span>
            <span className="font-medium text-green-400">✓ Enforced</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-300">Maximum Delivery Ports</span>
            <span className="font-medium text-slate-100">2 per voyage</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-300">Optimization Method</span>
            <span className="font-medium text-slate-100">Set Partitioning</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-300">Solver Engine</span>
            <span className="font-medium text-slate-100">Google OR-Tools CP-SAT</span>
          </div>
        </div>
      </div>
    </div>
  );
}
