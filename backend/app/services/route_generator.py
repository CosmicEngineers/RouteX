"""
HPCL Coastal Tanker Optimization - Set Partitioning Route Generator
Generates ~726 feasible voyage patterns for HPCL's optimization constraints
"""

import asyncio
from typing import List, Dict, Any, Tuple
import itertools
import uuid
from datetime import datetime, timedelta
import logging

from .distance_calculator import get_hpcl_route_distance, get_hpcl_route_coordinates
from .cost_calculator import HPCLCostCalculator
from ..models.schemas import HPCLVessel, HPCLPort, HPCLRoute
from ..data.challenge_data import (
    get_challenge_trip_times_load_to_unload,
    get_challenge_trip_times_unload_to_unload
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# HPCL Constraints
MAX_DISCHARGE_PORTS = 2
SINGLE_LOADING_CONSTRAINT = True

# Load trip time tables
TRIP_TIMES_LOAD_TO_UNLOAD = get_challenge_trip_times_load_to_unload()
TRIP_TIMES_UNLOAD_TO_UNLOAD = get_challenge_trip_times_unload_to_unload()

# Service time constants (hours)
LOADING_TIME_HOURS = 6.0  # 6 hours for loading
UNLOADING_TIME_HOURS_PER_PORT = 4.0  # 4 hours per unloading port


def calculate_trip_time_from_tables(
    loading_port_id: str,
    discharge_port_ids: List[str],
    include_service_time: bool = True,
    include_return_trip: bool = False
) -> float:
    """
    Calculate trip time using exact trip time tables from challenge data.
    
    Args:
        loading_port_id: Loading port ID (L1-L6)
        discharge_port_ids: List of discharge port IDs (U1-U11), max 2 ports
        include_service_time: Include loading/unloading time
        include_return_trip: Include return journey from last discharge back to loading port
    
    Returns:
        Total trip time in days
    """
    if not discharge_port_ids:
        return 0.0
    
    total_trip_time_days = 0.0
    
    # Step 1: Loading port to first discharge port
    first_discharge = discharge_port_ids[0]
    load_to_first_unload = TRIP_TIMES_LOAD_TO_UNLOAD.get(loading_port_id, {}).get(first_discharge, 0.5)
    total_trip_time_days += load_to_first_unload
    
    # Step 2: If there's a second discharge port, add inter-port sailing time
    if len(discharge_port_ids) > 1:
        for i in range(len(discharge_port_ids) - 1):
            from_port = discharge_port_ids[i]
            to_port = discharge_port_ids[i + 1]
            unload_to_unload = TRIP_TIMES_UNLOAD_TO_UNLOAD.get(from_port, {}).get(to_port, 0.2)
            total_trip_time_days += unload_to_unload
    
    # Step 3: Add service time (loading + unloading)
    if include_service_time:
        loading_time_days = LOADING_TIME_HOURS / 24.0
        unloading_time_days = (UNLOADING_TIME_HOURS_PER_PORT * len(discharge_port_ids)) / 24.0
        total_trip_time_days += loading_time_days + unloading_time_days
    
    # Step 4: Add return trip if needed (from last discharge port back to loading port)
    if include_return_trip:
        last_discharge = discharge_port_ids[-1]
        # Return time is approximately same as load to unload (reverse route)
        return_time = TRIP_TIMES_LOAD_TO_UNLOAD.get(loading_port_id, {}).get(last_discharge, 0.5)
        total_trip_time_days += return_time
    
    return total_trip_time_days


class HPCLRouteGenerator:
    """
    HPCL Set Partitioning Route Generator
    Pre-generates ALL feasible voyage patterns for optimization
    """
    
    def __init__(self):
        self.cost_calculator = HPCLCostCalculator()
        self.generated_routes: List[Dict[str, Any]] = []
        
    async def generate_all_feasible_routes(
        self, 
        vessels: List[HPCLVessel], 
        loading_ports: List[HPCLPort],
        unloading_ports: List[HPCLPort],
        fuel_price_per_mt: float = 45000.0
    ) -> List[Dict[str, Any]]:
        """
        Generate ALL feasible routes for HPCL Set Partitioning Problem
        
        Pattern A: Direct routes (Load → Unload) = 6 × 11 = 66 per vessel
        Pattern B: Split routes (Load → Unload1 → Unload2) = 6 × 11 × 10 = 660 per vessel
        Total: ~726 routes per vessel type
        """
        logger.info("Starting HPCL feasible route generation...")
        start_time = datetime.now()
        
        all_routes = []
        route_counter = 0
        
        for vessel in vessels:
            logger.info(f"Generating routes for vessel: {vessel.name}")
            
            # Pattern A: Direct Routes (Single discharge port)
            direct_routes = await self._generate_direct_routes(
                vessel, loading_ports, unloading_ports, fuel_price_per_mt
            )
            all_routes.extend(direct_routes)
            route_counter += len(direct_routes)
            
            # Pattern B: Split Routes (Two discharge ports)
            split_routes = await self._generate_split_routes(
                vessel, loading_ports, unloading_ports, fuel_price_per_mt
            )
            all_routes.extend(split_routes)
            route_counter += len(split_routes)
            
            logger.info(f"Generated {len(direct_routes)} direct + {len(split_routes)} split routes for {vessel.name}")
        
        generation_time = (datetime.now() - start_time).total_seconds()
        logger.info(f"Route generation completed: {route_counter} total routes in {generation_time:.2f} seconds")
        
        self.generated_routes = all_routes
        return all_routes
    
    async def _generate_direct_routes(
        self,
        vessel: HPCLVessel,
        loading_ports: List[HPCLPort],
        unloading_ports: List[HPCLPort],
        fuel_price_per_mt: float
    ) -> List[Dict[str, Any]]:
        """
        Generate direct routes: Load Port → Unload Port
        """
        direct_routes = []
        
        for loading_port in loading_ports:
            for unloading_port in unloading_ports:
                
                # Calculate route metrics
                route_data = await self._calculate_route_metrics(
                    vessel=vessel,
                    loading_port=loading_port,
                    discharge_ports=[unloading_port],
                    fuel_price_per_mt=fuel_price_per_mt,
                    route_type="direct"
                )
                
                if route_data:
                    direct_routes.append(route_data)
        
        return direct_routes
    
    async def _generate_split_routes(
        self,
        vessel: HPCLVessel,
        loading_ports: List[HPCLPort],
        unloading_ports: List[HPCLPort],
        fuel_price_per_mt: float
    ) -> List[Dict[str, Any]]:
        """
        Generate split routes: Load Port → Unload Port 1 → Unload Port 2
        """
        split_routes = []
        
        for loading_port in loading_ports:
            # Generate all combinations of 2 unloading ports
            for unload_port_1, unload_port_2 in itertools.combinations(unloading_ports, 2):
                
                # Try both orders: U1 → U2 and U2 → U1
                for discharge_sequence in [(unload_port_1, unload_port_2), (unload_port_2, unload_port_1)]:
                    
                    route_data = await self._calculate_route_metrics(
                        vessel=vessel,
                        loading_port=loading_port,
                        discharge_ports=list(discharge_sequence),
                        fuel_price_per_mt=fuel_price_per_mt,
                        route_type="split"
                    )
                    
                    if route_data:
                        split_routes.append(route_data)
        
        return split_routes
    
    async def _calculate_route_metrics(
        self,
        vessel: HPCLVessel,
        loading_port: HPCLPort,
        discharge_ports: List[HPCLPort],
        fuel_price_per_mt: float,
        route_type: str
    ) -> Dict[str, Any]:
        """
        Calculate complete metrics for a single route using EXACT trip time tables
        """
        try:
            # Generate unique route ID
            route_id = f"HPCL_{vessel.id}_{loading_port.id}_{'_'.join([p.id for p in discharge_ports])}_{uuid.uuid4().hex[:8]}"
            
            # Calculate EXACT trip time from challenge data tables
            discharge_port_ids = [p.id for p in discharge_ports]
            total_time_days = calculate_trip_time_from_tables(
                loading_port_id=loading_port.id,
                discharge_port_ids=discharge_port_ids,
                include_service_time=True,  # Include loading/unloading time
                include_return_trip=False   # Don't include return by default
            )
            total_time_hours = total_time_days * 24.0
            
            # Calculate route segments and total distance (for visualization)
            route_segments = await self._calculate_route_segments(loading_port, discharge_ports)
            total_distance_nm = sum(segment['distance_nm'] for segment in route_segments)
            
            # Determine cargo split for discharge ports
            cargo_split = self._calculate_cargo_split(vessel.capacity_mt, discharge_ports, route_type)
            total_cargo_mt = sum(cargo_split.values())
            
            # Calculate cost using EXACT trip time
            # Cost = (trip_days × charter_rate) + port_charges + fuel
            charter_cost = total_time_days * vessel.daily_charter_rate
            
            # Calculate port charges (simplified)
            port_charges = loading_port.port_charges_per_visit or 100000
            for discharge_port in discharge_ports:
                port_charges += (discharge_port.port_charges_per_visit or 80000)
            
            # Calculate fuel cost (based on actual sailing time, not including service time)
            sailing_time_days = calculate_trip_time_from_tables(
                loading_port_id=loading_port.id,
                discharge_port_ids=discharge_port_ids,
                include_service_time=False,  # Only sailing time for fuel
                include_return_trip=False
            )
            fuel_consumption_mt = vessel.fuel_consumption_mt_per_day * sailing_time_days
            fuel_cost = fuel_consumption_mt * fuel_price_per_mt
            
            # Total cost composition
            total_cost = charter_cost + port_charges + fuel_cost
            
            cost_breakdown = {
                'charter_cost': charter_cost,
                'port_charges': port_charges,
                'fuel_cost': fuel_cost,
                'total_cost': total_cost,
                'fuel_consumption_mt': fuel_consumption_mt,
                'trip_time_days': total_time_days,
                'sailing_time_days': sailing_time_days,
                'service_time_days': total_time_days - sailing_time_days
            }
            
            # Get route coordinates for visualization
            route_coordinates = await self._get_route_coordinates_chain(loading_port, discharge_ports)
            
            # Validate HPCL constraints
            if not self._validate_hpcl_constraints(loading_port, discharge_ports):
                return None
            
            return {
                'route_id': route_id,
                'vessel_id': vessel.id,
                'vessel_name': vessel.name,
                'route_type': route_type,
                
                # Route structure
                'loading_port': loading_port.id,
                'discharge_ports': [port.id for port in discharge_ports],
                'route_segments': route_segments,
                
                # EXACT metrics from trip time tables
                'total_time_hours': round(total_time_hours, 2),
                'total_time_days': round(total_time_days, 3),
                'total_distance_nm': round(total_distance_nm, 2),
                'total_cost': round(total_cost, 2),
                'cargo_quantity': total_cargo_mt,
                'cargo_split': cargo_split,
                
                # Cost breakdown
                'cost_breakdown': cost_breakdown,
                
                # Visualization data
                'route_coordinates': route_coordinates,
                
                # Operational data
                'sailing_time_hours': round(sailing_time_days * 24, 2),
                'port_time_hours': round((total_time_days - sailing_time_days) * 24, 2),
                'fuel_consumption_mt': round(fuel_consumption_mt, 2),
                
                # Performance indicators
                'cost_per_nm': round(total_cost / total_distance_nm, 2) if total_distance_nm > 0 else 0,
                'cost_per_mt': round(total_cost / total_cargo_mt, 2) if total_cargo_mt > 0 else 0,
                'cost_per_day': round(total_cost / total_time_days, 2) if total_time_days > 0 else 0,
                
                # Metadata
                'generated_at': datetime.now().isoformat(),
                'fuel_price_used': fuel_price_per_mt
            }
            
        except Exception as e:
            logger.error(f"Error calculating route metrics: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    async def _calculate_route_segments(
        self, 
        loading_port: HPCLPort, 
        discharge_ports: List[HPCLPort]
    ) -> List[Dict[str, Any]]:
        """
        Calculate individual segments of the route
        """
        segments = []
        current_port = loading_port
        
        for i, discharge_port in enumerate(discharge_ports):
            distance_nm = await get_hpcl_route_distance(current_port.id, discharge_port.id)
            
            segment = {
                'segment_id': i + 1,
                'from_port': current_port.id,
                'to_port': discharge_port.id,
                'distance_nm': distance_nm,
                'segment_type': 'loading_to_discharge' if i == 0 else 'discharge_to_discharge'
            }
            
            segments.append(segment)
            current_port = discharge_port
        
        return segments
    
    def _calculate_port_time(
        self, 
        loading_port: HPCLPort, 
        discharge_ports: List[HPCLPort], 
        vessel: HPCLVessel
    ) -> float:
        """
        Calculate total port time (loading + unloading + waiting)
        """
        # Loading time
        loading_time = vessel.capacity_mt / loading_port.loading_rate
        
        # Unloading time (split cargo among discharge ports)
        total_unloading_time = 0
        for port in discharge_ports:
            # Assume equal split for now (can be made more sophisticated)
            cargo_for_port = vessel.capacity_mt / len(discharge_ports)
            unloading_time = cargo_for_port / port.unloading_rate
            total_unloading_time += unloading_time
        
        # Add port waiting/maneuvering time (2 hours per port call)
        port_calls = 1 + len(discharge_ports)  # Loading + discharge ports
        waiting_time = port_calls * 2.0
        
        return loading_time + total_unloading_time + waiting_time
    
    def _calculate_cargo_split(
        self, 
        vessel_capacity: float, 
        discharge_ports: List[HPCLPort], 
        route_type: str
    ) -> Dict[str, float]:
        """
        Calculate how cargo is split among discharge ports
        """
        cargo_split = {}
        
        if route_type == "direct":
            # Single discharge port gets all cargo
            cargo_split[discharge_ports[0].id] = vessel_capacity
        else:
            # Split cargo equally among discharge ports (can be optimized later)
            cargo_per_port = vessel_capacity / len(discharge_ports)
            for port in discharge_ports:
                cargo_split[port.id] = cargo_per_port
        
        return cargo_split
    
    async def _get_route_coordinates_chain(
        self, 
        loading_port: HPCLPort, 
        discharge_ports: List[HPCLPort]
    ) -> List[List[float]]:
        """
        Get complete route coordinates for visualization
        """
        all_coordinates = []
        current_port = loading_port
        
        for discharge_port in discharge_ports:
            segment_coords = await get_hpcl_route_coordinates(current_port.id, discharge_port.id)
            if segment_coords:
                all_coordinates.extend(segment_coords)
            current_port = discharge_port
        
        return all_coordinates
    
    def _validate_hpcl_constraints(
        self, 
        loading_port: HPCLPort, 
        discharge_ports: List[HPCLPort]
    ) -> bool:
        """
        Validate route against HPCL-specific operational constraints
        
        HARD CONSTRAINTS from Challenge 7.1:
        1. Single loading port per voyage (enforced by route structure)
        2. Maximum 2 discharge ports per voyage
        3. At least 1 discharge port
        4. No duplicate discharge ports
        5. Loading port ≠ discharge port
        """
        # HPCL Constraint 1: Single loading port (automatically satisfied by generation logic)
        # Each route is generated with exactly one loading port
        
        # HPCL Constraint 2: Max 2 discharge ports (HARD CONSTRAINT)
        if len(discharge_ports) > MAX_DISCHARGE_PORTS:
            logger.warning(f"Route violates max discharge ports constraint: {len(discharge_ports)} > {MAX_DISCHARGE_PORTS}")
            return False
        
        # HPCL Constraint 3: At least one discharge port
        if len(discharge_ports) == 0:
            logger.warning("Route has no discharge ports")
            return False
        
        # HPCL Constraint 4: No duplicate discharge ports
        if len(set(port.id for port in discharge_ports)) != len(discharge_ports):
            logger.warning(f"Route has duplicate discharge ports: {[p.id for p in discharge_ports]}")
            return False
        
        # HPCL Constraint 5: Loading port cannot be same as discharge port
        if loading_port.id in [port.id for port in discharge_ports]:
            logger.warning(f"Loading port {loading_port.id} appears in discharge ports")
            return False
        
        # All constraints satisfied
        return True
    
    def get_route_statistics(self) -> Dict[str, Any]:
        """
        Get statistics about generated routes
        """
        if not self.generated_routes:
            return {"status": "no_routes_generated"}
        
        total_routes = len(self.generated_routes)
        direct_routes = len([r for r in self.generated_routes if r['route_type'] == 'direct'])
        split_routes = len([r for r in self.generated_routes if r['route_type'] == 'split'])
        
        # Cost statistics
        costs = [r['total_cost'] for r in self.generated_routes]
        distances = [r['total_distance_nm'] for r in self.generated_routes]
        times = [r['total_time_hours'] for r in self.generated_routes]
        
        return {
            "status": "generated",
            "total_routes": total_routes,
            "direct_routes": direct_routes,
            "split_routes": split_routes,
            "cost_range": {
                "min": min(costs),
                "max": max(costs),
                "avg": sum(costs) / len(costs)
            },
            "distance_range": {
                "min": min(distances),
                "max": max(distances),
                "avg": sum(distances) / len(distances)
            },
            "time_range": {
                "min": min(times),
                "max": max(times),
                "avg": sum(times) / len(times)
            },
            "vessels_covered": len(set(r['vessel_id'] for r in self.generated_routes))
        }


class HPCLRouteOptimizer:
    """
    Filters and optimizes generated routes for specific scenarios
    """
    
    def __init__(self):
        self.route_generator = HPCLRouteGenerator()
    
    async def generate_optimized_route_set(
        self,
        vessels: List[HPCLVessel],
        loading_ports: List[HPCLPort],
        unloading_ports: List[HPCLPort],
        fuel_price_per_mt: float = 45000.0,
        optimization_focus: str = "cost"  # "cost", "time", "distance"
    ) -> List[Dict[str, Any]]:
        """
        Generate and filter routes based on optimization focus
        """
        # Generate all feasible routes
        all_routes = await self.route_generator.generate_all_feasible_routes(
            vessels, loading_ports, unloading_ports, fuel_price_per_mt
        )
        
        # Apply optimization-specific filtering
        if optimization_focus == "cost":
            # Keep routes with better cost efficiency
            optimized_routes = self._filter_by_cost_efficiency(all_routes)
        elif optimization_focus == "time":
            # Keep routes with better time efficiency
            optimized_routes = self._filter_by_time_efficiency(all_routes)
        elif optimization_focus == "distance":
            # Keep routes with shorter distances
            optimized_routes = self._filter_by_distance_efficiency(all_routes)
        else:
            # Keep all routes for balanced optimization
            optimized_routes = all_routes
        
        logger.info(f"Optimized route set: {len(optimized_routes)} routes (from {len(all_routes)} total)")
        return optimized_routes
    
    def _filter_by_cost_efficiency(self, routes: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Filter routes by cost efficiency (cost per MT)
        """
        # Sort by cost per MT and keep top performers per vessel-port combination
        route_groups = {}
        
        for route in routes:
            key = f"{route['vessel_id']}_{route['loading_port']}"
            if key not in route_groups:
                route_groups[key] = []
            route_groups[key].append(route)
        
        filtered_routes = []
        for group in route_groups.values():
            # Sort by cost per MT and keep top 50%
            group.sort(key=lambda r: r.get('cost_per_mt', float('inf')))
            keep_count = max(1, len(group) // 2)
            filtered_routes.extend(group[:keep_count])
        
        return filtered_routes
    
    def _filter_by_time_efficiency(self, routes: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Filter routes by time efficiency
        """
        # Similar filtering logic but based on total_time_hours
        route_groups = {}
        
        for route in routes:
            key = f"{route['vessel_id']}_{route['loading_port']}"
            if key not in route_groups:
                route_groups[key] = []
            route_groups[key].append(route)
        
        filtered_routes = []
        for group in route_groups.values():
            group.sort(key=lambda r: r.get('total_time_hours', float('inf')))
            keep_count = max(1, len(group) // 2)
            filtered_routes.extend(group[:keep_count])
        
        return filtered_routes
    
    def _filter_by_distance_efficiency(self, routes: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Filter routes by distance efficiency
        """
        route_groups = {}
        
        for route in routes:
            key = f"{route['vessel_id']}_{route['loading_port']}"
            if key not in route_groups:
                route_groups[key] = []
            route_groups[key].append(route)
        
        filtered_routes = []
        for group in route_groups.values():
            group.sort(key=lambda r: r.get('total_distance_nm', float('inf')))
            keep_count = max(1, len(group) // 2)
            filtered_routes.extend(group[:keep_count])
        
        return filtered_routes


# Initialize global route generator
hpcl_route_generator = HPCLRouteGenerator()
hpcl_route_optimizer = HPCLRouteOptimizer()
