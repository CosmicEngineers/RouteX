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
    <div className="relative group">
      {/* Glow effect */}
      <div className={`absolute -inset-0.5 ${gradient} rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-300`}></div>
      
      {/* Card content */}
      <div className="relative rounded-2xl p-6 shadow-xl card-hover" style={{ backgroundColor: "#EAF8FF" }}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
            <h3 className="text-3xl font-black text-gray-900 mb-1">{value}</h3>
            {subtitle && (
              <p className="text-xs text-gray-500">{subtitle}</p>
            )}
            {trend && (
              <div className={`inline-flex items-center gap-1 mt-2 px-2 py-1 rounded-full text-xs font-semibold ${
                trend.isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                <span>{trend.isPositive ? '↑' : '↓'}</span>
                <span>{trend.value}</span>
              </div>
            )}
          </div>
          <div className={`${gradient} p-3 rounded-xl shadow-lg`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>
      </div>
    </div>
  );
}
