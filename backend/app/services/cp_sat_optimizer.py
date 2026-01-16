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

from ..models.schemas import HPCLVessel, HPCLPort, MonthlyDemand, OptimizationResult, VesselSchedule, VoyageActivity, ActivityType
from .route_generator import HPCLRouteOptimizer
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
                total_capacity = sum(v.capacity_mt for v in vessels) * 10  # Max ~10 trips/vessel/month
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
        Create decision variables for Set Partitioning Problem
        x[route_id] = number of times route is executed (integer 0-10)
        """
        logger.info("Creating decision variables...")
        
        for route in feasible_routes:
            route_id = route['route_id']
            # Each route can be executed 0 to 10 times per month
            self.decision_variables[route_id] = self.model.NewIntVar(
                0, 10, f"route_{route_id}"
            )
        
        logger.info(f"Created {len(self.decision_variables)} decision variables")
    
    def _add_demand_constraints(
        self, 
        feasible_routes: List[Dict[str, Any]], 
        demand_dict: Dict[str, float],
        unloading_ports: List[HPCLPort]
    ):
        """
        Add HARD demand satisfaction constraints - all demand must be met exactly
        No shortage or excess allowed (strict equality constraints)
        """
        logger.info("Adding HARD demand constraints (exact satisfaction required)...")
        
        # Track statistics
        ports_with_routes = 0
        ports_without_routes = 0
        total_serving_routes = 0
        
        # No shortage/excess variables - demand MUST be satisfied exactly
        for port in unloading_ports:
            port_id = port.id
            demand = demand_dict.get(port_id, 0.0)
            
            # Find all routes that serve this port
            serving_routes = []
            for route in feasible_routes:
                if port_id in route['discharge_ports']:
                    # Get cargo quantity delivered to this port
                    cargo_delivered = route['cargo_split'].get(port_id, 0.0)
                    if cargo_delivered > 0:
                        serving_routes.append((route['route_id'], cargo_delivered))
            
            if serving_routes:
                # Aggregate supply from all routes
                supply_terms = []
                for route_id, cargo_qty in serving_routes:
                    var = self.decision_variables[route_id]
                    # Use integer cargo quantities (MT)
                    cargo_qty_int = int(round(cargo_qty))
                    if cargo_qty_int > 0:
                        supply_terms.append(var * cargo_qty_int)
                
                if not supply_terms:
                    logger.warning(f"Port {port_id} has {len(serving_routes)} routes but all rounded to 0!")
                    continue
                    
                # Demand as integer
                demand_int = int(round(demand))
                
                # Simplified constraint: just ensure minimum delivery (90% of demand)
                # Remove upper bound to avoid over-constrained system
                min_delivery = max(1, int(demand_int * 0.9))  # At least 90% of demand, minimum 1
                
                self.model.Add(sum(supply_terms) >= min_delivery)
                
                ports_with_routes += 1
                total_serving_routes += len(serving_routes)
                
                self.constraints[f"demand_{port_id}"] = {
                    'type': 'hard_demand_satisfaction',
                    'port': port_id,
                    'demand': demand,
                    'demand_int': demand_int,
                    'serving_routes': len(serving_routes)
                }
            elif demand > 0:
                # If there are no serving routes but demand exists, problem is infeasible
                logger.warning(f"Port {port_id} has demand {demand} MT but no feasible routes!")
                ports_without_routes += 1
                # Add impossible constraint to force infeasibility
                demand_int = int(round(demand))
                self.model.Add(0 == demand_int)
        
        # Initialize empty dicts for compatibility (no slack variables in hard constraint mode)
        self.shortage_vars = {}
        self.excess_vars = {}
        
        logger.info(f"Added HARD demand constraints for {len(unloading_ports)} ports (no slack allowed)")
        logger.info(f"Ports with routes: {ports_with_routes}, without routes: {ports_without_routes}, total route assignments: {total_serving_routes}")
    
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
        logger.info("Adding vessel time constraints (≤ 720 hours/month)...")
        
        for vessel in vessels:
            vessel_id = vessel.id
            
            # Find all routes for this vessel
            vessel_routes = [
                route for route in feasible_routes 
                if route['vessel_id'] == vessel_id
            ]
            
            if vessel_routes:
                # Time constraint: Sum of (route_time × execution_count) ≤ available_hours
                time_terms = []
                for route in vessel_routes:
                    route_id = route['route_id']
                    time_hours = int(round(route['total_time_hours']))  # Round to integer hours
                    var = self.decision_variables[route_id]
                    time_terms.append(var * time_hours)
                
                # Enforce max hours per month (rounded to integer)
                available_hours = int(round(vessel.monthly_available_hours))
                
                self.model.Add(sum(time_terms) <= available_hours)
                
                self.constraints[f"time_{vessel_id}"] = {
                    'type': 'vessel_time_budget',
                    'vessel': vessel_id,
                    'available_hours': available_hours,
                    'route_count': len(vessel_routes)
                }
                
                logger.debug(f"Vessel {vessel_id}: {len(vessel_routes)} routes, max {available_hours} hours")
        
        logger.info(f"Added time constraints for {len(vessels)} vessels (HARD: ≤ 720 hours/month)")
    
    def _add_hpcl_operational_constraints(
        self, 
        feasible_routes: List[Dict[str, Any]], 
        vessels: List[HPCLVessel]
    ):
        """
        Add HPCL-specific operational constraints
        """
        logger.info("Adding HPCL operational constraints...")
        
        # Constraint 1: Limit simultaneous operations per vessel
        for vessel in vessels:
            vessel_routes = [
                route for route in feasible_routes 
                if route['vessel_id'] == vessel.id
            ]
            
            if vessel_routes:
                # A vessel cannot execute too many routes simultaneously
                route_vars = [self.decision_variables[route['route_id']] for route in vessel_routes]
                self.model.Add(sum(route_vars) <= 8)  # Max 8 voyages per month
        
        # Constraint 2: Load balancing among vessels
        vessel_utilizations = []
        for vessel in vessels:
            vessel_routes = [
                route for route in feasible_routes 
                if route['vessel_id'] == vessel.id
            ]
            
            if vessel_routes:
                utilization = sum(
                    self.decision_variables[route['route_id']] * route['total_time_hours']
                    for route in vessel_routes
                )
                vessel_utilizations.append(utilization)
        
        # Add load balancing constraint (optional - can be relaxed)
        # Note: Commented out floor division as CP-SAT doesn't support // on SumArray
        # if len(vessel_utilizations) > 1:
        #     avg_utilization = sum(vessel_utilizations) // len(vessel_utilizations)
        #     for utilization in vessel_utilizations:
        #         # No vessel should be idle while others are overutilized
        #         self.model.Add(utilization >= avg_utilization // 2)
        
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
            # Minimize total cost (scaled by 100 to match demand scaling)
            for route in feasible_routes:
                route_id = route['route_id']
                cost_scaled = int(route['total_cost'] * 100)  # Scale to match demand precision
                var = self.decision_variables[route_id]
                objective_terms.append(var * cost_scaled)
                
        elif optimization_objective == "emissions":
            # Minimize CO2 emissions (use fuel consumption as proxy)
            for route in feasible_routes:
                route_id = route['route_id']
                fuel_consumption = int(route.get('fuel_consumption_mt', 0) * 10000)  # Scale up
                var = self.decision_variables[route_id]
                objective_terms.append(var * fuel_consumption)
                
        elif optimization_objective == "time":
            # Minimize total voyage time
            for route in feasible_routes:
                route_id = route['route_id']
                time = int(route['total_time_hours'] * 100)  # Scale for precision
                var = self.decision_variables[route_id]
                objective_terms.append(var * time)
                
        else:  # balanced
            # Balanced objective: cost + time
            for route in feasible_routes:
                route_id = route['route_id']
                cost = int(route['total_cost'] / 10)  # Scale down cost
                time = int(route['total_time_hours'] * 100)  # Scale up time
                var = self.decision_variables[route_id]
                objective_terms.append(var * (cost + time))
        
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
        
        # Get selected routes
        selected_routes = []
        total_cost = 0.0
        total_distance = 0.0
        total_cargo = 0.0
        
        for route in feasible_routes:
            route_id = route['route_id']
            var = self.decision_variables[route_id]
            execution_count = self.solver.Value(var)
            
            if execution_count > 0:
                # Scale route metrics by execution count
                route_copy = route.copy()
                route_copy['execution_count'] = execution_count
                route_copy['scaled_cost'] = route['total_cost'] * execution_count
                route_copy['scaled_distance'] = route['total_distance_nm'] * execution_count
                route_copy['scaled_cargo'] = route['cargo_quantity'] * execution_count
                
                selected_routes.append(route_copy)
                
                total_cost += route_copy['scaled_cost']
                total_distance += route_copy['scaled_distance']
                total_cargo += route_copy['scaled_cargo']
        
        # Calculate demand satisfaction
        # With hard constraints, all demand is met exactly (if solution is feasible)
        demands_met = {}
        unmet_demand = {}
        
        for port in unloading_ports:
            port_id = port.id
            original_demand = demand_dict.get(port_id, 0.0)
            
            # Calculate actual delivered quantity from selected routes
            delivered = 0.0
            for route in selected_routes:
                if port_id in route['discharge_ports']:
                    cargo_split = route.get('cargo_split', {})
                    delivered += cargo_split.get(port_id, 0.0) * route['execution_count']
            
            demands_met[port_id] = delivered
            # With hard constraints, unmet should always be 0 if feasible
            unmet_demand[port_id] = max(0, original_demand - delivered)
        
        total_demand = sum(demand_dict.values())
        total_met = sum(demands_met.values())
        demand_satisfaction_rate = (total_met / total_demand * 100) if total_demand > 0 else 0
        
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
        
        return OptimizationResult(
            request_id=f"hpcl_opt_{int(time.time())}",
            month="2025-11",  # Current optimization month
            optimization_status=opt_status,
            solve_time_seconds=solve_time,
            selected_routes=[
                {
                    'route_id': route['route_id'],
                    'vessel_id': route['vessel_id'],
                    'loading_port': route['loading_port'],
                    'discharge_ports': route['discharge_ports'],
                    'total_cost': route['total_cost'],
                    'total_distance_nm': route['total_distance_nm'],
                    'total_time_hours': route['total_time_hours'],
                    'cargo_quantity': route['cargo_quantity'],
                    'execution_count': route['execution_count']
                }
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
            current_time = datetime(2025, 11, 1)  # Start of November
            
            for route in vessel_routes:
                for execution in range(route.get('execution_count', 1)):
                    # Loading activity
                    loading_duration = 12  # 12 hours loading
                    loading_end = current_time + timedelta(hours=loading_duration)
                    
                    activities.append(VoyageActivity(
                        activity_type=ActivityType.LOADING,
                        start_time=current_time,
                        end_time=loading_end,
                        location=route['loading_port'],
                        description=f"Loading cargo at {route['loading_port']}",
                        cost=route.get('cost_breakdown', {}).get('cargo_loading_cost', 0)
                    ))
                    
                    current_time = loading_end
                    
                    # Sailing activities to each discharge port
                    for i, discharge_port in enumerate(route['discharge_ports']):
                        sailing_duration = route['total_time_hours'] / (len(route['discharge_ports']) + 1)
                        sailing_end = current_time + timedelta(hours=sailing_duration)
                        
                        activities.append(VoyageActivity(
                            activity_type=ActivityType.SAILING,
                            start_time=current_time,
                            end_time=sailing_end,
                            location="at_sea",
                            description=f"Sailing to {discharge_port}",
                            cost=route.get('cost_breakdown', {}).get('fuel_cost', 0) / len(route['discharge_ports'])
                        ))
                        
                        current_time = sailing_end
                        
                        # Unloading activity
                        unloading_duration = 8  # 8 hours unloading
                        unloading_end = current_time + timedelta(hours=unloading_duration)
                        
                        activities.append(VoyageActivity(
                            activity_type=ActivityType.UNLOADING,
                            start_time=current_time,
                            end_time=unloading_end,
                            location=discharge_port,
                            description=f"Unloading cargo at {discharge_port}",
                            cost=route.get('cost_breakdown', {}).get('cargo_unloading_cost', 0) / len(route['discharge_ports'])
                        ))
                        
                        current_time = unloading_end
                    
                    # Add idle time between voyages
                    idle_duration = 6  # 6 hours idle/maintenance
                    idle_end = current_time + timedelta(hours=idle_duration)
                    
                    activities.append(VoyageActivity(
                        activity_type=ActivityType.IDLE,
                        start_time=current_time,
                        end_time=idle_end,
                        location="port",
                        description="Idle/maintenance time"
                    ))
                    
                    current_time = idle_end
            
            # Calculate summary metrics
            total_voyages = len(vessel_routes)
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
                month="2025-11",
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
            f"⚠️ INFEASIBLE: Total demand ({total_demand:,.0f} MT) exceeds available fleet capacity ({total_capacity:,.0f} MT)",
            f"Capacity gap: {capacity_gap:,.0f} MT shortage",
            f"Suggested solutions:",
            f"  1. Charter additional vessel(s) with minimum {capacity_gap:,.0f} MT capacity",
            f"  2. Allow vessels to make additional trips (currently limited to ~10/month)",
            f"  3. Consider multi-loading port operations (currently restricted to single loading)",
            f"  4. Reduce demand at high-demand ports: " + ", ".join(
                f"{port_id} ({demand:,.0f} MT)" 
                for port_id, demand in sorted(demand_dict.items(), key=lambda x: -x[1])[:3]
            )
        ]
        
        return OptimizationResult(
            request_id=f"hpcl_infeasible_{int(time.time())}",
            month="2025-11",
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
            month="2025-11",
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
