"""
HPCL Coastal Tanker Optimization - CP-SAT Optimization Engine
OR-Tools CP-SAT solver for HPCL's Set Partitioning Problem
"""

from ortools.sat.python import cp_model
from typing import List, Dict, Any, Optional, Tuple
import time
import logging
import json
from datetime import datetime, timedelta

from ..models.schemas import HPCLVessel, HPCLPort, HPCLRoute, MonthlyDemand, OptimizationResult, VesselSchedule, VoyageActivity, ActivityType
from .route_generator import HPCLRouteOptimizer, TRIP_TIMES_LOAD_TO_UNLOAD, TRIP_TIMES_UNLOAD_TO_UNLOAD
from .infeasibility_analyzer import analyze_infeasibility
from ..core.config import get_settings

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class HPCLCPSATOptimizer:
    """
    HPCL CP-SAT Optimization Engine
    Solves Set Partitioning Problem for coastal tanker fleet optimization
    With configurable solver parameters and structured logging
    """
    
    def __init__(self, solver_profile: str = "balanced"):
        self.route_optimizer = HPCLRouteOptimizer()
        self.model = None
        self.solver = None
        self.decision_variables = {}
        self.constraints = {}
        self.solver_profile = solver_profile
        self.settings = get_settings()
        self.metrics = {
            "route_generation_time": 0,
            "model_setup_time": 0,
            "solve_time": 0,
            "total_time": 0,
            "num_routes": 0,
            "num_variables": 0,
            "num_constraints": 0
        }
        
    async def optimize_hpcl_fleet(
        self,
        vessels: List[HPCLVessel],
        loading_ports: List[HPCLPort],
        unloading_ports: List[HPCLPort],
        monthly_demands: List[MonthlyDemand],
        fuel_price_per_mt: float = 45000.0,
        optimization_objective: str = "cost",
        max_solve_time_seconds: Optional[int] = None,
        num_workers: Optional[int] = None
    ) -> OptimizationResult:
        """
        Main optimization function for HPCL fleet
        With configurable solver parameters and comprehensive logging
        """
        total_start = time.time()
        logger.info(f"Starting HPCL CP-SAT fleet optimization (profile={self.solver_profile})...")
        
        # Get solver configuration from profile
        profile_config = self.settings.solver_profiles.get(
            self.solver_profile, 
            self.settings.solver_profiles["balanced"]
        )
        
        # Override with custom parameters if provided
        solve_time = max_solve_time_seconds or profile_config["max_time_seconds"]
        workers = num_workers or profile_config["num_workers"]
        
        logger.info(json.dumps({
            "event": "optimization_start",
            "solver_profile": self.solver_profile,
            "max_time_seconds": solve_time,
            "num_workers": workers,
            "vessels_count": len(vessels),
            "loading_ports": len(loading_ports),
            "unloading_ports": len(unloading_ports),
            "total_demand_mt": sum(d.demand_mt for d in monthly_demands),
            "objective": optimization_objective
        }))
        
        try:
            # Step 1: Generate all feasible routes (Set Partitioning columns)
            route_gen_start = time.time()
            logger.info("Generating feasible routes...")
            
            feasible_routes = await self.route_optimizer.generate_optimized_route_set(
                vessels=vessels,
                loading_ports=loading_ports,
                unloading_ports=unloading_ports,
                fuel_price_per_mt=fuel_price_per_mt,
                optimization_focus=optimization_objective
            )
            
            self.metrics["route_generation_time"] = time.time() - route_gen_start
            self.metrics["num_routes"] = len(feasible_routes)
            
            if not feasible_routes:
                return self._create_error_result("No feasible routes generated", total_start)
            
            logger.info(f"Generated {len(feasible_routes)} feasible routes in {self.metrics['route_generation_time']:.2f}s")
            
            # Step 2: Set up CP-SAT model
            model_setup_start = time.time()
            self._initialize_cp_model()
            
            # Step 3: Create decision variables
            self._create_decision_variables(feasible_routes)
            self.metrics["num_variables"] = len(self.decision_variables)
            
            # Step 4: Add constraints
            demand_dict = {demand.port_id: demand.demand_mt for demand in monthly_demands}
            self._add_demand_constraints(feasible_routes, demand_dict, unloading_ports)
            self._add_vessel_time_constraints(feasible_routes, vessels)
            self._add_hpcl_operational_constraints(feasible_routes, vessels)
            
            self.metrics["num_constraints"] = len(self.constraints)
            self.metrics["model_setup_time"] = time.time() - model_setup_start
            
            # Step 5: Set objective function
            self._set_optimization_objective(feasible_routes, optimization_objective)
            
            # Log model statistics
            logger.info(json.dumps({
                "event": "model_ready",
                "num_variables": self.metrics["num_variables"],
                "num_constraints": self.metrics["num_constraints"],
                "model_setup_time": round(self.metrics["model_setup_time"], 2)
            }))
            
            # Step 6: Solve the model
            logger.info("Starting CP-SAT solver...")
            solve_start = time.time()
            
            # Configure solver with profile parameters
            self.solver.parameters.max_time_in_seconds = solve_time
            self.solver.parameters.num_search_workers = workers
            self.solver.parameters.log_search_progress = self.settings.solver_log_progress
            
            # Solve
            status = self.solver.Solve(self.model)
            self.metrics["solve_time"] = time.time() - solve_start
            
            # Log solver statistics
            logger.info(json.dumps({
                "event": "solve_complete",
                "status": self.solver.StatusName(status),
                "solve_time": round(self.metrics["solve_time"], 2),
                "wall_time": round(self.solver.WallTime(), 2),
                "best_objective_bound": float(self.solver.BestObjectiveBound()) if status != cp_model.INFEASIBLE else None,
                "num_branches": self.solver.NumBranches(),
                "num_conflicts": self.solver.NumConflicts()
            }))
            
            # Step 7: Process results
            if status == cp_model.OPTIMAL or status == cp_model.FEASIBLE:
                result = await self._extract_optimization_result(
                    status, feasible_routes, vessels, unloading_ports, 
                    demand_dict, self.metrics["solve_time"], optimization_objective
                )
            elif status == cp_model.INFEASIBLE:
                # Problem is infeasible - demands cannot be met
                total_demand = sum(demand_dict.values())
                # BUG-C3 FIX: Calculate realistic max capacity from actual trip times.
                # PS trip times range 0.3-0.73 days. With 720h/month budget:
                # max trips per vessel ≈ floor(720 / (min_trip_hours)) = floor(720/7.2) ≈ 100.
                # Use a conservative estimate based on the shortest PS trip time (0.3 days = 7.2h).
                min_trip_hours = 0.3 * 24.0  # 0.3 days minimum trip time from PS
                max_trips_per_vessel = int(720.0 / min_trip_hours)  # ≈ 100
                total_capacity = sum(v.capacity_mt * max_trips_per_vessel for v in vessels)
                result = self._create_infeasibility_result(
                    total_demand, total_capacity, demand_dict, vessels, total_start
                )
            else:
                result = self._create_error_result(
                    f"Solver failed with status: {self.solver.StatusName(status)}", 
                    total_start
                )
            
            self.metrics["total_time"] = time.time() - total_start
            
            # Final comprehensive log
            logger.info(json.dumps({
                "event": "optimization_complete",
                "total_time": round(self.metrics["total_time"], 2),
                "route_generation_time": round(self.metrics["route_generation_time"], 2),
                "model_setup_time": round(self.metrics["model_setup_time"], 2),
                "solve_time": round(self.metrics["solve_time"], 2),
                "num_routes_generated": self.metrics["num_routes"],
                "num_variables": self.metrics["num_variables"],
                "num_constraints": self.metrics["num_constraints"],
                "status": self.solver.StatusName(status) if self.solver else "ERROR",
                "profile": self.solver_profile
            }))
            
            return result
            
        except Exception as e:
            logger.error(json.dumps({
                "event": "optimization_error",
                "error": str(e),
                "error_type": type(e).__name__
            }))
            return self._create_error_result(str(e), total_start)
    
    def _initialize_cp_model(self):
        """
        Initialize CP-SAT model and solver
        """
        self.model = cp_model.CpModel()
        self.solver = cp_model.CpSolver()
        self.decision_variables = {}
        self.constraints = {}
    
    def _create_decision_variables(self, feasible_routes: List[Dict[str, Any]]):
        """
        Create decision variables for cargo flow model.

        Per route r:
        - route_active[r]  : BoolVar  — 1 if route is used, 0 otherwise
        - cargo_to[r][p]   : IntVar in [0, vessel_capacity_mt]
                             Amount (MT) delivered to discharge port p on route r.

        The route dict now carries 'vessel_capacity_mt' set correctly per PS:
        T1-T7 = 50,000 MT, T8-T9 = 25,000 MT.
        """
        logger.info("Creating decision variables...")

        self.route_active_vars = {}
        # cargo_to[route_id][port_id] = IntVar for cargo volume to that port
        self.cargo_to_vars: Dict[str, Dict[str, Any]] = {}

        for route in feasible_routes:
            route_id = route['route_id']
            # Use explicit vessel capacity from route dict (Bug 6 fix)
            vessel_capacity = int(route.get('vessel_capacity_mt', 50000))

            # Binary activation variable
            self.route_active_vars[route_id] = self.model.NewBoolVar(f"active_{route_id}")

            # Per-discharge-port cargo variables
            self.cargo_to_vars[route_id] = {}
            for port_id in route['discharge_ports']:
                var = self.model.NewIntVar(0, vessel_capacity, f"cargo_{route_id}_{port_id}")
                self.cargo_to_vars[route_id][port_id] = var

            # PS Constraint 1: "Each tanker must load its FULL capacity from only one loading port."
            # When a route is active, total cargo delivered across all discharge ports must
            # equal the vessel's full capacity (equality, not inequality).
            # When inactive, the constraint forces total cargo to 0.
            total_cargo_expr = sum(self.cargo_to_vars[route_id].values())
            self.model.Add(total_cargo_expr == vessel_capacity * self.route_active_vars[route_id])

        # Keep cargo_flow_vars as alias pointing to total per route for backward compat
        self.cargo_flow_vars = {}
        for route in feasible_routes:
            route_id = route['route_id']
            vessel_capacity = int(route.get('vessel_capacity_mt', 50000))
            total_var = self.model.NewIntVar(0, vessel_capacity, f"total_cargo_{route_id}")
            self.model.Add(total_var == sum(self.cargo_to_vars[route_id].values()))
            self.cargo_flow_vars[route_id] = total_var

        self.decision_variables = self.cargo_flow_vars

        logger.info(f"Created {len(self.route_active_vars)} routes, per-port cargo variables for flexible allocation")
    
    def _add_demand_constraints(
        self,
        feasible_routes: List[Dict[str, Any]],
        demand_dict: Dict[str, float],
        unloading_ports: List[HPCLPort]
    ):
        """
        Add EXACT demand constraints per Challenge 7.1.

        BUG 2 FIX: Remove the old 50/50 split assumption.
        Previously: 2×direct + split = 2×demand (forces half cargo to each port).
        Now: for each port P, sum of cargo_to[r][P] over all routes r == demand[P].

        cargo_to[r][P] is a free integer variable in [0, vessel_capacity].
        The CP-SAT solver decides how much cargo each route delivers to each port,
        subject to: Σ_P cargo_to[r][P] ≤ vessel_capacity × route_active[r].
        """
        logger.info("Adding demand satisfaction constraints (HPCL Challenge 7.1 — Bug 2 fixed)...")

        ports_with_routes = 0
        ports_without_routes = 0

        for port in unloading_ports:
            port_id = port.id
            demand_mt = int(round(demand_dict.get(port_id, 0.0)))

            if demand_mt == 0:
                continue

            # Collect all cargo variables that deliver to this port
            serving_cargo_vars = []
            for route in feasible_routes:
                if port_id in route['discharge_ports']:
                    cargo_var = self.cargo_to_vars[route['route_id']].get(port_id)
                    if cargo_var is not None:
                        serving_cargo_vars.append(cargo_var)

            if not serving_cargo_vars:
                logger.warning(f"Port {port_id}: no routes found — problem will be infeasible!")
                ports_without_routes += 1
                continue

            # EXACT equality: total cargo delivered to port P == demand[P]
            self.model.Add(sum(serving_cargo_vars) == demand_mt)

            ports_with_routes += 1
            # Reset per-port counter (Bug 7 fix — was cumulative before)
            num_serving = len(serving_cargo_vars)
            self.constraints[f"demand_{port_id}"] = {
                'type': 'demand_satisfaction',
                'port': port_id,
                'demand': demand_mt,
                'serving_routes': num_serving
            }

        logger.info(f"Added EXACT demand constraints for {ports_with_routes} ports, {ports_without_routes} ports with no routes")

        # Log constraint details
        for port_id, demand_mt in demand_dict.items():
            direct_count = sum(1 for r in feasible_routes if port_id in r['discharge_ports'] and len(r['discharge_ports']) == 1)
            split_count  = sum(1 for r in feasible_routes if port_id in r['discharge_ports'] and len(r['discharge_ports']) == 2)
            logger.info(f"  Port {port_id}: demand={demand_mt} MT, direct_routes={direct_count}, split_routes={split_count}")
    
    def _add_vessel_time_constraints(
        self, 
        feasible_routes: List[Dict[str, Any]], 
        vessels: List[HPCLVessel]
    ):
        """
        Add vessel monthly time budget constraints (≤ 720 hours/month)
        
        HARD CONSTRAINT: Each vessel can work max 720 hours per month
        (30 days × 24 hours = 720 hours operational constraint)
        """
        logger.info("Adding vessel time constraints (using centihour scaling for precision)...")
        
        for vessel in vessels:
            vessel_id = vessel.id
            
            # Find all routes for this vessel
            vessel_routes = [
                route for route in feasible_routes 
                if route['vessel_id'] == vessel_id
            ]
            
            if vessel_routes:
                # BUG-C2 FIX: Use centihour scaling (×100) to avoid precision loss from int(round(hours)).
                # Trip times like 9.6h would round to 10h (+4% error per trip).
                # Scaling by 100 gives 960 centihours — exact integer with no rounding error.
                time_terms = []
                for route in vessel_routes:
                    route_id = route['route_id']
                    time_centihours = int(round(route['total_time_hours'] * 100))  # centihours (×100)
                    active_var = self.route_active_vars[route_id]
                    time_terms.append(active_var * time_centihours)
                
                # Enforce max centihours per month (vessel budget × 100)
                available_centihours = int(round(vessel.monthly_available_hours * 100))
                
                self.model.Add(sum(time_terms) <= available_centihours)
                
                self.constraints[f"time_{vessel_id}"] = {
                    'type': 'vessel_time_budget',
                    'vessel': vessel_id,
                    'available_hours': vessel.monthly_available_hours,
                    'available_centihours': available_centihours,
                    'route_count': len(vessel_routes)
                }
                
                logger.debug(f"Vessel {vessel_id}: {len(vessel_routes)} routes, max {vessel.monthly_available_hours:.1f}h ({available_centihours} centihours)")
        
        logger.info(f"Added time constraints for {len(vessels)} vessels (centihour-precise, ≤ available_hours/month)")
    
    def _add_hpcl_operational_constraints(
        self,
        feasible_routes: List[Dict[str, Any]],
        vessels: List[HPCLVessel]
    ):
        """
        Add HPCL-specific operational constraints.

        BUG 9 FIX: Removed the arbitrary "max 8 voyages per vessel" constraint.
        The PS does not specify a max voyage count. With trip times of 0.3-0.7 days,
        a vessel can physically complete many trips within the 720-hour monthly budget.
        The vessel time budget (≤720 hours) already prevents over-scheduling;
        a hardcoded count cap was redundant and caused unnecessary infeasibility.
        """
        logger.info("Adding HPCL operational constraints (no arbitrary voyage cap)...")
        # No additional operational constraints beyond time budget.
        # The time budget constraint in _add_vessel_time_constraints is sufficient.
        logger.info("Added HPCL operational constraints")
    
    def _set_optimization_objective(
        self, 
        feasible_routes: List[Dict[str, Any]], 
        optimization_objective: str
    ):
        """
        Set the optimization objective function
        Note: With hard demand constraints, no penalty terms needed for unmet demand
        """
        logger.info(f"Setting objective: {optimization_objective}")
        
        objective_terms = []
        
        if optimization_objective == "cost":
            # Minimize total HPCL charter cost.
            # BUG 5 FIX: Scale UP by 100 (preserve two decimal places in Rs Cr)
            # instead of dividing down by 100 (which lost precision).
            # total_cost is in Rs; multiply by 100 gives an integer in paise×100 —
            # large but within CP-SAT's 64-bit integer range.
            for route in feasible_routes:
                route_id = route['route_id']
                # total_cost = charter_rate_Rs_per_day × trip_days (PS-correct)
                cost_scaled = int(round(route['total_cost'] * 100))  # Scale UP for precision
                active_var = self.route_active_vars[route_id]
                objective_terms.append(active_var * cost_scaled)

        elif optimization_objective == "emissions":
            for route in feasible_routes:
                route_id = route['route_id']
                fuel_consumption = int(route.get('fuel_consumption_mt', 0) * 100)
                active_var = self.route_active_vars[route_id]
                objective_terms.append(active_var * fuel_consumption)

        elif optimization_objective == "time":
            for route in feasible_routes:
                route_id = route['route_id']
                time_scaled = int(round(route['total_time_hours'] * 100))  # centihours
                active_var = self.route_active_vars[route_id]
                objective_terms.append(active_var * time_scaled)

        else:  # balanced
            for route in feasible_routes:
                route_id = route['route_id']
                cost_scaled = int(round(route['total_cost'] * 100))
                time_scaled = int(round(route['total_time_hours'] * 100))
                active_var = self.route_active_vars[route_id]
                objective_terms.append(active_var * (cost_scaled + time_scaled))
        
        # NO shortage/excess penalties - we use hard constraints instead
        # This ensures the solver finds a feasible solution that meets all demand
        # or returns INFEASIBLE status
        
        # Set objective to minimize
        self.model.Minimize(sum(objective_terms))
        
        logger.info(f"Objective set with {len(objective_terms)} cost/time terms (hard demand constraints, no penalties)")
    
    async def _extract_optimization_result(
        self,
        status,
        feasible_routes: List[Dict[str, Any]],
        vessels: List[HPCLVessel],
        unloading_ports: List[HPCLPort],
        demand_dict: Dict[str, float],
        solve_time: float,
        optimization_objective: str
    ) -> OptimizationResult:
        """
        Extract and format optimization results
        """
        logger.info("Extracting optimization results...")
        
        # Get selected routes with continuous cargo flow values
        selected_routes = []
        total_cost = 0.0
        total_distance = 0.0
        total_cargo = 0.0

        # ── Pass 1: collect all active routes with solver cargo values ──────────
        active_routes_raw = []
        for route in feasible_routes:
            route_id = route['route_id']
            route_active = self.solver.Value(self.route_active_vars[route_id])

            if route_active > 0:  # Route is used
                # Read actual per-port cargo allocations from solver
                cargo_per_port = {
                    port_id: self.solver.Value(var)
                    for port_id, var in self.cargo_to_vars[route_id].items()
                }
                total_route_cargo = sum(cargo_per_port.values())

                route_copy = route.copy()
                route_copy['cargo_flow_mt'] = total_route_cargo
                route_copy['cargo_per_port'] = cargo_per_port
                route_copy['execution_count'] = 1  # will be aggregated below
                route_copy['scaled_cost'] = route['total_cost']
                route_copy['scaled_distance'] = route['total_distance_nm']
                route_copy['scaled_cargo'] = total_route_cargo
                active_routes_raw.append(route_copy)

        # ── Pass 2: aggregate identical voyage patterns per vessel ─────────────
        # Two routes are the "same trip pattern" if they share vessel, loading port,
        # and discharge port sequence. Grouping them lets us report the correct
        # trip count per tanker as required by the PS output.
        pattern_map: Dict[str, Dict[str, Any]] = {}
        for route_copy in active_routes_raw:
            discharge_seq = '→'.join(route_copy['discharge_ports'])
            pattern_key = f"{route_copy['vessel_id']}|{route_copy['loading_port']}|{discharge_seq}"
            if pattern_key not in pattern_map:
                # First occurrence — seed the aggregated entry
                agg = route_copy.copy()
                agg['execution_count'] = 1
                agg['cargo_per_port'] = dict(route_copy['cargo_per_port'])  # deep copy
                agg['cargo_flow_mt'] = route_copy['cargo_flow_mt']
                agg['scaled_cost'] = route_copy['scaled_cost']
                agg['scaled_distance'] = route_copy['scaled_distance']
                agg['scaled_cargo'] = route_copy['scaled_cargo']
                pattern_map[pattern_key] = agg
            else:
                # Additional occurrence — accumulate cargo and cost
                agg = pattern_map[pattern_key]
                agg['execution_count'] += 1
                for p, c in route_copy['cargo_per_port'].items():
                    agg['cargo_per_port'][p] = agg['cargo_per_port'].get(p, 0) + c
                agg['cargo_flow_mt'] += route_copy['cargo_flow_mt']
                agg['scaled_cost'] += route_copy['scaled_cost']
                agg['scaled_distance'] += route_copy['scaled_distance']
                agg['scaled_cargo'] += route_copy['scaled_cargo']

        selected_routes = list(pattern_map.values())

        for route_copy in selected_routes:
            total_cost += route_copy['scaled_cost']
            total_distance += route_copy['scaled_distance']
            total_cargo += route_copy['scaled_cargo']

        # Calculate demand satisfaction using actual per-port solver values
        demands_met = {}
        unmet_demand = {}

        for port in unloading_ports:
            port_id = port.id
            original_demand = demand_dict.get(port_id, 0.0)

            delivered = 0.0
            for route in selected_routes:
                if port_id in route['discharge_ports']:
                    # Use the actual cargo allocation from solver (no 50/50 assumption)
                    delivered += route['cargo_per_port'].get(port_id, 0)

            demands_met[port_id] = delivered
            unmet_demand[port_id] = max(0, original_demand - delivered)
        
        total_demand = sum(demand_dict.values())
        total_met = sum(demands_met.values())
        demand_satisfaction_rate = (total_met / total_demand * 100) if total_demand > 0 else 0
        
        # Log demand satisfaction details for debugging
        logger.info(f"Demand Satisfaction Summary:")
        logger.info(f"  Total Demand: {total_demand} MT")
        logger.info(f"  Total Delivered: {total_met} MT")
        logger.info(f"  Satisfaction Rate: {demand_satisfaction_rate:.2f}%")
        for port_id in sorted(demands_met.keys()):
            demand = demand_dict.get(port_id, 0)
            delivered = demands_met[port_id]
            unmet = unmet_demand[port_id]
            logger.info(f"  Port {port_id}: demand={demand} MT, delivered={delivered} MT, unmet={unmet} MT")
        
        # Generate vessel schedules
        vessel_schedules = await self._generate_vessel_schedules(selected_routes, vessels)
        
        # Calculate fleet utilization
        fleet_utilization = self._calculate_fleet_utilization(vessel_schedules, vessels)
        
        # Determine optimization status
        if status == cp_model.OPTIMAL:
            opt_status = "optimal"
        elif status == cp_model.FEASIBLE:
            opt_status = "feasible"
        else:
            opt_status = "suboptimal"
        
        # Generate recommendations
        recommendations = self._generate_recommendations(
            selected_routes, demands_met, unmet_demand, fleet_utilization
        )
        
        current_month = datetime.now().strftime("%Y-%m")  # Dynamic month

        # Populate cost_breakdown: PS defines cost = charter_rate × trip_days only.
        # Aggregate across all selected (aggregated) routes.
        total_charter_cost = sum(r['scaled_cost'] for r in selected_routes)
        result_cost_breakdown = {
            "charter_cost": round(total_charter_cost, 2),
            "fuel_cost": 0.0,       # not part of PS cost model
            "port_charges": 0.0,    # not part of PS cost model
            "cargo_handling": 0.0,  # not part of PS cost model
            "demurrage_provision": 0.0,
        }

        return OptimizationResult(
            request_id=f"hpcl_opt_{int(time.time())}",
            month=current_month,
            optimization_status=opt_status,
            solve_time_seconds=solve_time,
            # Build HPCLRoute objects for Pydantic type validation.
            # execution_count > 1 means this voyage pattern was repeated that many
            # times by the same tanker — satisfying PS requirement: "number of trips"
            selected_routes=[
                HPCLRoute(
                    route_id=route['route_id'],
                    vessel_id=route['vessel_id'],
                    loading_port=route['loading_port'],
                    discharge_ports=route['discharge_ports'],
                    total_distance_nm=route['total_distance_nm'],
                    total_time_hours=route['total_time_hours'],
                    total_cost=route['scaled_cost'],   # aggregated cost for all executions
                    hpcl_charter_cost=route['scaled_cost'],
                    cargo_quantity=route['cargo_flow_mt'],
                    cargo_split=route.get('cargo_per_port', {}),
                    route_coordinates=route.get('route_coordinates', []),
                    execution_count=route['execution_count'],
                )
                for route in selected_routes
            ],
            vessel_schedules=vessel_schedules,
            total_cost=total_cost,
            total_distance_nm=total_distance,
            total_cargo_mt=total_cargo,
            fleet_utilization=fleet_utilization,
            demands_met=demands_met,
            unmet_demand=unmet_demand,
            demand_satisfaction_rate=demand_satisfaction_rate,
            cost_breakdown=result_cost_breakdown,
            recommendations=recommendations
        )
    
    async def _generate_vessel_schedules(
        self, 
        selected_routes: List[Dict[str, Any]], 
        vessels: List[HPCLVessel]
    ) -> List[VesselSchedule]:
        """
        Generate detailed vessel schedules for Gantt chart
        """
        vessel_schedules = []
        
        for vessel in vessels:
            vessel_routes = [
                route for route in selected_routes 
                if route['vessel_id'] == vessel.id
            ]
            
            # Create activities for this vessel
            activities = []
            current_time = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)  # Start of current month
            
            for route in vessel_routes:
                for execution in range(route.get('execution_count', 1)):
                    # ── Loading activity ──────────────────────────────────────────────
                    # BUG-M2 fix: compute loading duration from PS data (capacity / rate)
                    # instead of the previous hardcoded 12 hours.
                    # loading_rate is in MT/hour from challenge_data.py (2000 MT/h).
                    vessel_cap = route.get('vessel_capacity_mt', 50000)
                    # BUG-M1 FIX: The schedule builder previously searched 'vessels' (HPCLVessel objects)
                    # for a loading_rate attribute — vessels don't have loading_rate, only ports do.
                    # Fix: use the challenge_data default directly (2000 MT/h = challenge_data.py value).
                    loading_duration = vessel_cap / 2000.0  # hours = MT / (MT/h)
                    # (2000 MT/h is the loading_rate for all loading ports per challenge_data.py)

                    loading_end = current_time + timedelta(hours=loading_duration)
                    
                    activities.append(VoyageActivity(
                        activity_type=ActivityType.LOADING,
                        start_time=current_time,
                        end_time=loading_end,
                        location=route['loading_port'],
                        description=f"Loading cargo at {route['loading_port']}",
                        # BUG-M6 fix: 'charter_cost' is the correct key (no per-activity cost in PS)
                        cost=route.get('cost_breakdown', {}).get('charter_cost', 0)
                    ))
                    
                    current_time = loading_end
                    
                    # Sailing activities to each discharge port
                    # Use module-level constants imported from route_generator at top of file.
                    # Avoids recreating the full dict on every voyage in the schedule loop.
                    _ltu = TRIP_TIMES_LOAD_TO_UNLOAD
                    _utu = TRIP_TIMES_UNLOAD_TO_UNLOAD
                    # BUG-M6 FIX: Guard against UnboundLocalError if route has 0 discharge ports.
                    # unloading_end is defined inside the loop; initialise before the loop
                    # so the outer `current_time = unloading_end` below is always safe.
                    unloading_end = current_time  # fallback: no-op if discharge_ports is empty
                    for i, discharge_port in enumerate(route['discharge_ports']):
                        if i == 0:
                            seg_days = _ltu.get(route['loading_port'], {}).get(discharge_port, 0.5)
                        else:
                            prev_port = route['discharge_ports'][i - 1]
                            seg_days = _utu.get(prev_port, {}).get(discharge_port, 0.2)
                        sailing_duration = seg_days * 24.0  # convert to hours
                        sailing_end = current_time + timedelta(hours=sailing_duration)
                        
                        activities.append(VoyageActivity(
                            activity_type=ActivityType.SAILING,
                            start_time=current_time,
                            end_time=sailing_end,
                            location="at_sea",
                            description=f"Sailing to {discharge_port}",
                            # 'fuel_cost_informational' is the correct key in route cost_breakdown
                            cost=route.get('cost_breakdown', {}).get('fuel_cost_informational', 0) / max(1, len(route['discharge_ports']))
                        ))
                        
                        current_time = sailing_end
                        
                        # BUG-M2 fix: compute unloading duration from PS data (cargo / rate)
                        # instead of the previous hardcoded 8 hours.
                        # unloading_rate is 1500 MT/h from challenge_data.py.
                        cargo_for_port = route.get('cargo_per_port', {}).get(discharge_port, vessel_cap / len(route['discharge_ports']))
                        unloading_duration = cargo_for_port / 1500.0  # hours = MT / (MT/h)
                        unloading_end = current_time + timedelta(hours=unloading_duration)
                        
                        activities.append(VoyageActivity(
                            activity_type=ActivityType.UNLOADING,
                            start_time=current_time,
                            end_time=unloading_end,
                            location=discharge_port,
                            description=f"Unloading cargo at {discharge_port}",
                            # BUG-M6 fix: port_charges_informational is closest informational key
                            cost=route.get('cost_breakdown', {}).get('port_charges_informational', 0) / len(route['discharge_ports'])
                        ))
                        
                    current_time = unloading_end
                    
                    # BUG-M2 fix: Removed hardcoded 6-hour idle period between voyages.
                    # The PS does not specify idle/turnaround time. Idle time is not
                    # part of the PS cost model (charter cost only). Vessel schedules
                    # show activities back-to-back without artificial idle padding.
            
            # Calculate summary metrics
            # Use execution_count so repeated route patterns are counted as separate trips
            total_voyages = sum(route.get('execution_count', 1) for route in vessel_routes)
            total_cargo_mt = sum(route.get('scaled_cargo', 0) for route in vessel_routes)
            total_distance_nm = sum(route.get('scaled_distance', 0) for route in vessel_routes)
            total_cost = sum(route.get('scaled_cost', 0) for route in vessel_routes)
            
            # Calculate utilization
            working_hours = sum(
                (activity.end_time - activity.start_time).total_seconds() / 3600
                for activity in activities
                if activity.activity_type != ActivityType.IDLE
            )
            utilization_percentage = (working_hours / vessel.monthly_available_hours * 100) if vessel.monthly_available_hours > 0 else 0
            
            vessel_schedules.append(VesselSchedule(
                vessel_id=vessel.id,
                vessel_name=vessel.name,
                # BUG-C3 fix: was hardcoded "2025-11"; now uses dynamic current month
                month=datetime.now().strftime("%Y-%m"),
                activities=activities,
                total_voyages=total_voyages,
                total_cargo_mt=total_cargo_mt,
                total_distance_nm=total_distance_nm,
                total_cost=total_cost,
                utilization_percentage=min(100, utilization_percentage)
            ))
        
        return vessel_schedules
    
    def _calculate_fleet_utilization(
        self, 
        vessel_schedules: List[VesselSchedule], 
        vessels: List[HPCLVessel]
    ) -> float:
        """
        Calculate overall fleet utilization percentage
        """
        if not vessel_schedules or not vessels:
            return 0.0
        
        total_available_hours = sum(vessel.monthly_available_hours for vessel in vessels)
        total_utilized_hours = sum(
            schedule.utilization_percentage * vessels[i].monthly_available_hours / 100
            for i, schedule in enumerate(vessel_schedules)
            if i < len(vessels)
        )
        
        return (total_utilized_hours / total_available_hours * 100) if total_available_hours > 0 else 0.0
    
    def _generate_recommendations(
        self,
        selected_routes: List[Dict[str, Any]],
        demands_met: Dict[str, float],
        unmet_demand: Dict[str, float],
        fleet_utilization: float
    ) -> List[str]:
        """
        Generate AI recommendations based on optimization results
        """
        recommendations = []
        
        # Fleet utilization recommendations
        if fleet_utilization < 70:
            recommendations.append("Fleet utilization is low ({}%). Consider reducing fleet size or seeking additional cargo opportunities.".format(int(fleet_utilization)))
        elif fleet_utilization > 95:
            recommendations.append("Fleet utilization is very high ({}%). Consider adding vessels or increasing voyage efficiency.".format(int(fleet_utilization)))
        
        # Demand satisfaction recommendations
        total_unmet = sum(unmet_demand.values())
        if total_unmet > 0:
            recommendations.append(f"Unmet demand of {total_unmet:.0f} MT detected. Consider spot chartering or rescheduling voyages.")
        
        # Cost efficiency recommendations
        if selected_routes:
            avg_cost_per_mt = sum(route.get('cost_per_mt', 0) for route in selected_routes) / len(selected_routes)
            if avg_cost_per_mt > 2500:
                recommendations.append(f"Average cost per MT is high (₹{avg_cost_per_mt:.0f}). Review fuel efficiency and port charges.")
        
        # Route optimization recommendations
        route_count = len(selected_routes)
        if route_count < 15:
            recommendations.append("Limited route diversity. Consider generating more alternative routes for better optimization.")
        
        if not recommendations:
            recommendations.append("Optimization results look good. Current fleet deployment appears efficient.")
        
        return recommendations
    
    def _create_infeasibility_result(
        self, 
        total_demand: float, 
        total_capacity: float,
        demand_dict: Dict[str, float],
        vessels: List[HPCLVessel],
        start_time: float
    ) -> OptimizationResult:
        """
        Create result when problem is infeasible with detailed explanation
        """
        capacity_gap = total_demand - total_capacity
        
        recommendations = [
            f"⚠️ INFEASIBLE: Total demand ({total_demand:,.0f} MT) cannot be met within the monthly time budget.",
            f"Fleet can deliver at most {total_capacity:,.0f} MT given the 720-hour/month constraint and PS trip times.",
            f"Shortfall: {capacity_gap:,.0f} MT",
            f"Suggested solutions:",
            f"  1. Charter additional vessel(s) — minimum additional capacity needed: {capacity_gap:,.0f} MT over the month",
            f"  2. The 720 h/month time budget (not a voyage count) is the binding constraint — shorter routes help",
            f"  3. Multi-loading port operations are already restricted to single loading port per voyage (PS constraint)",
            f"  4. Reduce demand at highest-demand ports: " + ", ".join(
                f"{port_id} ({demand:,.0f} MT)" 
                for port_id, demand in sorted(demand_dict.items(), key=lambda x: -x[1])[:3]
            )
        ]
        
        return OptimizationResult(
            request_id=f"hpcl_infeasible_{int(time.time())}",
            month=datetime.now().strftime("%Y-%m"),
            optimization_status="infeasible",
            solve_time_seconds=time.time() - start_time,
            selected_routes=[],
            vessel_schedules=[],
            total_cost=0.0,
            total_distance_nm=0.0,
            total_cargo_mt=0.0,
            fleet_utilization=0.0,
            demands_met={port_id: 0.0 for port_id in demand_dict.keys()},
            unmet_demand=demand_dict.copy(),
            demand_satisfaction_rate=0.0,
            recommendations=recommendations
        )
    
    def _create_error_result(self, error_message: str, start_time: float) -> OptimizationResult:
        """
        Create error result when optimization fails
        """
        return OptimizationResult(
            request_id=f"hpcl_error_{int(time.time())}",
            month=datetime.now().strftime("%Y-%m"),
            optimization_status="error",
            solve_time_seconds=time.time() - start_time,
            selected_routes=[],
            vessel_schedules=[],
            total_cost=0.0,
            total_distance_nm=0.0,
            total_cargo_mt=0.0,
            fleet_utilization=0.0,
            demands_met={},
            unmet_demand={},
            demand_satisfaction_rate=0.0,
            recommendations=[f"Optimization failed: {error_message}"]
        )


# Initialize global optimizer
hpcl_cp_sat_optimizer = HPCLCPSATOptimizer()
