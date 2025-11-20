'use client';

import React, { useMemo } from 'react';
import DeckGL from '@deck.gl/react';
import { ScatterplotLayer, TextLayer } from '@deck.gl/layers';
import { HPCLVessel, HPCLPort } from './HPCLDashboard';

// Define the map style for maritime visualization
const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

interface MaritimeMapProps {
  vessels: HPCLVessel[];
  ports: HPCLPort[];
  selectedRoutes?: any[];
}

export function MaritimeMap({ vessels, ports, selectedRoutes = [] }: MaritimeMapProps) {
  // Initial view state focused on Indian coastal waters
  const INITIAL_VIEW_STATE = {
    longitude: 78.9629,
    latitude: 15.2993,
    zoom: 5.2,
    pitch: 0,
    bearing: 0
  };

  // Prepare port data for visualization
  const portData = useMemo(() => {
    return ports.map(port => ({
      position: [port.longitude, port.latitude],
      color: port.type === 'loading' ? [34, 197, 94] : [59, 130, 246], // Green for loading, Blue for unloading
      radius: port.type === 'loading' ? 8000 : 6000,
      name: port.name,
      type: port.type,
      state: port.state
    }));
  }, [ports]);

  // Prepare vessel data for visualization
  const vesselData = useMemo(() => {
    return vessels
      .filter(vessel => vessel.current_port)
      .map(vessel => {
        const port = ports.find(p => p.name === vessel.current_port);
        if (!port) return null;
        
        // Color based on status
        let color;
        switch (vessel.status) {
          case 'available':
            color = [34, 197, 94]; // Green
            break;
          case 'sailing':
            color = [59, 130, 246]; // Blue
            break;
          case 'maintenance':
            color = [251, 191, 36]; // Yellow
            break;
          default:
            color = [239, 68, 68]; // Red
        }

        return {
          position: [port.longitude + (Math.random() - 0.5) * 0.1, port.latitude + (Math.random() - 0.5) * 0.1],
          color,
          radius: vessel.capacity_mt * 0.2, // Size based on capacity
          name: vessel.name,
          capacity: vessel.capacity_mt,
          status: vessel.status,
          current_port: vessel.current_port
        };
      })
      .filter(Boolean);
  }, [vessels, ports]);

  // Port label data
  const portLabelData = useMemo(() => {
    return ports.map(port => ({
      position: [port.longitude, port.latitude + 0.15],
      text: port.name,
      color: [60, 60, 60],
      size: 12
    }));
  }, [ports]);

  // Create layers for visualization
  const layers = [
    // Port layer
    new ScatterplotLayer({
      id: 'ports',
      data: portData,
      pickable: true,
      opacity: 0.8,
      stroked: true,
      filled: true,
      radiusScale: 1,
      radiusMinPixels: 6,
      radiusMaxPixels: 20,
      lineWidthMinPixels: 2,
      getPosition: (d: any) => d.position,
      getRadius: (d: any) => d.radius,
      getFillColor: (d: any) => d.color,
      getLineColor: [255, 255, 255],
      onHover: ({object, x, y}: any) => {
        if (object) {
          // Could implement tooltip here
        }
      }
    }),

    // Vessel layer
    new ScatterplotLayer({
      id: 'vessels',
      data: vesselData,
      pickable: true,
      opacity: 0.9,
      stroked: true,
      filled: true,
      radiusScale: 1,
      radiusMinPixels: 4,
      radiusMaxPixels: 15,
      lineWidthMinPixels: 1,
      getPosition: (d: any) => d.position,
      getRadius: (d: any) => Math.max(d.radius, 2000),
      getFillColor: (d: any) => d.color,
      getLineColor: [255, 255, 255],
      onHover: ({object, x, y}: any) => {
        if (object) {
          // Could implement vessel tooltip here
        }
      }
    }),

    // Port labels layer
    new TextLayer({
      id: 'port-labels',
      data: portLabelData,
      pickable: false,
      getPosition: (d: any) => d.position,
      getText: (d: any) => d.text,
      getSize: (d: any) => d.size,
      getColor: (d: any) => d.color,
      getAngle: 0,
      getTextAnchor: 'middle',
      getAlignmentBaseline: 'center',
      fontFamily: 'Arial, sans-serif',
      fontWeight: 'normal'
    })
  ];

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Map Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">
            HPCL Maritime Operations Map
          </h3>
          <div className="flex items-center space-x-4 text-xs">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>Loading Ports / Available Vessels</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span>Unloading Ports / Sailing Vessels</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <span>Maintenance</span>
            </div>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="relative h-96">
        {typeof window !== 'undefined' && (
          <DeckGL
            initialViewState={INITIAL_VIEW_STATE}
            controller={true}
            layers={layers}
            style={{width: '100%', height: '100%'}}
          >
            {/* Using a simple div as map background for demo */}
            <div 
              style={{
                width: '100%',
                height: '100%',
                background: 'linear-gradient(180deg, #E0F2FE 0%, #0369A1 100%)',
                position: 'relative'
              }}
            >
              {/* Indian Ocean overlay */}
              <div 
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  color: '#0369A1',
                  fontSize: '24px',
                  fontWeight: 'bold',
                  opacity: 0.3
                }}
              >
                Indian Ocean
              </div>
            </div>
          </DeckGL>
        )}
        
        {/* Fallback for SSR */}
        {typeof window === 'undefined' && (
          <div className="flex items-center justify-center h-full bg-gradient-to-b from-blue-100 to-blue-300">
            <div className="text-center">
              <div className="text-blue-600 text-lg font-medium">Maritime Map Loading...</div>
              <div className="text-blue-500 text-sm mt-1">
                HPCL Coastal Operations - Indian Ocean
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Map Footer with Statistics */}
      <div className="px-6 py-4 bg-gray-50 rounded-b-lg border-t border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="font-medium text-gray-900">{ports.filter(p => p.type === 'loading').length}</div>
            <div className="text-gray-600">Loading Terminals</div>
          </div>
          <div>
            <div className="font-medium text-gray-900">{ports.filter(p => p.type === 'unloading').length}</div>
            <div className="text-gray-600">Discharge Ports</div>
          </div>
          <div>
            <div className="font-medium text-gray-900">{vessels.filter(v => v.status === 'available').length}</div>
            <div className="text-gray-600">Available Vessels</div>
          </div>
          <div>
            <div className="font-medium text-gray-900">{vessels.filter(v => v.status === 'sailing').length}</div>
            <div className="text-gray-600">Vessels at Sea</div>
          </div>
        </div>
      </div>
    </div>
  );
}
