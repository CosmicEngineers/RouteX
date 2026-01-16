'use client';

import React from 'react';
import { Boat, Lightning, Activity, TrendUp, Trophy, Target } from 'phosphor-react';

export function ImprovedHeader() {
  return (
    <div className="relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900">
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:30px_30px]"></div>
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '2s' }}></div>
          <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '4s' }}></div>
        </div>
      </div>

      {/* Content */}
      <div className="relative container mx-auto px-6 py-8">
        {/* Top Bar */}
        <div className="flex items-center justify-between mb-6">
          {/* Logo & Title */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl blur-xl opacity-75 animate-pulse"></div>
              <div className="relative bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-600 p-4 rounded-2xl shadow-2xl">
                <Boat size={48} weight="duotone" className="text-white animate-float" />
              </div>
            </div>
            <div>
              <h1 className="text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-200 to-cyan-200">
                HPCL RouteX
              </h1>
              <p className="text-blue-300 font-semibold text-sm flex items-center gap-2 mt-1">
                <Lightning size={16} weight="bold" className="text-yellow-400" />
                Next-Generation Fleet Optimization Platform
              </p>
            </div>
          </div>

          {/* Status Cards */}
          <div className="flex items-center gap-4">
            <div className="glass-effect rounded-xl px-5 py-3 backdrop-blur-xl border border-white/20">
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-end">
                  <span className="text-xs text-blue-200 font-medium">System Status</span>
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                    </span>
                    <span className="text-sm font-bold text-green-300">Online</span>
                  </div>
                </div>
                <Activity className="h-8 w-8 text-green-400" />
              </div>
            </div>

            <div className="glass-effect rounded-xl px-5 py-3 backdrop-blur-xl border border-white/20">
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-end">
                  <span className="text-xs text-blue-200 font-medium">Optimization</span>
                  <span className="text-sm font-bold text-blue-300">CP-SAT Engine</span>
                </div>
                <Target className="h-8 w-8 text-blue-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Cost Savings', value: '25%', icon: TrendingUp, bgColor: '#E6F2FF', textColor: '#0B5ED7' },
            { label: 'Fleet Efficiency', value: '87%', icon: Ship, bgColor: '#E9FFF3', textColor: '#198754' },
            { label: 'Routes Optimized', value: '1,247', icon: Target, bgColor: '#F4EDFF', textColor: '#6F42C1' },
          ].map((stat, idx) => (
            <div key={idx} style={{ 
              backgroundColor: stat.bgColor, 
              borderRadius: '10px', 
              padding: '16px', 
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              height: '80px'
            }}>
              <div className="flex items-center justify-between h-full">
                <div>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: stat.textColor, marginBottom: '4px' }}>{stat.label}</div>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: stat.textColor }}>{stat.value}</div>
                </div>
                <stat.icon style={{ width: '32px', height: '32px', color: stat.textColor, opacity: 0.5 }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Gradient Border */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-500"></div>
    </div>
  );
}
