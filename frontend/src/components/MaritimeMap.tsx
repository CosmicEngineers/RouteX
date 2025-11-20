'use client';

import React, { useMemo, useState, useEffect } from 'react';
import DeckGL from '@deck.gl/react';
import { ScatterplotLayer, TextLayer, ArcLayer } from '@deck.gl/layers';
import { HPCLVessel, HPCLPort } from './HPCLDashboard';

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

export function MaritimeMap({ 
  vessels, 
  ports, 
  optimizationRoutes = [], 
  currentRouteIndex = -1, 
  showLiveStatus = false,
  onNextRoute,
  onPrevRoute,
  onGoToRoute,
  totalRoutes = 0,
  selectedRoutes = [] 
}: MaritimeMapProps) {
  const [viewState, setViewState] = useState({
    longitude: 76.5,
    latitude: 15.8,
    zoom: 5.8,
    pitch: 35,
    bearing: 0,
    maxZoom: 16,
    minZoom: 4
  });

  const [time, setTime] = useState(0);

  // Animation loop for moving vessels
  useEffect(() => {
    const interval = setInterval(() => {
      setTime(t => t + 0.1);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  // Keyboard navigation for routes
  useEffect(() => {
    if (showLiveStatus || !onNextRoute || !onPrevRoute) return;

    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        event.preventDefault();
        onNextRoute();
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        event.preventDefault();
        onPrevRoute();
      } else if (event.key >= '1' && event.key <= '9') {
        event.preventDefault();
        const routeIndex = parseInt(event.key) - 1;
        if (onGoToRoute && routeIndex < totalRoutes) {
          onGoToRoute(routeIndex);
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [showLiveStatus, onNextRoute, onPrevRoute, onGoToRoute, totalRoutes]);

  // Enhanced HPCL Port Data with realistic coordinates
  const enhancedPorts = useMemo(() => {
    const hpclPortData = [
      // Loading Ports (6 major HPCL terminals)
      { id: 'INMUN', name: 'Mumbai (HPCL)', type: 'loading', latitude: 18.9667, longitude: 72.8333, state: 'Maharashtra', capacity: 15000, status: 'active' },
      { id: 'INKAN', name: 'Kandla (HPCL)', type: 'loading', latitude: 23.0333, longitude: 70.2167, state: 'Gujarat', capacity: 18000, status: 'active' },
      { id: 'INVIZ', name: 'Visakhapatnam (HPCL)', type: 'loading', latitude: 17.7, longitude: 83.3, state: 'Andhra Pradesh', capacity: 20000, status: 'active' },
      { id: 'INHAL', name: 'Haldia (HPCL)', type: 'loading', latitude: 22.0667, longitude: 88.1, state: 'West Bengal', capacity: 16000, status: 'active' },
      { id: 'INPAR', name: 'Paradip (HPCL)', type: 'loading', latitude: 20.2667, longitude: 86.6167, state: 'Odisha', capacity: 14000, status: 'active' },
      { id: 'INCHE', name: 'Chennai (HPCL)', type: 'loading', latitude: 13.0833, longitude: 80.2833, state: 'Tamil Nadu', capacity: 17000, status: 'active' },
      
      // Unloading Ports (11 distribution terminals)
      { id: 'INKOC', name: 'Kochi Terminal', type: 'unloading', latitude: 9.9667, longitude: 76.2833, state: 'Kerala', capacity: 8000, status: 'active' },
      { id: 'INTUT', name: 'Tuticorin Terminal', type: 'unloading', latitude: 8.8, longitude: 78.15, state: 'Tamil Nadu', capacity: 9000, status: 'active' },
      { id: 'INCAL', name: 'Calicut Terminal', type: 'unloading', latitude: 11.25, longitude: 75.7833, state: 'Kerala', capacity: 7000, status: 'active' },
      { id: 'INMANG', name: 'Mangalore Terminal', type: 'unloading', latitude: 12.85, longitude: 74.85, state: 'Karnataka', capacity: 10000, status: 'active' },
      { id: 'INGOA', name: 'Goa Terminal', type: 'unloading', latitude: 15.4833, longitude: 73.8167, state: 'Goa', capacity: 6000, status: 'active' },
      { id: 'INJNP', name: 'JNPT Terminal', type: 'unloading', latitude: 18.9333, longitude: 72.95, state: 'Maharashtra', capacity: 12000, status: 'active' },
      { id: 'INDAH', name: 'Dahej Terminal', type: 'unloading', latitude: 21.7, longitude: 72.6, state: 'Gujarat', capacity: 11000, status: 'active' },
      { id: 'INORK', name: 'Okha Terminal', type: 'unloading', latitude: 22.4667, longitude: 69.0833, state: 'Gujarat', capacity: 5000, status: 'active' },
      { id: 'INENN', name: 'Ennore Terminal', type: 'unloading', latitude: 13.2167, longitude: 80.3167, state: 'Tamil Nadu', capacity: 13000, status: 'active' },
      { id: 'INKAR', name: 'Kakinada Terminal', type: 'unloading', latitude: 16.9333, longitude: 82.2167, state: 'Andhra Pradesh', capacity: 9500, status: 'active' },
      { id: 'INBHV', name: 'Bhavnagar Terminal', type: 'unloading', latitude: 21.7645, longitude: 72.1519, state: 'Gujarat', capacity: 8500, status: 'active' }
    ];
    return hpclPortData;
  }, []);

  // Enhanced HPCL Vessel Fleet with current positions and animation
  const enhancedVessels = useMemo(() => {
    return [
      { 
        id: 'HPCL-CT-001', name: 'HPCL Coastal Spirit', capacity_mt: 32000, status: 'available', 
        current_port: 'Mumbai (HPCL)', lat: 18.9767, lon: 72.8433, heading: 45,
        speed: 0, fuel: 85, crew: 22, route: null
      },
      { 
        id: 'HPCL-CT-002', name: 'HPCL Ocean Pride', capacity_mt: 28000, status: 'sailing', 
        current_port: 'En Route', 
        lat: 20.5 + Math.sin(time * 0.5) * 0.1, 
        lon: 71.2 + Math.cos(time * 0.3) * 0.15, 
        heading: 180 + time * 2,
        speed: 12.5, fuel: 65, crew: 20, route: 'Mumbai → Kochi'
      },
      { 
        id: 'HPCL-CT-003', name: 'HPCL Maritime Excel', capacity_mt: 35000, status: 'available', 
        current_port: 'Visakhapatnam (HPCL)', lat: 17.7100, lon: 83.3100, heading: 0,
        speed: 0, fuel: 95, crew: 24, route: null
      },
      { 
        id: 'HPCL-CT-004', name: 'HPCL Coastal Warrior', capacity_mt: 30000, status: 'loading', 
        current_port: 'Kandla (HPCL)', lat: 23.0433, lon: 70.2267, heading: 90,
        speed: 0, fuel: 78, crew: 21, route: null
      },
      { 
        id: 'HPCL-CT-005', name: 'HPCL Blue Navigator', capacity_mt: 25000, status: 'maintenance', 
        current_port: 'Chennai (HPCL)', lat: 13.0933, lon: 80.2933, heading: 0,
        speed: 0, fuel: 45, crew: 19, route: null
      },
      { 
        id: 'HPCL-CT-006', name: 'HPCL Eastern Star', capacity_mt: 33000, status: 'sailing', 
        current_port: 'En Route', 
        lat: 19.8 + Math.sin(time * 0.4) * 0.08, 
        lon: 85.2 + Math.cos(time * 0.6) * 0.12, 
        heading: 225 + time * 1.5,
        speed: 11.8, fuel: 72, crew: 23, route: 'Haldia → Chennai'
      },
      { 
        id: 'HPCL-CT-007', name: 'HPCL Western Gem', capacity_mt: 27000, status: 'unloading', 
        current_port: 'Goa Terminal', lat: 15.4933, lon: 73.8267, heading: 0,
        speed: 0, fuel: 68, crew: 20, route: null
      },
      { 
        id: 'HPCL-CT-008', name: 'HPCL Southern Belle', capacity_mt: 29000, status: 'available', 
        current_port: 'Tuticorin Terminal', lat: 8.8100, lon: 78.1600, heading: 0,
        speed: 0, fuel: 88, crew: 21, route: null
      },
      { 
        id: 'HPCL-CT-009', name: 'HPCL Coastal Champion', capacity_mt: 31000, status: 'sailing', 
        current_port: 'En Route', 
        lat: 16.2 + Math.sin(time * 0.3) * 0.06, 
        lon: 81.8 + Math.cos(time * 0.4) * 0.1, 
        heading: 315 + time * 1.8,
        speed: 13.2, fuel: 55, crew: 22, route: 'Paradip → Kakinada'
      }
    ];
  }, [time]);

  // Current route data for visualization
  const currentRoute = currentRouteIndex >= 0 && currentRouteIndex < optimizationRoutes.length 
    ? optimizationRoutes[currentRouteIndex] 
    : null;

  // Create route arcs for the current step
  const currentRouteArcs = useMemo(() => {
    if (!currentRoute || showLiveStatus) return [];
    
    return currentRoute.route.map((step: any, index: number) => {
      if (index === 0) return null; // Skip first point (loading port)
      const prevStep = currentRoute.route[index - 1];
      return {
        source: [prevStep.lon, prevStep.lat],
        target: [step.lon, step.lat],
        color: currentRoute.color || '#3B82F6',
        width: 6,
        description: `${prevStep.port} → ${step.port}`,
        cargo: currentRoute.cargo,
        sequence: currentRoute.sequence
      };
    }).filter(Boolean);
  }, [currentRoute, showLiveStatus]);

  // All completed routes (for context)
  const completedRoutes = useMemo(() => {
    if (showLiveStatus || currentRouteIndex < 0) return [];
    
    return optimizationRoutes.slice(0, currentRouteIndex).map(route => 
      route.route.map((step: any, index: number) => {
        if (index === 0) return null;
        const prevStep = route.route[index - 1];
        return {
          source: [prevStep.lon, prevStep.lat],
          target: [step.lon, step.lat],
          color: '#94A3B8', // Gray for completed
          width: 2,
          description: `Completed: ${prevStep.port} → ${step.port}`,
          cargo: route.cargo,
          sequence: route.sequence
        };
      }).filter(Boolean)
    ).flat();
  }, [optimizationRoutes, currentRouteIndex, showLiveStatus]);

  // Create proper 3D layers for maritime visualization
  const layers = [
    // Completed routes (gray background)
    new ArcLayer({
      id: 'completed-routes',
      data: completedRoutes,
      pickable: false,
      getSourcePosition: (d: any) => d.source,
      getTargetPosition: (d: any) => d.target,
      getSourceColor: [148, 163, 184, 120], // Gray for completed
      getTargetColor: [148, 163, 184, 80],
      getWidth: (d: any) => d.width || 2,
      getHeight: 0.1,
    }),

    // Current active route (highlighted)
    new ArcLayer({
      id: 'current-route',
      data: currentRouteArcs,
      pickable: true,
      getSourcePosition: (d: any) => d.source,
      getTargetPosition: (d: any) => d.target,
      getSourceColor: [59, 130, 246, 255], // Blue
      getTargetColor: [59, 130, 246, 180],
      getWidth: (d: any) => d.width || 6,
      getHeight: 0.3,
    }),

    // Port markers (enhanced for route visualization)
    new ScatterplotLayer({
      id: 'ports',
      data: enhancedPorts,
      pickable: true,
      opacity: 0.95,
      stroked: true,
      filled: true,
      radiusScale: 1,
      radiusMinPixels: 10,
      radiusMaxPixels: 35,
      lineWidthMinPixels: 2,
      getPosition: (d: any) => [d.longitude, d.latitude, d.type === 'loading' ? 1500 : 800],
      getRadius: (d: any) => {
        // Highlight ports in current route
        if (currentRoute && !showLiveStatus) {
          const isInRoute = currentRoute.route.some((step: any) => step.port === d.name);
          return isInRoute ? Math.sqrt(d.capacity || 10000) * 20 : Math.sqrt(d.capacity || 10000) * 12;
        }
        return Math.sqrt(d.capacity || 10000) * 15;
      },
      getFillColor: (d: any) => {
        // Highlight ports in current route
        if (currentRoute && !showLiveStatus) {
          const isInRoute = currentRoute.route.some((step: any) => step.port === d.name);
          if (isInRoute) {
            return d.type === 'loading' ? [255, 215, 0, 255] : [255, 165, 0, 255]; // Gold highlight
          }
        }
        return d.type === 'loading' 
          ? [34, 197, 94, 255]   // Green for loading ports
          : [59, 130, 246, 255]; // Blue for unloading ports
      },
      getLineColor: [255, 255, 255, 255],
    }),

    // Vessel markers (show current vessel if in route mode)
    new ScatterplotLayer({
      id: 'vessels',
      data: showLiveStatus ? enhancedVessels : (currentRoute ? [{
        ...enhancedVessels.find(v => v.id === currentRoute.vessel),
        lat: currentRoute.route[0].lat,
        lon: currentRoute.route[0].lon,
        highlighted: true
      }] : enhancedVessels),
      pickable: true,
      opacity: 1.0,
      stroked: true,
      filled: true,
      radiusScale: 1,
      radiusMinPixels: 8,
      radiusMaxPixels: 30,
      lineWidthMinPixels: 3,
      getPosition: (d: any) => [d.lon, d.lat, d.highlighted ? 800 : (d.status === 'sailing' ? 500 : 200)],
      getRadius: (d: any) => d.highlighted ? 25 : Math.sqrt(d.capacity_mt) * 8,
      getFillColor: (d: any) => {
        if (d.highlighted) return [255, 215, 0, 255]; // Gold for highlighted vessel
        
        switch (d.status) {
          case 'available': return [34, 197, 94, 255];   // Green
          case 'sailing': return [59, 130, 246, 255];    // Blue  
          case 'loading': return [251, 191, 36, 255];    // Yellow
          case 'unloading': return [168, 85, 247, 255];  // Purple
          case 'maintenance': return [239, 68, 68, 255]; // Red
          default: return [156, 163, 175, 255];          // Gray
        }
      },
      getLineColor: [255, 255, 255, 255],
      updateTriggers: {
        getFillColor: [enhancedVessels, currentRoute, showLiveStatus],
        getPosition: [enhancedVessels, currentRoute, showLiveStatus],
        getRadius: [enhancedVessels, currentRoute, showLiveStatus]
      }
    }),

    // Port labels (clear and readable)
    new TextLayer({
      id: 'port-labels',
      data: enhancedPorts,
      pickable: false,
      getPosition: (d: any) => [d.longitude, d.latitude + 0.15, 2000],
      getText: (d: any) => d.name.replace(' (HPCL)', '').replace(' Terminal', ''),
      getSize: (d: any) => {
        // Larger text for ports in current route
        if (currentRoute && !showLiveStatus) {
          const isInRoute = currentRoute.route.some((step: any) => step.port === d.name);
          return isInRoute ? 18 : 14;
        }
        return 16;
      },
      getColor: (d: any) => {
        // Highlight text for ports in current route
        if (currentRoute && !showLiveStatus) {
          const isInRoute = currentRoute.route.some((step: any) => step.port === d.name);
          return isInRoute ? [255, 215, 0, 255] : [255, 255, 255, 255];
        }
        return [255, 255, 255, 255];
      },
      getAngle: 0,
      getTextAnchor: 'middle',
      getAlignmentBaseline: 'center',
      fontFamily: 'Arial, sans-serif'
    }),

    // Vessel labels (ship names)
    new TextLayer({
      id: 'vessel-labels',
      data: showLiveStatus ? enhancedVessels : (currentRoute ? [{
        ...enhancedVessels.find(v => v.id === currentRoute.vessel),
        lat: currentRoute.route[0].lat,
        lon: currentRoute.route[0].lon,
        highlighted: true
      }] : enhancedVessels),
      pickable: false,
      getPosition: (d: any) => [d.lon, d.lat - 0.08, 700],
      getText: (d: any) => d.highlighted ? `${d.name.replace('HPCL ', '')} (ACTIVE)` : d.name.replace('HPCL ', ''),
      getSize: (d: any) => d.highlighted ? 14 : 12,
      getColor: (d: any) => d.highlighted ? [255, 215, 0, 255] : [255, 255, 255, 220],
      getAngle: 0,
      getTextAnchor: 'middle',
      getAlignmentBaseline: 'center',
      fontFamily: 'Arial, sans-serif'
    })
  ];

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Enhanced Map Header */}
      <div className="px-6 py-4 bg-gradient-to-r from-blue-900 to-blue-700 text-white">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold">
              {showLiveStatus ? 'HPCL Live Fleet Status' : 'HPCL Optimized Route Visualization'}
            </h3>
            <p className="text-blue-100 text-sm">
              {showLiveStatus 
                ? 'Real-time coastal tanker fleet monitoring'
                : currentRoute 
                  ? `Step ${currentRoute.sequence}: ${currentRoute.description}`
                  : 'Step-by-step algorithmic route optimization'
              }
            </p>
          </div>
          <div className="flex items-center space-x-6 text-xs">
            {!showLiveStatus && currentRoute && (
              <div className="bg-black/20 px-3 py-1 rounded">
                <span className="font-medium">Cost: ₹{(currentRoute.cost / 100000).toFixed(0)}L</span>
                <span className="mx-2">|</span>
                <span>Duration: {currentRoute.duration} days</span>
                <span className="mx-2">|</span>
                <span>Cargo: {currentRoute.cargo.toLocaleString()} MT</span>
              </div>
            )}
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-green-400 rounded-full"></div>
              <span>Loading Ports</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
              <span>Unloading Ports</span>
            </div>
            {!showLiveStatus && (
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                <span>Current Route</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3D Map Container with Ocean Background */}
      <div className="relative h-[600px] bg-gradient-to-b from-blue-400 via-blue-600 to-blue-900">
        <DeckGL
          viewState={viewState}
          onViewStateChange={(info: any) => setViewState(info.viewState)}
          controller={{
            touchRotate: true,
            touchZoom: true,
            dragRotate: true,
            keyboard: true
          }}
          layers={layers}
          style={{width: '100%', height: '100%'}}
          getCursor={({isDragging, isHovering}) => 
            isDragging ? 'grabbing' : isHovering ? 'pointer' : 'grab'
          }
        >
          {/* Ocean Background with Indian coastline approximation */}
          <div 
            style={{
              width: '100%',
              height: '100%',
              background: `
                radial-gradient(ellipse at 30% 40%, rgba(139, 69, 19, 0.8) 0%, transparent 25%),
                radial-gradient(ellipse at 85% 20%, rgba(139, 69, 19, 0.7) 0%, transparent 20%),
                radial-gradient(ellipse at 90% 80%, rgba(139, 69, 19, 0.6) 0%, transparent 15%),
                radial-gradient(ellipse at 15% 85%, rgba(139, 69, 19, 0.7) 0%, transparent 18%),
                linear-gradient(180deg, #3B82F6 0%, #1E40AF 50%, #1E3A8A 100%)
              `,
              position: 'absolute',
              top: 0,
              left: 0,
              zIndex: -1
            }}
          >
            {/* Ocean wave texture overlay */}
            <div 
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(255,255,255,0.03) 8px, rgba(255,255,255,0.03) 16px)',
                opacity: 0.4
              }}
            />
            
            {/* Additional depth effect */}
            <div 
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.1) 70%)',
              }}
            />
          </div>
        </DeckGL>

        {/* Map Controls */}
        <div className="absolute top-4 right-4 space-y-2 z-10">
          <button 
            onClick={() => setViewState({...viewState, pitch: viewState.pitch === 0 ? 60 : 0})}
            className="bg-white/90 hover:bg-white px-3 py-2 rounded-lg shadow text-sm font-medium transition-all"
          >
            {viewState.pitch === 0 ? '3D View' : '2D View'}
          </button>
          <button 
            onClick={() => setViewState({
              longitude: 76.5,
              latitude: 15.8,
              zoom: 5.8,
              pitch: 35,
              bearing: 0,
              maxZoom: 16,
              minZoom: 4
            })}
            className="bg-white/90 hover:bg-white px-3 py-2 rounded-lg shadow text-sm font-medium transition-all block"
          >
            Reset View
          </button>
          <button 
            onClick={() => setViewState({...viewState, bearing: viewState.bearing + 45})}
            className="bg-white/90 hover:bg-white px-3 py-2 rounded-lg shadow text-sm font-medium transition-all block"
          >
            Rotate
          </button>
        </div>

        {/* Route Navigation Controls - Only show in route mode */}
        {!showLiveStatus && optimizationRoutes.length > 0 && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
            <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-4 min-w-96">
              <div className="flex items-center justify-between space-x-4">
                {/* Previous Button */}
                <button
                  onClick={onPrevRoute}
                  disabled={currentRouteIndex <= 0}
                  className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center space-x-2 ${
                    currentRouteIndex <= 0 
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                      : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span>Previous</span>
                </button>

                {/* Route Info */}
                <div className="text-center flex-1">
                  <div className="text-sm text-gray-600 mb-1">
                    Route {(currentRouteIndex + 1)} of {totalRoutes}
                  </div>
                  {currentRoute && (
                    <div className="text-xs text-gray-500">
                      {currentRoute.description}
                    </div>
                  )}
                  
                  {/* Progress Dots */}
                  <div className="flex justify-center space-x-2 mt-2">
                    {optimizationRoutes.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => onGoToRoute && onGoToRoute(index)}
                        className={`w-2 h-2 rounded-full transition-all ${
                          index === currentRouteIndex 
                            ? 'bg-blue-600' 
                            : index < currentRouteIndex
                              ? 'bg-green-400'
                              : 'bg-gray-300'
                        }`}
                        title={`Go to Route ${index + 1}`}
                      />
                    ))}
                  </div>
                </div>

                {/* Next Button */}
                <button
                  onClick={onNextRoute}
                  disabled={currentRouteIndex >= totalRoutes - 1}
                  className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center space-x-2 ${
                    currentRouteIndex >= totalRoutes - 1
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                      : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  }`}
                >
                  <span>Next</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              {/* Route Details */}
              {currentRoute && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="grid grid-cols-3 gap-4 text-xs">
                    <div className="text-center">
                      <div className="font-semibold text-green-600">₹{(currentRoute.cost / 100000).toFixed(0)}L</div>
                      <div className="text-gray-500">Cost</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-blue-600">{currentRoute.duration} days</div>
                      <div className="text-gray-500">Duration</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-purple-600">{currentRoute.cargo.toLocaleString()} MT</div>
                      <div className="text-gray-500">Cargo</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Fleet Info Overlay */}
        <div className="absolute bottom-4 left-4 bg-black/70 text-white p-3 rounded-lg text-sm z-10">
          <div className="font-bold text-green-400">⚓ {showLiveStatus ? 'Live Fleet Status' : 'Route Progress'}</div>
          <div className="space-y-1 mt-2 text-xs">
            {showLiveStatus ? (
              <>
                <div>🚢 {enhancedVessels.filter(v => v.status === 'sailing').length} vessels at sea</div>
                <div>🏭 {enhancedVessels.filter(v => v.status === 'loading').length} loading operations</div>
                <div>🔧 {enhancedVessels.filter(v => v.status === 'maintenance').length} in maintenance</div>
              </>
            ) : (
              <>
                <div>📍 Step {(currentRouteIndex + 1)} of {totalRoutes}</div>
                <div>💰 Total Saved: ₹{((48000000 - 90000000) / 100000 * -1).toFixed(0)}L</div>
                <div>⌨️ Use arrow keys or buttons to navigate</div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Enhanced Fleet Statistics */}
      <div className="px-6 py-4 bg-gray-50 border-t">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-sm">
          <div className="text-center">
            <div className="font-bold text-green-600 text-lg">{enhancedPorts.filter(p => p.type === 'loading').length}</div>
            <div className="text-gray-600">Loading Terminals</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-blue-600 text-lg">{enhancedPorts.filter(p => p.type === 'unloading').length}</div>
            <div className="text-gray-600">Distribution Ports</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-emerald-600 text-lg">{enhancedVessels.filter(v => v.status === 'available').length}</div>
            <div className="text-gray-600">Available Vessels</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-blue-500 text-lg">{enhancedVessels.filter(v => v.status === 'sailing').length}</div>
            <div className="text-gray-600">At Sea</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-yellow-600 text-lg">{enhancedVessels.filter(v => v.status === 'loading').length}</div>
            <div className="text-gray-600">Loading</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-purple-600 text-lg">{enhancedVessels.filter(v => v.status === 'unloading').length}</div>
            <div className="text-gray-600">Unloading</div>
          </div>
        </div>
      </div>

      {/* Add CSS animation */}
      <style jsx>{`
        @keyframes wave {
          0% { transform: translateX(-20px); }
          100% { transform: translateX(20px); }
        }
      `}</style>
    </div>
  );
}
