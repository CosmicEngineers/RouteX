'use client';

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { HPCLVessel, HPCLPort } from './HPCLDashboard';

// Google Maps API Key
const GOOGLE_MAPS_API_KEY = 'AIzaSyCPRoWBNwsGeC6TTl0149U1xKPBwq3QsLs';

// Helper function to calculate coastal route between two points
function calculateCoastalRoute(
  start: { lat: number; lng: number },
  end: { lat: number; lng: number }
): { lat: number; lng: number }[] {
  const waypoints = [start];
  
  // Determine if route is going north-south or needs to curve around peninsula
  const latDiff = end.lat - start.lat;
  const lngDiff = end.lng - start.lng;
  
  // If going along west coast (Mumbai to Kochi area)
  if (start.lat > 15 && end.lat < 12 && start.lng < 75) {
    // Add waypoint to curve around Goa/Karnataka coast
    waypoints.push({ lat: (start.lat + end.lat) / 2, lng: Math.min(start.lng, end.lng) - 1 });
  }
  // If going from west coast to east coast (around peninsula)
  else if (Math.abs(lngDiff) > 8) {
    // Add waypoint at southern tip (near Kanyakumari)
    waypoints.push({ lat: 8.0, lng: 77.5 });
  }
  // If going along east coast
  else if (start.lng > 78 && end.lng > 78) {
    // Add waypoint to follow coastline
    waypoints.push({ lat: (start.lat + end.lat) / 2, lng: Math.max(start.lng, end.lng) + 0.5 });
  }
  // For shorter routes, add intermediate point offshore
  else {
    const midLat = (start.lat + end.lat) / 2;
    const midLng = (start.lng + end.lng) / 2;
    // Offset slightly into the ocean
    const offsetLng = midLng + (latDiff > 0 ? -0.5 : 0.5);
    waypoints.push({ lat: midLat, lng: offsetLng });
  }
  
  waypoints.push(end);
  return waypoints;
}

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
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const polylinesRef = useRef<google.maps.Polyline[]>([]);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [time, setTime] = useState(0);

  // Load Google Maps script
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Check if Google Maps is already loaded
    if (window.google && window.google.maps) {
      setIsMapLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}`;
    script.async = true;
    script.defer = true;
    script.onload = () => setIsMapLoaded(true);
    script.onerror = () => console.error('Failed to load Google Maps');
    document.head.appendChild(script);

    return () => {
      // Cleanup if needed
    };
  }, []);

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

  // Enhanced HPCL Port Data - Challenge 7.1 Specifications
  const enhancedPorts = useMemo(() => {
    const hpclPortData = [
      // Loading Ports (L1-L6)
      { id: 'L1', name: 'Loading Port L1', type: 'loading', latitude: 19.0, longitude: 72.8, state: 'Maharashtra', capacity: 999999, status: 'active' },
      { id: 'L2', name: 'Loading Port L2', type: 'loading', latitude: 21.0, longitude: 72.0, state: 'Gujarat', capacity: 999999, status: 'active' },
      { id: 'L3', name: 'Loading Port L3', type: 'loading', latitude: 20.5, longitude: 71.5, state: 'Gujarat', capacity: 999999, status: 'active' },
      { id: 'L4', name: 'Loading Port L4', type: 'loading', latitude: 13.1, longitude: 80.3, state: 'Tamil Nadu', capacity: 999999, status: 'active' },
      { id: 'L5', name: 'Loading Port L5', type: 'loading', latitude: 17.7, longitude: 83.3, state: 'Andhra Pradesh', capacity: 999999, status: 'active' },
      { id: 'L6', name: 'Loading Port L6', type: 'loading', latitude: 22.5, longitude: 88.3, state: 'West Bengal', capacity: 999999, status: 'active' },
      
      // Unloading Ports (U1-U11) with Demands
      { id: 'U1', name: 'Unloading Port U1 (40K MT)', type: 'unloading', latitude: 18.5, longitude: 73.0, state: 'Maharashtra', capacity: 40000, status: 'active' },
      { id: 'U2', name: 'Unloading Port U2 (135K MT)', type: 'unloading', latitude: 15.5, longitude: 73.8, state: 'Goa', capacity: 135000, status: 'active' },
      { id: 'U3', name: 'Unloading Port U3 (5K MT)', type: 'unloading', latitude: 19.5, longitude: 72.5, state: 'Maharashtra', capacity: 5000, status: 'active' },
      { id: 'U4', name: 'Unloading Port U4 (20K MT)', type: 'unloading', latitude: 18.0, longitude: 73.5, state: 'Maharashtra', capacity: 20000, status: 'active' },
      { id: 'U5', name: 'Unloading Port U5 (20K MT)', type: 'unloading', latitude: 17.5, longitude: 73.0, state: 'Maharashtra', capacity: 20000, status: 'active' },
      { id: 'U6', name: 'Unloading Port U6 (20K MT)', type: 'unloading', latitude: 16.0, longitude: 74.0, state: 'Karnataka', capacity: 20000, status: 'active' },
      { id: 'U7', name: 'Unloading Port U7 (110K MT)', type: 'unloading', latitude: 10.0, longitude: 76.3, state: 'Kerala', capacity: 110000, status: 'active' },
      { id: 'U8', name: 'Unloading Port U8 (30K MT)', type: 'unloading', latitude: 19.0, longitude: 72.5, state: 'Maharashtra', capacity: 30000, status: 'active' },
      { id: 'U9', name: 'Unloading Port U9 (20K MT)', type: 'unloading', latitude: 18.2, longitude: 73.2, state: 'Maharashtra', capacity: 20000, status: 'active' },
      { id: 'U10', name: 'Unloading Port U10 (20K MT)', type: 'unloading', latitude: 18.8, longitude: 72.9, state: 'Maharashtra', capacity: 20000, status: 'active' },
      { id: 'U11', name: 'Unloading Port U11 (20K MT)', type: 'unloading', latitude: 15.0, longitude: 74.5, state: 'Karnataka', capacity: 20000, status: 'active' }
    ];
    return hpclPortData;
  }, []);

  // Enhanced HPCL Vessel Fleet - Challenge 7.1 Specifications
  const enhancedVessels = useMemo(() => {
    return [
      { 
        id: 'T1', name: 'Tanker T1 (50K MT)', capacity_mt: 50000, status: 'available', 
        current_port: 'Loading Port L1', lat: 19.0, lon: 72.8, heading: 0,
        speed: 0, fuel: 85, crew: 20, route: null, charter_rate: '₹0.63 Cr/day'
      },
      { 
        id: 'T2', name: 'Tanker T2 (50K MT)', capacity_mt: 50000, status: 'available', 
        current_port: 'Loading Port L2', lat: 21.0, lon: 72.0, heading: 0,
        speed: 0, fuel: 90, crew: 20, route: null, charter_rate: '₹0.49 Cr/day'
      },
      { 
        id: 'T3', name: 'Tanker T3 (50K MT)', capacity_mt: 50000, status: 'available', 
        current_port: 'Loading Port L3', lat: 20.5, lon: 71.5, heading: 0,
        speed: 0, fuel: 88, crew: 20, route: null, charter_rate: '₹0.51 Cr/day'
      },
      { 
        id: 'T4', name: 'Tanker T4 (50K MT)', capacity_mt: 50000, status: 'sailing', 
        current_port: 'En Route', 
        lat: 16.0 + Math.sin(time * 0.3) * 0.1, 
        lon: 75.0 + Math.cos(time * 0.4) * 0.15, 
        heading: 180 + time * 2,
        speed: 14.0, fuel: 75, crew: 20, route: 'L1 → U7', charter_rate: '₹0.51 Cr/day'
      },
      { 
        id: 'T5', name: 'Tanker T5 (50K MT)', capacity_mt: 50000, status: 'available', 
        current_port: 'Loading Port L5', lat: 17.7, lon: 83.3, heading: 0,
        speed: 0, fuel: 82, crew: 20, route: null, charter_rate: '₹0.53 Cr/day'
      },
      { 
        id: 'T6', name: 'Tanker T6 (50K MT)', capacity_mt: 50000, status: 'loading', 
        current_port: 'Loading Port L6', lat: 22.5, lon: 88.3, heading: 0,
        speed: 0, fuel: 78, crew: 20, route: null, charter_rate: '₹0.57 Cr/day'
      },
      { 
        id: 'T7', name: 'Tanker T7 (50K MT)', capacity_mt: 50000, status: 'available', 
        current_port: 'Loading Port L4', lat: 13.1, lon: 80.3, heading: 0,
        speed: 0, fuel: 70, crew: 20, route: null, charter_rate: '₹0.65 Cr/day'
      },
      { 
        id: 'T8', name: 'Tanker T8 (25K MT)', capacity_mt: 25000, status: 'sailing', 
        current_port: 'En Route', 
        lat: 18.5 + Math.sin(time * 0.5) * 0.08, 
        lon: 73.5 + Math.cos(time * 0.6) * 0.12, 
        heading: 90 + time * 1.5,
        speed: 13.0, fuel: 65, crew: 18, route: 'L2 → U2', charter_rate: '₹0.39 Cr/day'
      },
      { 
        id: 'T9', name: 'Tanker T9 (25K MT)', capacity_mt: 25000, status: 'unloading', 
        current_port: 'Unloading Port U7', lat: 10.0, lon: 76.3, heading: 0,
        speed: 0, fuel: 60, crew: 18, route: null, charter_rate: '₹0.38 Cr/day'
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

  // Initialize Google Map
  useEffect(() => {
    if (!isMapLoaded || !mapRef.current || googleMapRef.current) return;

    const map = new google.maps.Map(mapRef.current, {
      center: { lat: 15.8, lng: 76.5 },
      zoom: 6,
      mapTypeId: 'terrain',
      styles: [
        {
          featureType: 'water',
          elementType: 'geometry',
          stylers: [{ color: '#a1cce6' }]
        }
      ]
    });

    googleMapRef.current = map;
  }, [isMapLoaded]);

  // Update markers and routes
  useEffect(() => {
    if (!googleMapRef.current || !isMapLoaded) return;

    // Clear existing markers and polylines
    markersRef.current.forEach(marker => marker.setMap(null));
    polylinesRef.current.forEach(polyline => polyline.setMap(null));
    markersRef.current = [];
    polylinesRef.current = [];

    const map = googleMapRef.current;

    // Add port markers
    enhancedPorts.forEach(port => {
      const isInRoute = currentRoute && !showLiveStatus && 
        currentRoute.route.some((step: any) => step.port === port.name);
      
      const marker = new google.maps.Marker({
        position: { lat: port.latitude, lng: port.longitude },
        map: map,
        title: port.name,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: isInRoute ? 10 : 7,
          fillColor: isInRoute ? '#FCD34D' : (port.type === 'loading' ? '#4ADE80' : '#60A5FA'),
          fillOpacity: 1,
          strokeColor: '#FFFFFF',
          strokeWeight: 2
        }
      });

      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="padding: 8px;">
            <h3 style="margin: 0 0 8px 0; font-weight: bold; color: #1e40af;">
              ${port.name.replace(' (HPCL)', '').replace(' Terminal', '')}
            </h3>
            <p style="margin: 4px 0; font-size: 13px;"><strong>Type:</strong> ${port.type === 'loading' ? 'Loading Port' : 'Unloading Port'}</p>
            <p style="margin: 4px 0; font-size: 13px;"><strong>State:</strong> ${port.state}</p>
            <p style="margin: 4px 0; font-size: 13px;"><strong>Capacity:</strong> ${port.capacity.toLocaleString()} MT</p>
            <p style="margin: 4px 0; font-size: 13px;"><strong>Status:</strong> <span style="color: #059669;">${port.status}</span></p>
          </div>
        `
      });

      marker.addListener('click', () => {
        infoWindow.open(map, marker);
      });

      markersRef.current.push(marker);
    });

    // Add vessel markers
    const visibleVessels = showLiveStatus ? enhancedVessels : 
      (currentRoute ? enhancedVessels.filter(v => v.id === currentRoute.vessel) : enhancedVessels);

    visibleVessels.forEach(vessel => {
      const marker = new google.maps.Marker({
        position: { lat: vessel.lat, lng: vessel.lon },
        map: map,
        title: vessel.name,
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
              <text x="16" y="24" font-size="24" text-anchor="middle">🚢</text>
            </svg>
          `),
          scaledSize: new google.maps.Size(32, 32),
          anchor: new google.maps.Point(16, 16)
        }
      });

      const statusColor = {
        available: '#10b981',
        sailing: '#3b82f6',
        loading: '#f59e0b',
        unloading: '#a855f7',
        maintenance: '#ef4444'
      }[vessel.status] || '#6b7280';

      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="padding: 8px; min-width: 200px;">
            <h3 style="margin: 0 0 8px 0; font-weight: bold; color: #1e40af;">
              ${vessel.name}
            </h3>
            <p style="margin: 4px 0; font-size: 13px;"><strong>Status:</strong> <span style="color: ${statusColor}; text-transform: capitalize;">${vessel.status}</span></p>
            <p style="margin: 4px 0; font-size: 13px;"><strong>Capacity:</strong> ${vessel.capacity_mt.toLocaleString()} MT</p>
            ${vessel.charter_rate ? `<p style="margin: 4px 0; font-size: 13px;"><strong>Charter Rate:</strong> ${vessel.charter_rate}</p>` : ''}
            <p style="margin: 4px 0; font-size: 13px;"><strong>Speed:</strong> ${vessel.speed} knots</p>
            <p style="margin: 4px 0; font-size: 13px;"><strong>Fuel:</strong> ${vessel.fuel}%</p>
            <p style="margin: 4px 0; font-size: 13px;"><strong>Crew:</strong> ${vessel.crew}</p>
            ${vessel.route ? `<p style="margin: 4px 0; font-size: 13px;"><strong>Route:</strong> ${vessel.route}</p>` : ''}
          </div>
        `
      });

      marker.addListener('click', () => {
        infoWindow.open(map, marker);
      });

      markersRef.current.push(marker);
    });

    // Draw route polylines with coastal routing
    if (currentRoute && !showLiveStatus) {
      // Create route segments with coastal waypoints
      for (let i = 0; i < currentRoute.route.length - 1; i++) {
        const start = currentRoute.route[i];
        const end = currentRoute.route[i + 1];
        
        // Calculate intermediate coastal waypoints to avoid land
        const waypoints = calculateCoastalRoute(
          { lat: start.lat, lng: start.lon },
          { lat: end.lat, lng: end.lon }
        );

        const polyline = new google.maps.Polyline({
          path: waypoints,
          geodesic: true,
          strokeColor: '#FCD34D',
          strokeOpacity: 0.8,
          strokeWeight: 4,
          icons: [{
            icon: {
              path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
              scale: 3,
              strokeColor: '#FCD34D'
            },
            offset: '100%',
            repeat: '150px'
          }]
        });

        polyline.setMap(map);
        polylinesRef.current.push(polyline);
      }
    }

  }, [enhancedPorts, currentRoute, showLiveStatus, isMapLoaded, currentRouteIndex]);

  // Separate effect to update vessel positions without recreating markers
  useEffect(() => {
    if (!googleMapRef.current || !isMapLoaded || markersRef.current.length === 0) return;
    
    // Only update existing vessel marker positions, don't recreate them
    const portCount = enhancedPorts.length;
    enhancedVessels.forEach((vessel, index) => {
      const markerIndex = portCount + index;
      if (markersRef.current[markerIndex]) {
        markersRef.current[markerIndex].setPosition({ lat: vessel.lat, lng: vessel.lon });
      }
    });
  }, [enhancedVessels, enhancedPorts.length, isMapLoaded]);

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Enhanced Map Header */}
      <div className="px-6 py-4 bg-gradient-to-r from-blue-900 to-blue-700 text-white">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold">
              {showLiveStatus ? 'HPCL Live Fleet Status' : 'HPCL Route Visualization'}
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
          </div>
        </div>
      </div>

      {/* Google Maps View */}
      <div className="relative h-[600px] bg-gray-100">
        {!isMapLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-blue-50">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading Google Maps...</p>
            </div>
          </div>
        )}
        <div ref={mapRef} className="w-full h-full"></div>
      </div>

      {/* Route Navigation Controls - Only show in route mode */}
      {!showLiveStatus && optimizationRoutes.length > 0 && (
        <div className="px-6 py-4 bg-gray-50 border-t">
          <div className="flex items-center justify-between">
            <button
              onClick={onPrevRoute}
              disabled={currentRouteIndex <= 0}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                currentRouteIndex <= 0 
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              ← Previous
            </button>
            
            <div className="text-center">
              <div className="text-sm font-semibold">
                Route {(currentRouteIndex + 1)} of {totalRoutes}
              </div>
              {currentRoute && (
                <div className="text-xs text-gray-500 mt-1">
                  {currentRoute.description}
                </div>
              )}
            </div>
            
            <button
              onClick={onNextRoute}
              disabled={currentRouteIndex >= totalRoutes - 1}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                currentRouteIndex >= totalRoutes - 1
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Fleet Statistics */}
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
    </div>
  );
}

