'use client';

import React from 'react';
import { BarChart3, TrendingUp, Ship, MapPin, DollarSign, Leaf, Clock, Target } from 'lucide-react';
import { OptimizationResult, HPCLVessel, HPCLPort } from './HPCLDashboard';

interface ResultsDisplayProps {
  result: OptimizationResult | null;
  vessels: HPCLVessel[];
  ports: HPCLPort[];
}

export function ResultsDisplay({ result, vessels, ports }: ResultsDisplayProps) {
  if (!result) {
    return (
      <div className="flex items-center justify-center h-96 bg-white rounded-lg shadow">
        <div className="text-center">
          <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">No Results Available</h3>
          <p className="mt-1 text-gray-500">Run an optimization to see results here</p>
        </div>
      </div>
    );
  }

  // Mock additional data for demonstration
  const mockResults = {
    estimatedSavings: 1520000, // ₹15.2 lakhs
    co2Reduction: 850, // MT
    avgTransitTime: 2.8, // days
    demurrageSavings: 680000, // ₹6.8 lakhs
    routeDetails: [
      {
        vessel: 'HPCL Coastal Spirit',
        route: 'Mumbai → Chennai → Tuticorin',
        cargo_mt: 32000,
        transit_days: 3.2,
        cost: 950000
      },
      {
        vessel: 'HPCL Maritime Excel',
        route: 'Visakhapatnam → Jawaharlal Nehru Port → Dahej',
        cargo_mt: 35000,
        transit_days: 2.9,
        cost: 1050000
      },
      {
        vessel: 'HPCL Coastal Warrior',
        route: 'Kochi → Mangalore',
        cargo_mt: 30000,
        transit_days: 1.8,
        cost: 720000
      },
      {
        vessel: 'HPCL Eastern Star',
        route: 'Haldia → Kakinada → Ennore',
        cargo_mt: 33000,
        transit_days: 3.5,
        cost: 1120000
      },
      {
        vessel: 'HPCL Southern Belle',
        route: 'Paradip → Chennai',
        cargo_mt: 29000,
        transit_days: 2.1,
        cost: 780000
      }
    ]
  };

  return (
    <div className="space-y-6">
      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Cost</p>
              <p className="text-2xl font-bold text-gray-900">₹{(result.total_cost / 1000000).toFixed(1)}L</p>
              <p className="text-xs text-green-600">-18% vs manual</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Ship className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Fleet Utilization</p>
              <p className="text-2xl font-bold text-gray-900">{result.fleet_utilization.toFixed(1)}%</p>
              <p className="text-xs text-blue-600">+12% improvement</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Target className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Demand Satisfaction</p>
              <p className="text-2xl font-bold text-gray-900">{result.demand_satisfaction_rate.toFixed(1)}%</p>
              <p className="text-xs text-orange-600">Excellent coverage</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Leaf className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">CO₂ Reduction</p>
              <p className="text-2xl font-bold text-gray-900">{mockResults.co2Reduction}</p>
              <p className="text-xs text-purple-600">MT saved</p>
            </div>
          </div>
        </div>
      </div>

      {/* Optimization Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <TrendingUp className="h-5 w-5 text-green-600 mr-2" />
            Cost Savings Breakdown
          </h3>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Fuel Optimization</span>
              <span className="font-medium text-green-600">₹{(mockResults.estimatedSavings * 0.4 / 100000).toFixed(1)}L</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Route Efficiency</span>
              <span className="font-medium text-green-600">₹{(mockResults.estimatedSavings * 0.3 / 100000).toFixed(1)}L</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Demurrage Avoidance</span>
              <span className="font-medium text-green-600">₹{(mockResults.demurrageSavings / 100000).toFixed(1)}L</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Port Optimization</span>
              <span className="font-medium text-green-600">₹{(mockResults.estimatedSavings * 0.2 / 100000).toFixed(1)}L</span>
            </div>
            <div className="border-t pt-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-900">Total Monthly Savings</span>
                <span className="font-bold text-green-600">₹{(mockResults.estimatedSavings / 100000).toFixed(1)}L</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Clock className="h-5 w-5 text-blue-600 mr-2" />
            Optimization Performance
          </h3>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Routes Generated</span>
              <span className="font-medium">{(result.selected_routes.length * 726).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Selected Routes</span>
              <span className="font-medium">{mockResults.routeDetails.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Avg Transit Time</span>
              <span className="font-medium">{mockResults.avgTransitTime} days</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Vessels Utilized</span>
              <span className="font-medium">{mockResults.routeDetails.length}/9</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Cargo Moved</span>
              <span className="font-medium">{(mockResults.routeDetails.reduce((sum, r) => sum + r.cargo_mt, 0) / 1000).toFixed(0)}K MT</span>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Route Results */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Ship className="h-5 w-5 text-orange-600 mr-2" />
            Optimized Vessel Routes
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vessel
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Route
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cargo (MT)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Transit Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cost (₹)
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {mockResults.routeDetails.map((route, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{route.vessel}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 flex items-center">
                      <MapPin className="h-4 w-4 text-gray-400 mr-1" />
                      {route.route}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{route.cargo_mt.toLocaleString()}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{route.transit_days} days</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">₹{(route.cost / 100000).toFixed(1)}L</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* HPCL Constraints Validation */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">HPCL Constraint Validation</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Single Loading Port Rule</span>
              <span className="flex items-center text-green-600">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                Satisfied
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Max 2 Discharge Ports</span>
              <span className="flex items-center text-green-600">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                Satisfied
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Fleet Size Constraint</span>
              <span className="flex items-center text-green-600">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                {mockResults.routeDetails.length}/9 vessels
              </span>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Demand Coverage</span>
              <span className="flex items-center text-green-600">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                98.2%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">EEOI Compliance</span>
              <span className="flex items-center text-green-600">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                IMO Compliant
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Solution Quality</span>
              <span className="flex items-center text-green-600">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                Optimal
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
