'use client';

import React, { useState, useEffect } from 'react';
import { Boat, WifiHigh, WifiSlash, Warning, CheckCircle } from 'phosphor-react';

interface HPCLHeaderProps {
  systemStatus: 'connecting' | 'connected' | 'error';
  isOptimizing: boolean;
}

export function HPCLHeader({ systemStatus, isOptimizing }: HPCLHeaderProps) {
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour12: false
      }));
      setCurrentDate(now.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = () => {
    switch (systemStatus) {
      case 'connected':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'connecting':
        return <WifiHigh size={20} weight="bold" className="text-yellow-500 animate-pulse" />;
      case 'error':
        return <WifiSlash size={20} weight="bold" className="text-red-500" />;
      default:
        return <Warning size={20} weight="bold" className="text-gray-500" />;
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
    <header className="bg-slate-900/80 backdrop-blur-md border-b border-blue-500/30 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          {/* HPCL Logo and Title */}
          <div className="flex items-center space-x-4">
            <div className="bg-gradient-to-br from-blue-600 to-cyan-500 p-2 rounded-lg shadow-lg shadow-blue-500/50">
              <Boat size={32} weight="duotone" className="text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                HPCL Coastal Fleet Optimizer
              </h1>
              <p className="text-sm text-slate-400">
                Strategic Optimization for Hindustan Petroleum Corporation Limited
              </p>
            </div>
          </div>

          {/* System Status and Info */}
          <div className="flex items-center space-x-6">
            {/* Fleet Summary */}
            <div className="hidden md:flex items-center space-x-4 text-sm text-slate-400">
              <div className="text-center">
                <div className="font-semibold text-cyan-400">9</div>
                <div>Vessels</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-cyan-400">17</div>
                <div>Ports</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-cyan-400">6:11</div>
                <div>Load:Discharge</div>
              </div>
            </div>

            {/* Optimization Status */}
            {isOptimizing && (
              <div className="flex items-center space-x-2 bg-blue-500/20 px-3 py-2 rounded-full border border-blue-500/50">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
                <span className="text-sm font-medium text-blue-300">Optimizing...</span>
              </div>
            )}

            {/* System Status Indicator */}
            <div className="flex items-center space-x-2 bg-slate-800/50 px-3 py-2 rounded-full border border-slate-700">
              {getStatusIcon()}
              <span className="text-sm font-medium text-slate-300">
                {getStatusText()}
              </span>
            </div>

            {/* Current Time */}
            <div className="hidden lg:block text-right">
              <div className="text-sm font-medium text-cyan-400">
                {currentTime} IST
              </div>
              <div className="text-xs text-slate-400">
                {currentDate}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* HPCL Branding Bar */}
      <div className="bg-gradient-to-r from-blue-600 to-cyan-500 h-1 shadow-lg shadow-blue-500/50"></div>
    </header>
  );
}
