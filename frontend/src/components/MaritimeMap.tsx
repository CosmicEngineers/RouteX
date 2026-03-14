'use client';

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { HPCLVessel, HPCLPort } from './HPCLDashboard';
import { calculateMaritimeRoute } from '../utils/jps-pathfinding';
import { formatNumber } from '../utils/formatters';
import type { Trip } from './ChallengeOutput';
import { TankerIcon, tankerSvgString } from './TankerIcon';

// Real-world HPCL terminal anchors for Challenge 7.1 ports
// Coordinates sourced from official HPCL location data — mapped to PS abstract IDs L1-L6, U1-U11
// "Sea-dock" offsets applied: admin coords shifted to the nearest harbour/channel water so
// markers sit in the blue area of the map and JPS pathfinding starts/ends at sea.
export const COASTAL_COORD_MAP: Record<string, { lat: number; lng: number; name: string; state: string; locationCode?: string }> = {
  // ── Loading Ports (Refineries / Major Supply Terminals) ──────────────────
  L1: { lat: 18.955, lng: 72.835, name: 'MR-II Terminal, Mumbai',          state: 'Maharashtra',    locationCode: '1554' }, // Mumbai Harbour (Mahul jetty water)
  L2: { lat: 22.990, lng: 70.090, name: 'Kandla Terminal',                  state: 'Gujarat',        locationCode: '1583' }, // Gulf of Kutch anchorage
  L3: { lat: 21.090, lng: 72.635, name: 'Hazira Depot, Surat',              state: 'Gujarat',        locationCode: '1412' }, // Hazira Sea Inlet, Gulf of Khambhat
  L4: { lat: 13.225, lng: 80.340, name: 'Chennai Terminal',                 state: 'Tamil Nadu',     locationCode: '1991' }, // Ennore offshore channel
  L5: { lat: 17.698, lng: 83.295, name: 'Visakh White Oil Terminal',        state: 'Andhra Pradesh', locationCode: '1992' }, // Vizag outer harbour
  L6: { lat: 22.050, lng: 88.170, name: 'Haldia Terminal',                  state: 'West Bengal',    locationCode: '1650' }, // Haldia jetty, Hooghly River
  // ── Unloading Ports (IRDs / Coastal Distribution Hubs) ───────────────────
  U1:  { lat: 19.055, lng: 72.975, name: 'Vashi White Oil Terminal',        state: 'Maharashtra',    locationCode: '1588' }, // Thane Creek channel
  U2:  { lat: 15.405, lng: 73.880, name: 'Vasco Terminal, Goa',             state: 'Goa',            locationCode: '1552' }, // Mormugão harbour entrance
  U3:  { lat: 19.835, lng: 72.730, name: 'Dahanu — North Maharashtra Coast', state: 'Maharashtra' },                          // Dahanu coastal waters
  U4:  { lat: 16.985, lng: 73.250, name: 'Ratnagiri — South Maharashtra Coast', state: 'Maharashtra' },                       // Ratnagiri harbour waters
  U5:  { lat: 17.005, lng: 73.245, name: 'Jaigad — Maharashtra Coast',       state: 'Maharashtra' },                          // Jaigad harbour waters
  U6:  { lat: 14.815, lng: 74.075, name: 'Karwar — North Karnataka Coast',   state: 'Karnataka' },                            // Karwar harbour
  U7:  { lat:  9.958, lng: 76.245, name: 'Irumpanam Terminal, Kochi',        state: 'Kerala',         locationCode: '1845' }, // Kochi/Willingdon Island channel
  U8:  { lat: 22.478, lng: 88.155, name: 'Kolkata-I Terminal',               state: 'West Bengal',    locationCode: '1644' }, // Hooghly River at Budge Budge
  U9:  { lat:  8.780, lng: 78.210, name: 'V.O. Chidambaranar Port, Tuticorin', state: 'Tamil Nadu' },                        // Tuticorin outer harbour
  U10: { lat: 20.265, lng: 86.685, name: 'Paradeep Terminal',                state: 'Odisha',         locationCode: '1630' }, // Paradeep outer harbour
  U11: { lat: 12.915, lng: 74.790, name: 'Mangalore Terminal',               state: 'Karnataka',      locationCode: '1895' }, // Mangalore harbour waters
};

// Official HPCL brand palette
const HP_BLUE = '#004C99'; // Loading ports — HPCL primary blue (supply source)
const HP_RED  = '#ED1C24'; // Unloading ports — HPCL red (demand / destination)

// Google Maps API Key
const GOOGLE_MAPS_API_KEY = 'AIzaSyCPRoWBNwsGeC6TTl0149U1xKPBwq3QsLs';

// Helper function to calculate coastal route between two points using JPS
function calculateCoastalRoute(
  start: { lat: number; lng: number },
  end: { lat: number; lng: number }
): { lat: number; lng: number }[] {
  try {
    // Use JPS maritime pathfinding algorithm with land avoidance
    const jpsRoute = calculateMaritimeRoute(start, end);
    
    // Verify the route doesn't cross land by checking if we got a valid path
    if (jpsRoute && jpsRoute.length > 2) {
      console.log(`JPS route from (${start.lat}, ${start.lng}) to (${end.lat}, ${end.lng}):`, jpsRoute.length, 'waypoints');
      return jpsRoute;
    }
    
    // Fallback if JPS fails - shouldn't happen but good safety measure
    console.warn('JPS returned invalid route, using fallback');
    return [start, end];
  } catch (error) {
    console.error('JPS pathfinding error:', error);
    // Return direct route as fallback
    return [start, end];
  }
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
  /** Real trips from the CP-SAT optimizer — drives route visualization */
  challengeTrips?: Trip[];
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
  selectedRoutes = [],
  challengeTrips = [],
}: MaritimeMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const polylinesRef = useRef<google.maps.Polyline[]>([]);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [time, setTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showBaseline, setShowBaseline] = useState(false);
  const [showVessels, setShowVessels] = useState(false);

  // Load Google Maps script
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Suppress Google Maps error dialogs
    if (typeof window !== 'undefined') {
      (window as any).gm_authFailure = () => {
        console.warn('Google Maps authentication failed - using fallback rendering');
      };
    }
    
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
    script.onerror = () => {
      console.error('Failed to load Google Maps - rendering without map');
      setIsMapLoaded(false);
    };
    document.head.appendChild(script);

    return () => {
      // Cleanup if needed
    };
  }, []);

  // Animation loop for moving vessels
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setTime(t => t + (0.1 * playbackSpeed));
    }, 100);
    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed]);

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

  // Enhanced HPCL Port Data — derived from COASTAL_COORD_MAP (real Indian maritime anchors)
  const enhancedPorts = useMemo(() => {
    return Object.entries(COASTAL_COORD_MAP).map(([id, info]) => ({
      id,
      name: info.name,
      officialName: info.name.split(' — ')[1] ?? info.name,
      locCode: info.locationCode ?? '—',
      type: id.startsWith('L') ? 'loading' : 'unloading',
      latitude: info.lat,
      longitude: info.lng,
      state: info.state,
      capacity: id.startsWith('L') ? 999999 : 50000,
      status: 'active',
    }));
  }, []);

  // Enhanced HPCL Vessel Fleet - Challenge 7.1 Specifications
  // Docked vessels use sea-dock coords from COASTAL_COORD_MAP; sailing vessels animate in open ocean.
  const enhancedVessels = useMemo(() => {
    const c = COASTAL_COORD_MAP;
    return [
      {
        id: 'T1', name: 'Tanker T1 (50K MT)', capacity_mt: 50000, status: 'available',
        current_port: 'Loading Port L1', lat: c.L1.lat, lon: c.L1.lng, heading: 0,
        speed: 0, fuel: 85, crew: 20, route: null, charter_rate: '₹0.63 Cr/day'
      },
      {
        id: 'T2', name: 'Tanker T2 (50K MT)', capacity_mt: 50000, status: 'available',
        current_port: 'Loading Port L2', lat: c.L2.lat, lon: c.L2.lng, heading: 0,
        speed: 0, fuel: 90, crew: 20, route: null, charter_rate: '₹0.49 Cr/day'
      },
      {
        id: 'T3', name: 'Tanker T3 (50K MT)', capacity_mt: 50000, status: 'available',
        current_port: 'Loading Port L3', lat: c.L3.lat, lon: c.L3.lng, heading: 0,
        speed: 0, fuel: 88, crew: 20, route: null, charter_rate: '₹0.51 Cr/day'
      },
      {
        id: 'T4', name: 'Tanker T4 (50K MT)', capacity_mt: 50000, status: 'sailing',
        current_port: 'En Route',
        lat: 14.0 + Math.sin(time * 0.3) * 0.4,   // open Arabian Sea between L1 and U7
        lon: 74.0 + Math.cos(time * 0.4) * 0.5,
        heading: 180 + time * 2,
        speed: 14.0, fuel: 75, crew: 20, route: 'L1 → U7', charter_rate: '₹0.51 Cr/day'
      },
      {
        id: 'T5', name: 'Tanker T5 (50K MT)', capacity_mt: 50000, status: 'available',
        current_port: 'Loading Port L5', lat: c.L5.lat, lon: c.L5.lng, heading: 0,
        speed: 0, fuel: 82, crew: 20, route: null, charter_rate: '₹0.53 Cr/day'
      },
      {
        id: 'T6', name: 'Tanker T6 (50K MT)', capacity_mt: 50000, status: 'loading',
        current_port: 'Loading Port L6', lat: c.L6.lat, lon: c.L6.lng, heading: 0,
        speed: 0, fuel: 78, crew: 20, route: null, charter_rate: '₹0.57 Cr/day'
      },
      {
        id: 'T7', name: 'Tanker T7 (50K MT)', capacity_mt: 50000, status: 'available',
        current_port: 'Loading Port L4', lat: c.L4.lat, lon: c.L4.lng, heading: 0,
        speed: 0, fuel: 70, crew: 20, route: null, charter_rate: '₹0.65 Cr/day'
      },
      {
        id: 'T8', name: 'Tanker T8 (25K MT)', capacity_mt: 25000, status: 'sailing',
        current_port: 'En Route',
        lat: 19.2 + Math.sin(time * 0.5) * 0.3,   // open Arabian Sea between L2 and U2
        lon: 72.0 + Math.cos(time * 0.6) * 0.4,
        heading: 90 + time * 1.5,
        speed: 13.0, fuel: 65, crew: 18, route: 'L2 → U2', charter_rate: '₹0.39 Cr/day'
      },
      {
        id: 'T9', name: 'Tanker T9 (25K MT)', capacity_mt: 25000, status: 'unloading',
        current_port: 'Unloading Port U7', lat: c.U7.lat, lon: c.U7.lng, heading: 0,
        speed: 0, fuel: 60, crew: 18, route: null, charter_rate: '₹0.38 Cr/day'
      }
    ];
  }, [time]);

  // Current route data for visualization
  const currentRoute = currentRouteIndex >= 0 && currentRouteIndex < optimizationRoutes.length
    ? optimizationRoutes[currentRouteIndex]
    : null;

  // Fleet stats — real numbers from CP-SAT output when available, static network summary otherwise
  const fleetStats = useMemo(() => {
    if (challengeTrips.length > 0) {
      const uniqueVessels = new Set(challengeTrips.map(t => t.vessel_id));
      const uniqueDischarge = new Set(challengeTrips.flatMap(t => t.discharge_ports));
      const totalCargo = challengeTrips.reduce(
        (sum, t) => sum + t.cargo_deliveries.reduce((s, d) => s + d.volume_mt, 0), 0
      );
      const totalCost = challengeTrips.reduce((sum, t) => sum + t.hpcl_charter_cost_cr, 0);
      const coLoads = challengeTrips.filter(t => t.discharge_ports.length >= 2).length;
      return {
        mode: 'optimizer' as const,
        items: [
          { label: 'Trips Scheduled', value: String(challengeTrips.length),       accent: '#facc15' },
          { label: 'Total Cost',       value: `₹${totalCost.toFixed(2)} Cr`,      accent: '#4ade80' },
          { label: 'Cargo Delivered',  value: `${(totalCargo / 1000).toFixed(0)}K MT`, accent: '#22d3ee' },
          { label: 'Vessels Active',   value: String(uniqueVessels.size),          accent: '#60a5fa' },
          { label: 'Ports Served',     value: String(uniqueDischarge.size),        accent: HP_RED    },
          { label: 'Co-loads',         value: String(coLoads),                     accent: '#a78bfa' },
        ],
      };
    }
    return {
      mode: 'idle' as const,
      items: [
        { label: 'Loading Terminals',  value: String(enhancedPorts.filter(p => p.type === 'loading').length),   accent: '#60a5fa' },
        { label: 'Unloading Ports',    value: String(enhancedPorts.filter(p => p.type === 'unloading').length), accent: HP_RED    },
        { label: 'Fleet Size',         value: String(enhancedVessels.length),                                    accent: '#22d3ee' },
        { label: '50K MT Tankers',     value: String(enhancedVessels.filter(v => v.capacity_mt === 50000).length), accent: '#60a5fa' },
        { label: '25K MT Tankers',     value: String(enhancedVessels.filter(v => v.capacity_mt === 25000).length), accent: '#818cf8' },
        { label: 'Total Demand',       value: '440K MT',                                                          accent: '#4ade80' },
      ],
    };
  }, [challengeTrips, enhancedPorts, enhancedVessels]);

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
      mapTypeId: 'terrain', // Terrain with dark styling
      styles: [
        // Dark water - Deep maritime blue
        {
          featureType: 'water',
          elementType: 'geometry',
          stylers: [{ color: '#001529' }] // Maritime navy
        },
        {
          featureType: 'water',
          elementType: 'labels.text.fill',
          stylers: [{ color: '#22d3ee' }] // Cyan text
        },
        {
          featureType: 'water',
          elementType: 'labels.text.stroke',
          stylers: [{ color: '#001529' }]
        },
        // Dark land for maritime focus
        {
          featureType: 'landscape',
          elementType: 'geometry',
          stylers: [{ color: '#1a2332' }]
        },
        {
          featureType: 'landscape',
          stylers: [{ lightness: -30 }]
        },
        // Hide roads - not relevant for maritime
        {
          featureType: 'road',
          stylers: [{ visibility: 'off' }]
        },
        // Hide transit
        {
          featureType: 'transit',
          stylers: [{ visibility: 'off' }]
        },
        // Hide POI
        {
          featureType: 'poi',
          stylers: [{ visibility: 'off' }]
        },
        // Subtle borders
        {
          featureType: 'administrative',
          elementType: 'geometry.stroke',
          stylers: [{ color: '#1890ff' }, { weight: 0.8 }]
        },
        {
          featureType: 'administrative',
          elementType: 'labels.text.fill',
          stylers: [{ color: '#94a3b8' }]
        },
        // Dark everything else
        {
          elementType: 'labels.text.fill',
          stylers: [{ color: '#94a3b8' }]
        },
        {
          elementType: 'labels.text.stroke',
          stylers: [{ color: '#0f172a' }]
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

    // Add port markers — differentiated SVG icons per port type
    enhancedPorts.forEach(port => {
      const isLoading = port.type === 'loading';
      const isInRoute = currentRoute && !showLiveStatus &&
        currentRoute.route.some((step: any) => step.port === port.name);

      // Loading ports: HP Blue hexagonal marker with glow halo (supply source)
      // Unloading ports: HP Red teardrop pin with glow halo (demand / destination)
      const markerSvg = isLoading
        ? `<svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
            <!-- Outer glow ring -->
            <circle cx="24" cy="24" r="23" fill="${HP_BLUE}" fill-opacity="0.18"/>
            <!-- Mid halo -->
            <circle cx="24" cy="24" r="18" fill="${HP_BLUE}" fill-opacity="0.28"/>
            <!-- Main body -->
            <circle cx="24" cy="24" r="13" fill="${HP_BLUE}" stroke="#ffffff" stroke-width="2.5"/>
            <text x="24" y="29" fill="#ffffff" font-size="8.5" font-weight="700"
                  font-family="Arial,sans-serif" text-anchor="middle">${port.id}</text>
          </svg>`
        : `<svg width="36" height="44" viewBox="0 0 36 44" xmlns="http://www.w3.org/2000/svg">
            <!-- Glow shadow for red pin -->
            <ellipse cx="18" cy="42" rx="9" ry="3" fill="${HP_RED}" fill-opacity="0.25"/>
            <!-- Teardrop body -->
            <path d="M18 2C10.3 2 4 8.3 4 16c0 10.2 14 26 14 26s14-15.8 14-26C32 8.3 25.7 2 18 2z"
                  fill="${isInRoute ? '#FCD34D' : HP_RED}" stroke="#ffffff" stroke-width="2"/>
            <!-- Inner circle accent -->
            <circle cx="18" cy="16" r="5" fill="#ffffff" fill-opacity="0.25"/>
            <text x="18" y="20" fill="#ffffff" font-size="${port.id.length > 3 ? '6.5' : '7.5'}" font-weight="700"
                  font-family="Arial,sans-serif" text-anchor="middle">${port.id}</text>
          </svg>`;

      const marker = new google.maps.Marker({
        position: { lat: port.latitude, lng: port.longitude },
        map: map,
        title: port.name,
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(markerSvg),
          scaledSize: isLoading
            ? new google.maps.Size(48, 48)
            : new google.maps.Size(36, 44),
          anchor: isLoading
            ? new google.maps.Point(24, 24)
            : new google.maps.Point(18, 42),
        },
        zIndex: isLoading ? 20 : 10,
      });

      // Industrial tooltip with official HPCL details
      const coordInfo = COASTAL_COORD_MAP[port.id];
      const locCodeRow = coordInfo?.locationCode
        ? `<p style="margin:3px 0;font-size:11px;">
             <span style="color:#64748b;">Location Code:</span>
             <span style="color:#fbbf24;font-weight:700;margin-left:5px;">Loc ${coordInfo.locationCode}</span>
           </p>`
        : '';
      const demandRow = isLoading
        ? `<span style="color:#10b981;font-weight:600;">Unlimited Supply</span>`
        : `<span style="color:#22d3ee;font-weight:600;">${formatNumber(port.capacity)} MT&thinsp;/&thinsp;month</span>`;

      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="font-family:Arial,sans-serif;padding:10px 12px;min-width:230px;
                      background:#0f172a;border-radius:8px;border:1px solid #1e293b;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
              <span style="background:${isLoading ? HP_BLUE : HP_RED};
                           color:#ffffff;
                           font-weight:700;font-size:11px;padding:2px 8px;border-radius:4px;">
                ${port.id}
              </span>
              <span style="color:#f1f5f9;font-weight:700;font-size:13px;">${port.officialName}</span>
            </div>
            ${locCodeRow}
            <p style="margin:3px 0;font-size:11px;">
              <span style="color:#64748b;">Type:</span>
              <span style="color:${isLoading ? '#60a5fa' : HP_RED};margin-left:5px;">
                ${isLoading ? '⛽ Loading Port (Supply Source)' : '🏭 IRD / Distribution Terminal'}
              </span>
            </p>
            <p style="margin:3px 0;font-size:11px;">
              <span style="color:#64748b;">State:</span>
              <span style="color:#e2e8f0;margin-left:5px;">${port.state}</span>
            </p>
            <p style="margin:3px 0;font-size:11px;">
              <span style="color:#64748b;">${isLoading ? 'Supply:' : 'Monthly Demand:'}</span>
              <span style="margin-left:5px;">${demandRow}</span>
            </p>
          </div>
        `,
      });

      marker.addListener('click', () => infoWindow.open(map, marker));
      markersRef.current.push(marker);
    });

    // Add vessel markers (only when layer is enabled)
    if (showVessels) {
    const visibleVessels = showLiveStatus ? enhancedVessels :
      (currentRoute ? enhancedVessels.filter(v => v.id === currentRoute.vessel) : enhancedVessels);

    visibleVessels.forEach(vessel => {
      const statusColor = {
        available: '#10b981',
        sailing: '#3b82f6',
        loading: '#f59e0b',
        unloading: '#a855f7',
        maintenance: '#ef4444'
      }[vessel.status] || '#6b7280';

      const marker = new google.maps.Marker({
        position: { lat: vessel.lat, lng: vessel.lon },
        map: map,
        title: vessel.name,
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(tankerSvgString(statusColor, vessel.id)),
          scaledSize: new google.maps.Size(22, 22),
          anchor: new google.maps.Point(11, 11)
        }
      });

      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="padding: 8px; min-width: 200px;">
            <h3 style="margin: 0 0 8px 0; font-weight: bold; color: #1e40af;">
              ${vessel.name}
            </h3>
            <p style="margin: 4px 0; font-size: 13px;"><strong>Status:</strong> <span style="color: ${statusColor}; text-transform: capitalize;">${vessel.status}</span></p>
            <p style="margin: 4px 0; font-size: 13px;"><strong>Capacity:</strong> ${formatNumber(vessel.capacity_mt)} MT</p>
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
    } // end showVessels

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

    // Draw challenge trip routes from real optimizer output + auto-zoom to fit all routes
    if (challengeTrips.length > 0) {
      const TRIP_COLORS = ['#22d3ee', '#34d399', '#a78bfa', '#fb923c', '#f472b6', '#60a5fa', '#facc15', '#4ade80', '#f87171'];
      const bounds = new google.maps.LatLngBounds();
      let boundsHasPoints = false;

      challengeTrips.forEach((trip, tripIdx) => {
        const loadCoord = COASTAL_COORD_MAP[trip.loading_port];
        if (!loadCoord) return;
        const color = TRIP_COLORS[tripIdx % TRIP_COLORS.length];

        bounds.extend({ lat: loadCoord.lat, lng: loadCoord.lng });
        boundsHasPoints = true;

        trip.discharge_ports.forEach((dischPort) => {
          const dischCoord = COASTAL_COORD_MAP[dischPort];
          if (!dischCoord) return;

          bounds.extend({ lat: dischCoord.lat, lng: dischCoord.lng });
          boundsHasPoints = true;

          const waypoints = calculateCoastalRoute(
            { lat: loadCoord.lat, lng: loadCoord.lng },
            { lat: dischCoord.lat, lng: dischCoord.lng }
          );

          const polyline = new google.maps.Polyline({
            path: waypoints,
            geodesic: true,
            strokeColor: color,
            strokeOpacity: 0.7,
            strokeWeight: 3,
            icons: [{
              icon: {
                path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                scale: 2.5,
                strokeColor: color,
              },
              offset: '100%',
              repeat: '120px',
            }],
          });

          polyline.setMap(map);
          polylinesRef.current.push(polyline);
        });
      });

      // Auto-zoom to fit all active route endpoints with generous padding
      if (boundsHasPoints) {
        map.fitBounds(bounds, { top: 60, right: 60, bottom: 60, left: 60 });
      }
    }

  }, [enhancedPorts, currentRoute, showLiveStatus, isMapLoaded, currentRouteIndex, challengeTrips, showVessels]);

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
      <div className="px-6 py-4 bg-linear-to-r from-blue-900 to-blue-700 text-white">
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
                <span>Cargo: {formatNumber(currentRoute.cargo)} MT</span>
              </div>
            )}
            <div className="flex items-center space-x-1 text-white">
              <div className="w-3 h-3 rounded-full" style={{background: '#60a5fa'}}></div>
              <span>Loading Ports</span>
            </div>
            <div className="flex items-center space-x-1 text-white">
              <div className="w-3 h-3 rounded-full" style={{background: HP_RED}}></div>
              <span>Unloading Ports</span>
            </div>
            <div
              className="flex items-center gap-2 cursor-pointer select-none"
              onClick={() => setShowVessels(v => !v)}
              title="Toggle tanker visibility"
            >
              <span className="text-white/80 text-xs font-medium flex items-center gap-1.5">
                <TankerIcon size={11} color="#facc15" />
                Vessels
              </span>
              <div className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${showVessels ? 'bg-cyan-400' : 'bg-white/20'}`}>
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-200 ${showVessels ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Google Maps View */}
      <div className="relative h-[calc(100vh-200px)] min-h-[600px] bg-gray-100">
        {/* Playback Controls */}
        {!showLiveStatus && (
          <div className="absolute top-4 left-4 z-10 flex items-center space-x-3">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-3 bg-slate-900/90 backdrop-blur-sm border border-slate-700/50 rounded-lg text-white hover:bg-slate-800/90 transition-all shadow-lg"
              title={isPlaying ? 'Pause animation' : 'Play animation'}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? '⏸' : '▶'}
            </button>
            
            <div className="flex items-center space-x-2 bg-slate-900/90 backdrop-blur-sm border border-slate-700/50 rounded-lg px-4 py-2">
              <span className="text-white text-sm">Speed:</span>
              <select
                value={playbackSpeed}
                onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                className="bg-slate-800 text-white text-sm rounded px-2 py-1 border border-slate-600"
                aria-label="Playback speed"
              >
                <option value="0.5">0.5x</option>
                <option value="1">1x</option>
                <option value="2">2x</option>
                <option value="5">5x</option>
              </select>
            </div>

            <button
              onClick={() => setShowBaseline(!showBaseline)}
              className={`px-4 py-2 backdrop-blur-sm border rounded-lg font-medium transition-all shadow-lg ${
                showBaseline
                  ? 'bg-purple-500/90 border-purple-400/50 text-white'
                  : 'bg-slate-900/90 border-slate-700/50 text-slate-300 hover:bg-slate-800/90'
              }`}
              title="Toggle baseline routes"
            >
              {showBaseline ? 'Hide' : 'Show'} Baseline
            </button>
          </div>
        )}
        
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
                  ? 'bg-slate-700 text-slate-400 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white hover:shadow-lg hover:shadow-cyan-500/50'
              }`}
            >
              ← Previous
            </button>
            
            <div className="text-center">
              <div className="text-sm font-semibold text-slate-100">
                Route {(currentRouteIndex + 1)} of {totalRoutes}
              </div>
              {currentRoute && (
                <div className="text-xs text-slate-400 mt-1">
                  {currentRoute.description}
                </div>
              )}
            </div>
            
            <button
              onClick={onNextRoute}
              disabled={currentRouteIndex >= totalRoutes - 1}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                currentRouteIndex >= totalRoutes - 1
                  ? 'bg-slate-700 text-slate-400 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white hover:shadow-lg hover:shadow-cyan-500/50'
              }`}
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Fleet Statistics */}
      <div className="px-5 py-3 bg-slate-900/80 border-t border-slate-700/60 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          {/* Mode badge */}
          <div className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase ${
            fleetStats.mode === 'optimizer'
              ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
              : 'bg-slate-700/50 text-slate-400 border border-slate-600/40'
          }`}>
            <div className={`w-1.5 h-1.5 rounded-full ${fleetStats.mode === 'optimizer' ? 'bg-cyan-400 animate-pulse' : 'bg-slate-500'}`} />
            {fleetStats.mode === 'optimizer' ? 'Optimizer' : 'Fleet'}
          </div>

          {/* Divider */}
          <div className="w-px h-8 bg-slate-700/60 shrink-0" />

          {/* Stat cells */}
          <div className="flex-1 grid grid-cols-3 md:grid-cols-6 gap-0 divide-x divide-slate-700/50">
            {fleetStats.items.map((stat, i) => (
              <div key={i} className="px-3 flex flex-col items-center justify-center min-w-0">
                <span
                  className="text-base font-extrabold leading-tight tabular-nums truncate"
                  style={{ color: stat.accent }}
                >
                  {stat.value}
                </span>
                <span className="text-[10px] text-slate-300 mt-0.5 leading-tight text-center">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

