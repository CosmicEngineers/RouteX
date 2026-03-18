'use client';

import React from 'react';
import { Icon } from 'phosphor-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: Icon;
  gradient: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
}

export function StatsCard({ title, value, subtitle, icon: Icon, gradient, trend }: StatsCardProps) {
  return (
    <div className="card-hover group">
      {/* Card content */}
      <div className="elevated-card relative p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
            <h3 className="text-3xl kpi-value text-slate-800 mb-1">{value}</h3>
            {subtitle && (
              <p className="text-xs text-slate-400 font-medium">{subtitle}</p>
            )}
            {trend && (
              <div className={`inline-flex items-center gap-1 mt-2 px-2.5 py-1 rounded-full text-xs font-bold border ${
                trend.isPositive ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
              }`}>
                <span>{trend.isPositive ? '↑' : '↓'}</span>
                <span>{trend.value}</span>
              </div>
            )}
          </div>
          <div className={`${gradient} p-3 rounded-xl`} style={{boxShadow: '0 4px 16px rgba(37,99,235,0.3), inset 0 1px 0 rgba(255,255,255,0.2)'}}>
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>
      </div>
    </div>
  );
}
