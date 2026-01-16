'use client';

import React from 'react';

interface LoadingSkeletonProps {
  type?: 'kpi' | 'chart' | 'table' | 'card';
  count?: number;
}

export function LoadingSkeleton({ type = 'card', count = 1 }: LoadingSkeletonProps) {
  const renderSkeleton = () => {
    switch (type) {
      case 'kpi':
        return (
          <div className="glass-card rounded-xl border border-slate-700/50 p-8 animate-pulse">
            <div className="flex items-center">
              <div className="w-16 h-16 bg-slate-700/50 rounded-xl" />
              <div className="ml-5 flex-1">
                <div className="h-4 bg-slate-700/50 rounded w-24 mb-2" />
                <div className="h-8 bg-slate-700/50 rounded w-32 mb-2" />
                <div className="h-3 bg-slate-700/50 rounded w-20" />
              </div>
            </div>
          </div>
        );

      case 'chart':
        return (
          <div className="glass-card rounded-xl border border-slate-700/50 p-8 animate-pulse">
            <div className="h-6 bg-slate-700/50 rounded w-48 mb-6" />
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <div className="h-8 bg-slate-700/50 rounded flex-1" style={{ width: `${80 - i * 10}%` }} />
                </div>
              ))}
            </div>
          </div>
        );

      case 'table':
        return (
          <div className="glass-card rounded-xl border border-slate-700/50 p-8 animate-pulse">
            <div className="h-6 bg-slate-700/50 rounded w-64 mb-6" />
            <div className="space-y-3">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="flex space-x-4">
                  <div className="h-10 bg-slate-700/50 rounded w-1/4" />
                  <div className="h-10 bg-slate-700/50 rounded w-1/4" />
                  <div className="h-10 bg-slate-700/50 rounded w-1/4" />
                  <div className="h-10 bg-slate-700/50 rounded w-1/4" />
                </div>
              ))}
            </div>
          </div>
        );

      default: // card
        return (
          <div className="glass-card rounded-xl border border-slate-700/50 p-6 animate-pulse">
            <div className="h-5 bg-slate-700/50 rounded w-3/4 mb-4" />
            <div className="h-4 bg-slate-700/50 rounded w-full mb-2" />
            <div className="h-4 bg-slate-700/50 rounded w-5/6" />
          </div>
        );
    }
  };

  return (
    <>
      {[...Array(count)].map((_, i) => (
        <div key={i}>{renderSkeleton()}</div>
      ))}
    </>
  );
}

export function OptimizationLoadingState() {
  return (
    <div className="space-y-8">
      {/* KPI Skeletons */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <LoadingSkeleton type="kpi" count={4} />
      </div>

      {/* Chart Skeletons */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LoadingSkeleton type="chart" />
        <LoadingSkeleton type="chart" />
      </div>

      {/* Table Skeleton */}
      <LoadingSkeleton type="table" />
    </div>
  );
}
