'use client';

import React, { useState, useEffect } from 'react';
import { Activity, Clock, Cpu, CheckCircle, XCircle, CircleNotch, Lightning } from 'phosphor-react';
import { OptimizationResult } from './HPCLDashboard';

export interface RunStatus {
  result_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'unknown';
  progress: number;
  message: string;
  metadata?: {
    solver_profile?: string;
    start_time?: string;
    max_time_seconds?: number;
    num_workers?: number;
    routes_generated?: number;
    num_variables?: number;
    num_constraints?: number;
    solve_time_seconds?: number;
    best_objective?: number;
  };
  result?: OptimizationResult;
  error?: string;
}

interface RunStatusCardProps {
  resultId: string | null;
  onComplete?: (result: OptimizationResult) => void;
  onError?: (error: string) => void;
  pollInterval?: number; // milliseconds
}

export function RunStatusCard({ 
  resultId, 
  onComplete, 
  onError,
  pollInterval = 2000 
}: RunStatusCardProps) {
  const [status, setStatus] = useState<RunStatus | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Poll for status updates
  useEffect(() => {
    if (!resultId) {
      setStatus(null);
      return;
    }

    const pollStatus = async () => {
      try {
        const response = await fetch(`/api/v1/results/${resultId}`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data: RunStatus = await response.json();
        setStatus(data);

        // Stop polling if completed or failed
        if (data.status === 'completed') {
          if (onComplete && data.result) {
            onComplete(data.result);
          }
        } else if (data.status === 'failed') {
          if (onError) {
            onError(data.error || 'Optimization failed');
          }
        }
      } catch (error) {
        console.error('Failed to poll status:', error);
      }
    };
    
    // Initial poll
    pollStatus();

    // Set up polling interval
    const intervalId = setInterval(pollStatus, pollInterval);

    // Track elapsed time
    const startTime = Date.now();
    const timeIntervalId = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    // Cleanup
    return () => {
      clearInterval(intervalId);
      clearInterval(timeIntervalId);
    };
  }, [resultId, pollInterval, onComplete, onError]);

  if (!status) {
    return null;
  }

  const getStatusIcon = () => {
    switch (status.status) {
      case 'pending':
        return <Clock size={24} weight="duotone" className="text-yellow-400 animate-pulse" />;
      case 'processing':
        return <CircleNotch size={24} weight="bold" className="text-blue-400 animate-spin" />;
      case 'completed':
        return <CheckCircle size={24} weight="duotone" className="text-green-400" />;
      case 'failed':
        return <XCircle size={24} weight="duotone" className="text-red-400" />;
      default:
        return <Activity size={24} weight="duotone" className="text-slate-400" />;
    }
  };

  const getStatusColor = () => {
    switch (status.status) {
      case 'pending':
        return 'border-yellow-500/30 bg-yellow-500/5';
      case 'processing':
        return 'border-blue-500/30 bg-blue-500/5';
      case 'completed':
        return 'border-green-500/30 bg-green-500/5';
      case 'failed':
        return 'border-red-500/30 bg-red-500/5';
      default:
        return 'border-slate-700/50';
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const metadata = status.metadata || {};

  return (
    <div className={`glass-card rounded-xl border p-6 ${getStatusColor()}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          {getStatusIcon()}
          <div>
            <h3 className="text-lg font-semibold text-slate-100">
              Optimization Run
            </h3>
            <p className="text-sm text-slate-400">
              ID: {status.result_id.substring(0, 16)}...
            </p>
          </div>
        </div>
        
        <div className="text-right">
          <div className="text-2xl font-bold text-slate-100">
            {formatTime(elapsedTime)}
          </div>
          <div className="text-xs text-slate-400">
            Elapsed Time
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      {status.status === 'processing' && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-slate-300">{status.message}</span>
            <span className="text-slate-400">{status.progress}%</span>
          </div>
          <div className="w-full bg-slate-700/50 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-blue-500 to-cyan-400 h-2 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${status.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Status Message */}
      <div className={`text-sm mb-4 p-3 rounded-lg ${
        status.status === 'completed' ? 'bg-green-500/10 text-green-300' :
        status.status === 'failed' ? 'bg-red-500/10 text-red-300' :
        'bg-slate-700/30 text-slate-300'
      }`}>
        {status.status === 'completed' && '✅ Optimization completed successfully'}
        {status.status === 'failed' && `❌ ${status.error || 'Optimization failed'}`}
        {status.status === 'processing' && `⚙️ ${status.message}`}
        {status.status === 'pending' && '⏳ Optimization queued...'}
      </div>

      {/* Solver Configuration */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-slate-800/50 rounded-lg p-3">
          <div className="flex items-center text-slate-400 text-xs mb-1">
            <Lightning size={12} weight="bold" className="mr-1" />
            Solver Profile
          </div>
          <div className="text-slate-100 font-medium capitalize">
            {metadata.solver_profile || 'Balanced'}
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-lg p-3">
          <div className="flex items-center text-slate-400 text-xs mb-1">
            <Cpu className="h-3 w-3 mr-1" />
            Workers
          </div>
          <div className="text-slate-100 font-medium">
            {metadata.num_workers || 4} threads
          </div>
        </div>
      </div>

      {/* Model Statistics */}
      {(metadata.routes_generated || metadata.num_variables) && (
        <div className="grid grid-cols-3 gap-2 text-center">
          {metadata.routes_generated && (
            <div className="bg-slate-800/30 rounded-lg p-2">
              <div className="text-lg font-bold text-cyan-400">
                {metadata.routes_generated.toLocaleString()}
              </div>
              <div className="text-xs text-slate-400">Routes</div>
            </div>
          )}
          {metadata.num_variables && (
            <div className="bg-slate-800/30 rounded-lg p-2">
              <div className="text-lg font-bold text-blue-400">
                {metadata.num_variables.toLocaleString()}
              </div>
              <div className="text-xs text-slate-400">Variables</div>
            </div>
          )}
          {metadata.num_constraints && (
            <div className="bg-slate-800/30 rounded-lg p-2">
              <div className="text-lg font-bold text-purple-400">
                {metadata.num_constraints.toLocaleString()}
              </div>
              <div className="text-xs text-slate-400">Constraints</div>
            </div>
          )}
        </div>
      )}

      {/* Best Objective (if available) */}
      {metadata.best_objective && status.status === 'processing' && (
        <div className="mt-4 bg-gradient-to-r from-green-500/10 to-cyan-500/10 border border-green-500/20 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center text-green-400">
              <Activity size={16} weight="bold" className="mr-2" />
              <span className="text-sm font-medium">Best Cost Found</span>
            </div>
            <div className="text-lg font-bold text-green-300">
              ₹{(metadata.best_objective / 10000000).toFixed(2)} Cr
            </div>
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Solver continuing to improve...
          </div>
        </div>
      )}

      {/* Time Limit Warning */}
      {status.status === 'processing' && metadata.max_time_seconds && elapsedTime >= metadata.max_time_seconds * 0.9 && (
        <div className="mt-3 text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-2">
          ⚠️ Approaching time limit ({metadata.max_time_seconds}s) - solver will return best solution found
        </div>
      )}
    </div>
  );
}
