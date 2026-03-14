"""
HPCL Coastal Tanker Optimization - Set Partitioning Route Generator
Generates ~726 feasible voyage patterns for HPCL's optimization constraints
"""

import asyncio
from typing import List, Dict, Any, Tuple, Optional
import itertools
import uuid
from datetime import datetime, timedelta
import logging
import json
from functools import lru_cache

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

# NOTE: No service time constants — the PS trip time tables already
# encode full trip duration (loading + sailing + unloading). Adding
# extra service time would double-count and contradict the PS.


def calculate_trip_time_from_tables(
    loading_port_id: str,
    discharge_port_ids: List[str],
    include_service_time: bool = False,  # Service time NOT added — PS tables encode full duration
    include_return_trip: bool = False
) -> float:
    """
    Calculate trip time using exact trip time tables from the Challenge 7.1 PS.

    The PS provides trip times in days directly — these represent the total
    time for each voyage leg. No service time is added on top.

    Args:
        loading_port_id: Loading port ID (L1-L6)
        discharge_port_ids: List of discharge port IDs (U1-U11), max 2 ports
        include_service_time: Kept for API compatibility but has NO EFFECT.
                              PS tables already encode full trip time.
        include_return_trip: Include return journey from last discharge back to loading port

    Returns:
        Total trip time in days
    """
    if not discharge_port_ids:
        return 0.0

    total_trip_time_days = 0.0

    # Step 1: Loading port to first discharge port (from PS table)
    first_discharge = discharge_port_ids[0]
    load_to_first_unload = TRIP_TIMES_LOAD_TO_UNLOAD.get(loading_port_id, {}).get(first_discharge, 0.5)
    total_trip_time_days += load_to_first_unload

    # Step 2: If there's a second discharge port, add inter-port sailing time (from PS table)
    if len(discharge_port_ids) > 1:
        for i in range(len(discharge_port_ids) - 1):
            from_port = discharge_port_ids[i]
            to_port = discharge_port_ids[i + 1]
            unload_to_unload = TRIP_TIMES_UNLOAD_TO_UNLOAD.get(from_port, {}).get(to_port, 0.2)
            total_trip_time_days += unload_to_unload

    # Step 3: include_service_time parameter is intentionally ignored.
    # The PS trip time tables represent the complete voyage duration.
    # Adding extra loading/unloading time would contradict the PS data.

    # Step 4: Add return trip sailing time if needed
    if include_return_trip:
        last_discharge = discharge_port_ids[-1]
        return_time = TRIP_TIMES_LOAD_TO_UNLOAD.get(loading_port_id, {}).get(last_discharge, 0.5)
        total_trip_time_days += return_time

    return total_trip_time_days


class HPCLRouteGenerator:
    """
    HPCL Set Partitioning Route Generator
    Pre-generates ALL feasible voyage patterns for optimization
    With smart pruning and caching for performance
    """
    
    def __init__(self, enable_pruning: bool = True, enable_caching: bool = True):
        self.cost_calculator = HPCLCostCalculator()
        self.generated_routes: List[Dict[str, Any]] = []
        self.enable_pruning = enable_pruning
        self.enable_caching = enable_caching
        self.route_cache: Dict[str, List[Dict[str, Any]]] = {}
        self.pruning_stats = {
            "total_generated": 0,
            "pruned_time_exceeded": 0,
            "pruned_dominated": 0,
            "pruned_cost_threshold": 0,
            "final_count": 0
        }
        
    async def generate_all_feasible_routes(
        self, 
        vessels: List[HPCLVessel], 
        loading_ports: List[HPCLPort],
        unloading_ports: List[HPCLPort],
        fuel_price_per_mt: float = 45000.0,
        vessel_available_hours: float = 720.0,
        max_cost_per_mt: Optional[float] = None,
        max_time_per_mt: Optional[float] = None
    ) -> List[Dict[str, Any]]:
        """
        Generate ALL feasible routes for HPCL Set Partitioning Problem
        With smart pruning for performance optimization
        
        Pattern A: Direct routes (Load → Unload) = 6 × 11 = 66 per vessel
        Pattern B: Split routes (Load → Unload1 → Unload2) = 6 × 11 × 10 = 660 per vessel
        Total: ~726 routes per vessel type (before pruning)
        """
        logger.info(f"Starting HPCL feasible route generation (pruning={'ON' if self.enable_pruning else 'OFF'})...")
        start_time = datetime.now()
        
        # Check cache first
        cache_key = f"{len(vessels)}_{len(loading_ports)}_{len(unloading_ports)}_{fuel_price_per_mt}"
        if self.enable_caching and cache_key in self.route_cache:
            logger.info(f"Using cached routes ({len(self.route_cache[cache_key])} routes)")
            return self.route_cache[cache_key]
        
        all_routes = []
        self.pruning_stats = {
            "total_generated": 0,
            "pruned_time_exceeded": 0,
            "pruned_dominated": 0,
            "pruned_cost_threshold": 0,
            "final_count": 0
        }
        
        for vessel in vessels:
            logger.info(f"Generating routes for vessel: {vessel.name}")
            
            # Pattern A: Direct Routes (Single discharge port)
            direct_routes = await self._generate_direct_routes(
                vessel, loading_ports, unloading_ports, fuel_price_per_mt
            )
            all_routes.extend(direct_routes)
            self.pruning_stats["total_generated"] += len(direct_routes)
            
            # Pattern B: Split Routes (Two discharge ports)
            split_routes = await self._generate_split_routes(
                vessel, loading_ports, unloading_ports, fuel_price_per_mt
            )
            all_routes.extend(split_routes)
            self.pruning_stats["total_generated"] += len(split_routes)
            
            logger.info(f"Generated {len(direct_routes)} direct + {len(split_routes)} split routes for {vessel.name}")
        
        # Apply pruning heuristics
        if self.enable_pruning:
            all_routes = self._prune_routes(
                all_routes, 
                vessel_available_hours,
                max_cost_per_mt or 2500.0,
                max_time_per_mt or 0.015
            )
        
        self.pruning_stats["final_count"] = len(all_routes)
        generation_time = (datetime.now() - start_time).total_seconds()
        
        # Log structured JSON for profiling
        logger.info(json.dumps({
            "event": "route_generation_complete",
            "total_routes_generated": self.pruning_stats["total_generated"],
            "routes_after_pruning": self.pruning_stats["final_count"],
            "pruned_time_exceeded": self.pruning_stats["pruned_time_exceeded"],
            "pruned_dominated": self.pruning_stats["pruned_dominated"],
            "pruned_cost_threshold": self.pruning_stats["pruned_cost_threshold"],
            "generation_time_seconds": round(generation_time, 2),
            "vessels_count": len(vessels),
            "pruning_enabled": self.enable_pruning
        }))
        
        # Cache results
        if self.enable_caching:
            self.route_cache[cache_key] = all_routes
        
        self.generated_routes = all_routes
        return all_routes
    
    def _prune_routes(
        self,
        routes: List[Dict[str, Any]],
        vessel_available_hours: float,
        max_cost_per_mt: float,
        max_time_per_mt: float
    ) -> List[Dict[str, Any]]:
        """
        Prune physically infeasible routes only.

        REMOVED heuristics:
        - Cost-per-MT threshold (was 2500 Rs/MT) — arbitrary, caused ports like
          U3 (5,000 MT demand) to lose all serving routes → artificial infeasibility.
        - Time-per-MT threshold — similarly arbitrary and dangerous.

        KEPT heuristic:
        - Drop routes where trip_time > vessel_available_hours (physical impossibility).
          With monthly averaging allowance: any single trip > 720 hours is infeasible.

        Dominated-route removal is also kept as it only removes strictly worse routes.
        """
        logger.info(f"Applying pruning heuristics to {len(routes)} routes...")

        pruned_routes = []

        # Only hard physical constraint: trip must fit in one month
        for route in routes:
            trip_time_hours = route.get('total_time_hours', 0)
            if trip_time_hours > vessel_available_hours:
                self.pruning_stats['pruned_time_exceeded'] += 1
                continue
            pruned_routes.append(route)

        # Remove strictly dominated routes (safe — only removes worse options)
        final_routes = self._remove_dominated_routes(pruned_routes)

        logger.info(f"Pruning complete: {len(routes)} → {len(final_routes)} routes")
        return final_routes
    
    def _remove_dominated_routes(self, routes: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Remove routes that are dominated by others.
        Route A dominates Route B if:
        - Same vessel, same loading port, and same discharge port *sequence*
        - A has lower cost AND lower time than B.

        IMPORTANT: Port order is preserved in the key (no `sorted()`), because
        L→U1→U2 and L→U2→U1 have different inter-port trip times from the PS
        tables (the U→U matrix is not symmetric).
        """
        route_groups: Dict[str, List[Dict[str, Any]]] = {}

        for route in routes:
            # Preserve discharge port ORDER — asymmetric trip times mean order matters
            discharge_seq = '→'.join(route['discharge_ports'])
            key = f"{route['vessel_id']}_{route['loading_port']}_{discharge_seq}"
            if key not in route_groups:
                route_groups[key] = []
            route_groups[key].append(route)

        non_dominated = []

        for group in route_groups.values():
            if len(group) == 1:
                non_dominated.extend(group)
                continue

            for route_a in group:
                is_dominated = False
                for route_b in group:
                    if route_a is route_b:
                        continue
                    if (route_b.get('total_cost', float('inf')) <= route_a.get('total_cost', float('inf')) and
                        route_b.get('total_time_hours', float('inf')) <= route_a.get('total_time_hours', float('inf')) and
                        (route_b.get('total_cost') < route_a.get('total_cost') or
                         route_b.get('total_time_hours') < route_a.get('total_time_hours'))):
                        is_dominated = True
                        self.pruning_stats['pruned_dominated'] += 1
                        break
                if not is_dominated:
                    non_dominated.append(route_a)

        return non_dominated
    
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
            
            # ─── HPCL Challenge 7.1 Cost Formula ────────────────────────────
            # Cost = Charter Hire Rate (Rs Cr/day) × Trip Duration (days)
            # No port charges, no fuel surcharges — only charter cost per PS.
            # ─────────────────────────────────────────────────────────────────
            charter_cost = total_time_days * vessel.daily_charter_rate
            total_cost = charter_cost  # PS-correct: charter cost only

            # Informational breakdown (not included in total_cost)
            # Kept for data richness but NOT used by optimizer objective.
            sailing_time_days = total_time_days  # PS tables give full trip time
            fuel_consumption_mt = vessel.fuel_consumption_mt_per_day * sailing_time_days
            fuel_cost = fuel_consumption_mt * fuel_price_per_mt
            port_charges = (loading_port.port_charges_per_visit or 100000) + sum(
                (dp.port_charges_per_visit or 80000) for dp in discharge_ports
            )
            
            cost_breakdown = {
                'charter_cost': charter_cost,
                'port_charges_informational': port_charges,
                'fuel_cost_informational': fuel_cost,
                'total_cost': total_cost,  # PS-correct: charter cost only
                'fuel_consumption_mt': fuel_consumption_mt,
                'trip_time_days': total_time_days,
                'charter_rate_cr_per_day': vessel.daily_charter_rate / 10_000_000  # in Rs Cr
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
                'vessel_capacity_mt': vessel.capacity_mt,  # Fix Bug 6: explicit per-vessel capacity
                'route_type': route_type,

                # Route structure
                'loading_port': loading_port.id,
                'discharge_ports': [port.id for port in discharge_ports],
                'route_segments': route_segments,

                # EXACT metrics from PS trip time tables
                'total_time_hours': round(total_time_hours, 2),
                'total_time_days': round(total_time_days, 3),
                'total_distance_nm': round(total_distance_nm, 2),

                # PS-correct cost: charter rate × trip days only
                'total_cost': round(total_cost, 2),
                'total_cost_cr': round(total_cost / 10_000_000, 6),  # In Rs Crore for display
                'charter_rate_cr_per_day': vessel.daily_charter_rate / 10_000_000,

                # Cargo (capacity is the upper bound; actual allocation decided by optimizer)
                'cargo_quantity': vessel.capacity_mt,  # vessel capacity (full load)
                'cargo_split': cargo_split,  # informational; optimizer decides actual split

                # Cost breakdown (informational)
                'cost_breakdown': cost_breakdown,

                # Visualization data
                'route_coordinates': route_coordinates,

                # Operational data
                'fuel_consumption_mt': round(fuel_consumption_mt, 2),

                # Performance indicators
                'cost_per_nm': round(total_cost / total_distance_nm, 2) if total_distance_nm > 0 else 0,
                'cost_per_mt': round(total_cost / vessel.capacity_mt, 2) if vessel.capacity_mt > 0 else 0,
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
        Return cargo capacity upper bounds per discharge port.

        For direct routes: full vessel capacity to single port.
        For 2-port routes: each port gets up to full vessel capacity as upper
        bound — the CP-SAT optimizer decides actual cargo amounts, subject to
        the constraint that total cargo <= vessel capacity.

        The old 50/50 equal-split assumption has been removed because the PS
        does NOT require equal splits. The optimizer freely allocates cargo
        to minimize cost while meeting each port's exact demand.
        """
        cargo_split = {}
        for port in discharge_ports:
            cargo_split[port.id] = vessel_capacity  # Upper bound only
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
        Return all routes sorted by cost efficiency — no routes are dropped.

        Previous 50% culling was removed because it could eliminate the only
        route serving a low-demand port (e.g. U3=5,000 MT) causing artificial
        infeasibility. The CP-SAT solver is better positioned to select
        cost-efficient routes among all feasible options.
        """
        return sorted(routes, key=lambda r: r.get('cost_per_mt', float('inf')))
    
    def _filter_by_time_efficiency(self, routes: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Return all routes sorted by time efficiency — no routes are dropped.
        Same reasoning as _filter_by_cost_efficiency: no culling.
        """
        return sorted(routes, key=lambda r: r.get('total_time_hours', float('inf')))
    
    def _filter_by_distance_efficiency(self, routes: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Return all routes sorted by distance — no routes are dropped.
        Same reasoning as _filter_by_cost_efficiency: no culling.
        """
        return sorted(routes, key=lambda r: r.get('total_distance_nm', float('inf')))


# Initialize global route generator
hpcl_route_generator = HPCLRouteGenerator()
hpcl_route_optimizer = HPCLRouteOptimizer()
