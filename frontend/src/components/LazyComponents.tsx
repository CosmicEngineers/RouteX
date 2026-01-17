// Performance optimizations configuration
// Lazy-load heavy components for better initial load time

import dynamic from 'next/dynamic';
import React from 'react';

// Lazy load deck.gl and map components with loading fallbacks
export const MaritimeMapLazy = dynamic(
  () => import('./MaritimeMap').then(mod => ({ default: mod.MaritimeMap })),
  {
    loading: () => (
      <div className="h-96 bg-slate-800/50 rounded-xl flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4" />
          <p className="text-slate-400">Loading map...</p>
        </div>
      </div>
    ),
    ssr: false
  }
);

export const FleetGanttChartLazy = dynamic(
  () => import('./FleetGanttChart').then(mod => ({ default: mod.FleetGanttChart })),
  {
    loading: () => (
      <div className="h-64 bg-slate-800/50 rounded-xl flex items-center justify-center">
        <div className="animate-pulse text-slate-400">Loading Gantt chart...</div>
      </div>
    ),
    ssr: false
  }
);

export const ResultsDisplayLazy = dynamic(
  () => import('./ResultsDisplay').then(mod => ({ default: mod.ResultsDisplay })),
  {
    loading: () => (
      <div className="space-y-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 bg-slate-800/50 rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }
);

export const ChallengeOutputLazy = dynamic(
  () => import('./ChallengeOutput').then(mod => ({ default: mod.ChallengeOutput })),
  {
    loading: () => (
      <div className="h-96 bg-slate-800/50 rounded-xl flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4" />
          <p className="text-slate-400">Loading challenge output...</p>
        </div>
      </div>
    )
  }
);

// Bundle size optimization tips:
// 1. Use dynamic imports for routes/pages
// 2. Code split by route using Next.js automatic code splitting
// 3. Use next/image for optimized image loading
// 4. Enable compression in production build
// 5. Analyze bundle with 'npm run build && npm run analyze'
