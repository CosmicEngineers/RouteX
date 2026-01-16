'use client';

import React from 'react';
import { WarningCircle, Warning, Info, FileText, CaretDown, CaretUp } from 'phosphor-react';

interface InfeasibilityMessage {
  type: 'error' | 'warning' | 'info';
  title: string;
  message: string;
  suggestions?: string[];
  logs?: string[];
}

interface EnhancedErrorDisplayProps {
  error: Error | string | Record<string, unknown>;
  solverLogs?: string[];
}

export function EnhancedErrorDisplay({ error, solverLogs = [] }: EnhancedErrorDisplayProps) {
  const [showLogs, setShowLogs] = React.useState(false);
  
  const parseError = (err: Error | string | Record<string, unknown>): InfeasibilityMessage => {
    const errorStr = (err as Error)?.message || err?.toString() || 'Unknown error';

    // Infeasibility detection
    if (errorStr.toLowerCase().includes('infeasible') || errorStr.toLowerCase().includes('no solution')) {
      return {
        type: 'error',
        title: 'No Feasible Solution Found',
        message: 'The optimization could not find a valid solution with the current fleet and delivery requirements.',
        suggestions: [
          '🚢 Increase fleet capacity by adding more vessels',
          '📦 Adjust delivery volumes at high-demand ports',
          '⏰ Allow more time by increasing Max Solve Time to 300s+',
          '🔧 Review and relax operational constraints',
          '📍 Consider flexible port scheduling'
        ]
      };
    }

    // Time limit detection
    if (errorStr.toLowerCase().includes('time') && errorStr.toLowerCase().includes('limit')) {
      return {
        type: 'warning',
        title: 'Time Limit Reached',
        message: 'Optimization stopped after reaching the maximum solve time. A partial solution may be available.',
        suggestions: [
          '⏱️ Increase solver time to 300s or 600s for better results',
          '⚡ Use "Fast" mode for quicker approximate solutions',
          '📉 Reduce problem complexity by limiting vessels or routes',
          '🔧 Enable route filtering to speed up solving'
        ]
      };
    }

    // Memory issues
    if (errorStr.toLowerCase().includes('memory') || errorStr.toLowerCase().includes('resource')) {
      return {
        type: 'error',
        title: 'Resource Limit Exceeded',
        message: 'The optimization problem is too large for available system resources.',
        suggestions: [
          '🔪 Enable aggressive route pruning',
          '📊 Reduce the number of vessels in the optimization',
          '⏰ Reduce the planning horizon',
          '🖥️ Run on a machine with more RAM'
        ]
      };
    }

    // Network/API errors
    if (errorStr.toLowerCase().includes('fetch') || errorStr.toLowerCase().includes('network')) {
      return {
        type: 'error',
        title: 'Server Connection Failed',
        message: 'Unable to connect to the optimization server. Please check your connection and try again.',
        suggestions: [
          '🌐 Verify your internet connection is active',
          '🔄 Refresh the page and retry',
          '🖥️ Ensure the backend server is running',
          '🔌 Check API endpoint configuration'
        ]
      };
    }

    // Generic error
    return {
      type: 'error',
      title: 'Optimization Error',
      message: errorStr,
      suggestions: [
        '🔄 Retry the optimization',
        '⚙️ Verify all input parameters',
        '📋 Review solver logs below for details',
        '💬 Contact support if this persists'
      ]
    };
  };

  const errorInfo = parseError(error);

  const getIcon = () => {
    switch (errorInfo.type) {
      case 'error':
        return <WarningCircle size={24} weight="duotone" className="text-red-400" />;
      case 'warning':
        return <Warning size={24} weight="duotone" className="text-amber-400" />;
      default:
        return <Info className="h-6 w-6 text-cyan-400" />;
    }
  };

  const getBgColor = () => {
    switch (errorInfo.type) {
      case 'error':
        return 'bg-red-500/10 border-red-500/30';
      case 'warning':
        return 'bg-amber-500/10 border-amber-500/30';
      default:
        return 'bg-cyan-500/10 border-cyan-500/30';
    }
  };

  return (
    <div className={`glass-card rounded-xl border p-6 ${getBgColor()}`}>
      <div className="flex items-start space-x-4">
        {getIcon()}
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-slate-100 mb-2">
            {errorInfo.title}
          </h3>
          <p className="text-slate-300 text-sm mb-4">
            {errorInfo.message}
          </p>

          {errorInfo.suggestions && errorInfo.suggestions.length > 0 && (
            <div className="bg-slate-800/50 rounded-lg p-4 mb-4">
              <div className="font-semibold text-slate-200 mb-2 text-sm">
                💡 Suggested Solutions:
              </div>
              <ul className="space-y-1.5">
                {errorInfo.suggestions.map((suggestion, idx) => (
                  <li key={idx} className="text-slate-300 text-sm">
                    {suggestion}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {solverLogs.length > 0 && (
            <div className="border-t border-slate-700/50 pt-4">
              <button
                onClick={() => setShowLogs(!showLogs)}
                className="flex items-center space-x-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
              >
                <FileText className="h-4 w-4" />
                <span>Solver Logs ({solverLogs.length} entries)</span>
                {showLogs ? (
                  <CaretUp size={16} weight="bold" />
                ) : (
                  <CaretDown size={16} weight="bold" />
                )}
              </button>

              {showLogs && (
                <div className="mt-3 bg-slate-900/50 rounded-lg p-4 max-h-64 overflow-y-auto font-mono text-xs">
                  {solverLogs.map((log, idx) => (
                    <div key={idx} className="text-slate-400 mb-1">
                      {log}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
