# RouteX Frontend - Next.js Dashboard

Modern, responsive web interface for HPCL's coastal tanker fleet optimization platform.

## Overview

The frontend provides an interactive dashboard for visualizing optimization results, managing fleet operations, and controlling the optimization engine. Built with Next.js 14, TypeScript, and Tailwind CSS for a fast, type-safe, and beautiful user experience.

## Technology Stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| **Next.js** | 14+ | React framework with App Router |
| **React** | 18+ | UI component library |
| **TypeScript** | 5.0+ | Type-safe JavaScript |
| **Tailwind CSS** | 3.4+ | Utility-first CSS framework |
| **Phosphor Icons** | Latest | Modern icon library |
| **Recharts** | Latest | Data visualization |
| **Google Maps API** | Latest | Interactive maritime maps |

## Features

### Core Components

- **HPCLDashboard**: Main dashboard container with tab navigation
- **ChallengeOutput**: Challenge 7.1 optimization interface and results table
- **OptimizationPanel**: Control panel for running optimizations with custom parameters
- **ResultsDisplay**: Comprehensive visualization of optimization results
- **MaritimeMap**: Interactive map showing ports and routes
- **FleetGanttChart**: Timeline visualization of vessel schedules
- **FleetOverview**: Real-time fleet status and metrics
- **RunHistory**: Historical optimization runs and comparisons

### User Experience

- **Guided Tour**: Interactive onboarding for new users
- **Responsive Design**: Mobile, tablet, and desktop support
- **Dark/Light Themes**: Automatic theme switching (planned)
- **Accessibility**: WCAG 2.1 AA compliant
- **Performance**: Lazy loading, code splitting, and optimized rendering

## Quick Start

### Prerequisites

- Node.js 18.0 or higher
- npm or yarn package manager

### Installation

```bash
# Install dependencies
npm install
# or
yarn install
```

### Environment Variables

Create `.env.local` file:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Development Server

```bash
# Start development server
npm run dev
# or
yarn dev
```

Application will be available at **http://localhost:3000**

### Build for Production

```bash
# Create production build
npm run build

# Start production server
npm start
```

## Project Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout with metadata
│   │   ├── page.tsx            # Home page
│   │   └── globals.css         # Global styles
│   ├── components/
│   │   ├── HPCLDashboard.tsx   # Main dashboard
│   │   ├── ChallengeOutput.tsx # Challenge 7.1 interface
│   │   ├── OptimizationPanel.tsx
│   │   ├── ResultsDisplay.tsx
│   │   ├── MaritimeMap.tsx
│   │   ├── FleetGanttChart.tsx
│   │   ├── FleetOverview.tsx
│   │   ├── RunHistory.tsx
│   │   ├── GuidedTour.tsx
│   │   ├── LoadingSkeleton.tsx
│   │   ├── EnhancedErrorDisplay.tsx
│   │   └── ...
│   └── utils/
│       ├── formatters.ts       # Number/date formatting
│       ├── accessibility.ts    # A11y utilities
│       └── jps-pathfinding.ts  # Pathfinding algorithms
├── public/
│   └── assets/                 # Static images and files
├── package.json
├── tsconfig.json
├── next.config.js
├── tailwind.config.js
└── postcss.config.mjs
```

## Key Components Documentation

### HPCLDashboard

Main container component managing application state and navigation.

```tsx
interface HPCLDashboardProps {
  // No props - uses internal state management
}

// State includes:
// - vessels: HPCLVessel[]
// - ports: HPCLPort[]
// - optimizationResult: OptimizationResult | null
// - activeTab: 'overview' | 'optimize' | 'results' | 'challenge'
// - isOptimizing: boolean
```

### ChallengeOutput

Displays Challenge 7.1 specific interface with input data and results table.

```tsx
interface ChallengeOutputProps {
  // No props - manages state internally
}

// Features:
// - Editable vessel and demand inputs
// - Real-time optimization execution
// - Results display in challenge format (Source | Destination | Tanker | Volume | Cost)
// - Export to CSV/JSON
// - Trip-by-trip breakdown with cargo deliveries
```

### MaritimeMap

Interactive Google Maps visualization showing ports and vessel routes with maritime pathfinding.

```tsx
interface MaritimeMapProps {
  vessels: HPCLVessel[];
  ports: HPCLPort[];
  optimizationRoutes?: any[];
  currentRouteIndex?: number;
  showLiveStatus?: boolean;
  onNextRoute?: () => void;
  onPrevRoute?: () => void;
  onGoToRoute?: (index: number) => void;
  totalRoutes?: number;
  selectedRoutes?: any[];
}

// Features:
// - Google Maps integration with maritime routes
// - JPS (Jump Point Search) pathfinding for coastal navigation
// - Route playback and animation
// - Port markers with popups
// - Real-time route visualization
```

### FleetGanttChart

Timeline visualization of vessel schedules showing loading, transit, unloading, and idle phases.

```tsx
interface FleetGanttChartProps {
  vessels: Array<{ id: string; name: string }>;
  trips: Trip[];
  monthHours?: number;  // Default: 720 hours
}

interface Trip {
  vessel: string;
  start_hour: number;
  end_hour: number;
  route: string;
  phase: 'loading' | 'transit' | 'unloading' | 'idle';
  color: string;
}
```

## API Integration

### Fetching Data

```typescript
const fetchOptimization = async () => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/challenge/optimize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      round_trip: false,
      optimization_objective: 'cost'
    })
  });
  
  const result = await response.json();
  return result;
};
```

### Error Handling

```typescript
try {
  const result = await fetchOptimization();
  setOptimizationResult(result);
} catch (error) {
  console.error('Optimization failed:', error);
  setError({
    title: 'Optimization Failed',
    message: error.message,
    details: error.response?.data
  });
}
```

## Styling Guidelines

### Tailwind CSS Usage

```tsx
// Component styling example
<div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
    Fleet Overview
  </h2>
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {/* Cards */}
  </div>
</div>
```

### Responsive Design

```tsx
// Mobile-first approach
<div className="
  w-full              // Mobile: full width
  md:w-1/2            // Tablet: half width
  lg:w-1/3            // Desktop: third width
  xl:w-1/4            // Large desktop: quarter width
">
  {/* Content */}
</div>
```

## State Management

### Local State with Hooks

```typescript
// Component state
const [vessels, setVessels] = useState<HPCLVessel[]>([]);
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState<Error | null>(null);

// Side effects
useEffect(() => {
  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await fetchVessels();
      setVessels(data);
    } catch (err) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  };
  
  loadData();
}, []);
```

### Persistent State (localStorage)

```typescript
// Save to localStorage
useEffect(() => {
  if (optimizationResult) {
    localStorage.setItem('hpcl_optimization_result', JSON.stringify(optimizationResult));
  }
}, [optimizationResult]);

// Load from localStorage
useEffect(() => {
  const saved = localStorage.getItem('hpcl_optimization_result');
  if (saved) {
    setOptimizationResult(JSON.parse(saved));
  }
}, []);
```

## Performance Optimization

### Code Splitting

```typescript
// Lazy load heavy components
import dynamic from 'next/dynamic';

const MaritimeMap = dynamic(() => import('./MaritimeMap'), {
  ssr: false,
  loading: () => <LoadingSkeleton />
});
```

### Memoization

```typescript
import { useMemo, useCallback } from 'react';

// Memoize expensive calculations
const totalCost = useMemo(() => {
  return routes.reduce((sum, route) => sum + route.total_cost, 0);
}, [routes]);

// Memoize callbacks
const handleRouteClick = useCallback((routeId: string) => {
  setSelectedRoute(routes.find(r => r.route_id === routeId));
}, [routes]);
```

## Testing

### Component Testing

```bash
# Run tests (if configured)
npm test

# Run tests in watch mode
npm test -- --watch
```

### Type Checking

```bash
# Check TypeScript types
npm run type-check
# or
tsc --noEmit
```

### Linting

```bash
# Run ESLint
npm run lint

# Fix auto-fixable issues
npm run lint -- --fix
```

## Accessibility

### ARIA Labels

```tsx
<button
  aria-label="Run optimization"
  aria-busy={isOptimizing}
  disabled={isOptimizing}
>
  {isOptimizing ? 'Optimizing...' : 'Run Optimization'}
</button>
```

### Keyboard Navigation

```tsx
<div
  tabIndex={0}
  role="button"
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleClick();
    }
  }}
>
  Interactive Element
</div>
```

## Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Custom Server

```bash
# Build for production
npm run build

# Start production server
npm start
```

### Environment Variables for Production

```env
NEXT_PUBLIC_API_URL=https://api.routex.example.com
```

## Common Issues & Solutions

### Issue: API Connection Failed

**Solution**: Check that backend server is running and `NEXT_PUBLIC_API_URL` is correct.

### Issue: Map Not Rendering

**Solution**: Leaflet requires `ssr: false` in dynamic import.

```typescript
const MaritimeMap = dynamic(() => import('./MaritimeMap'), {
  ssr: false
});
```

### Issue: Slow Page Load

**Solution**: Implement lazy loading for heavy components and use Next.js Image optimization.

## Contributing

When contributing to the frontend:

1. Follow TypeScript strict mode
2. Use Tailwind CSS utility classes (avoid custom CSS)
3. Implement responsive design (mobile-first)
4. Add proper TypeScript types for all props and state
5. Test accessibility with screen readers
6. Optimize images and assets

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)

---

For backend integration details, see [Backend README](../backend/README.md)

For overall project documentation, see [Main README](../README.md)
