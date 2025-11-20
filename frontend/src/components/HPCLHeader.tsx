'use client';

import React from 'react';
import { Ship, Wifi, WifiOff, AlertTriangle, CheckCircle } from 'lucide-react';

interface HPCLHeaderProps {
  systemStatus: 'connecting' | 'connected' | 'error';
  isOptimizing: boolean;
}

export function HPCLHeader({ systemStatus, isOptimizing }: HPCLHeaderProps) {
  const getStatusIcon = () => {
    switch (systemStatus) {
      case 'connected':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'connecting':
        return <Wifi className="h-5 w-5 text-yellow-500 animate-pulse" />;
      case 'error':
        return <WifiOff className="h-5 w-5 text-red-500" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusText = () => {
    switch (systemStatus) {
      case 'connected':
        return 'System Operational';
      case 'connecting':
        return 'Connecting...';
      case 'error':
        return 'System Error';
      default:
        return 'Unknown Status';
    }
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          {/* HPCL Logo and Title */}
          <div className="flex items-center space-x-4">
            <div className="bg-orange-600 p-2 rounded-lg">
              <Ship className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                HPCL Coastal Fleet Optimizer
              </h1>
              <p className="text-sm text-gray-600">
                Strategic Optimization for Hindustan Petroleum Corporation Limited
              </p>
            </div>
          </div>

          {/* System Status and Info */}
          <div className="flex items-center space-x-6">
            {/* Fleet Summary */}
            <div className="hidden md:flex items-center space-x-4 text-sm text-gray-600">
              <div className="text-center">
                <div className="font-semibold text-gray-900">9</div>
                <div>Vessels</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-gray-900">17</div>
                <div>Ports</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-gray-900">6:11</div>
                <div>Load:Discharge</div>
              </div>
            </div>

            {/* Optimization Status */}
            {isOptimizing && (
              <div className="flex items-center space-x-2 bg-orange-50 px-3 py-2 rounded-full">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-600"></div>
                <span className="text-sm font-medium text-orange-700">Optimizing...</span>
              </div>
            )}

            {/* System Status Indicator */}
            <div className="flex items-center space-x-2 bg-gray-50 px-3 py-2 rounded-full">
              {getStatusIcon()}
              <span className="text-sm font-medium text-gray-700">
                {getStatusText()}
              </span>
            </div>

            {/* Current Time */}
            <div className="hidden lg:block text-right">
              <div className="text-sm font-medium text-gray-900">
                {new Date().toLocaleTimeString('en-IN', {
                  timeZone: 'Asia/Kolkata',
                  hour12: false
                })} IST
              </div>
              <div className="text-xs text-gray-500">
                {new Date().toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric'
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* HPCL Branding Bar */}
      <div className="bg-gradient-to-r from-orange-600 to-red-600 h-1"></div>
    </header>
  );
}
