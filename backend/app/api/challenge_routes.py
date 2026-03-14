"""
HPCL Challenge 7.1 - Specific API Routes for Hackathon Output Format
Returns results in the exact format expected by the challenge
"""

from fastapi import APIRouter, HTTPException, Body
from typing import List, Dict, Any, Optional
from datetime import datetime
from pydantic import BaseModel

from ..data.challenge_data import (
    get_challenge_vessels,
    get_challenge_loading_ports,
    get_challenge_unloading_ports,
    get_monthly_demands,
    get_challenge_trip_times_load_to_unload,
    get_challenge_trip_times_unload_to_unload
)
from ..models.schemas import HPCLVessel, HPCLPort, MonthlyDemand
from ..services.cp_sat_optimizer import HPCLCPSATOptimizer

router = APIRouter(prefix="/challenge", tags=["Challenge 7.1"])


class VesselInput(BaseModel):
    id: str
    capacity_mt: int
    charter_rate_cr_per_day: float


class DemandInput(BaseModel):
    port_id: str
    demand_mt: int


class OptimizationInput(BaseModel):
    vessels: Optional[List[VesselInput]] = None
    demands: Optional[List[DemandInput]] = None
    round_trip: Optional[bool] = False
    optimization_objective: Optional[str] = "cost"  # cost, emissions, time, balanced


@router.get("/data")
async def get_challenge_data():
    """
    Get all Challenge 7.1 input data in structured format
    """
    return {
        "vessels": get_challenge_vessels(),
        "loading_ports": get_challenge_loading_ports(),
        "unloading_ports": get_challenge_unloading_ports(),
        "demands": get_monthly_demands(),
        "trip_times_load_unload": get_challenge_trip_times_load_to_unload(),
        "trip_times_unload_unload": get_challenge_trip_times_unload_to_unload()
    }


@router.post("/optimize")
async def run_challenge_optimization(input_data: OptimizationInput = Body(default=None)):
    """
    Run optimization using CP-SAT solver and return results in Challenge 7.1 format:
    
    Output format:
    Source | Destination | Tanker | Volume (MT) | Trip Cost (Rs Cr)
    
    Accepts optional custom vessel and demand data
    """
    try:
        # Use custom input if provided, otherwise use default challenge data
        if input_data and input_data.vessels:
            vessels_data = [v.dict() for v in input_data.vessels]
        else:
            vessels_data = get_challenge_vessels()
        
        if input_data and input_data.demands:
            demands_data = [d.dict() for d in input_data.demands]
        else:
            demands_data = get_monthly_demands()
        
        # Get loading and unloading ports
        loading_ports_data = get_challenge_loading_ports()
        unloading_ports_data = get_challenge_unloading_ports()
        
        # Convert simplified vessel data to full HPCLVessel model with defaults
        vessels = []
        for v in vessels_data:
            vessel_id = v.get("id", f"T{len(vessels)+1}")
            # Bug 13 fix: use vessel-specific fuel consumption per PS
            # T8 and T9 are 25,000 MT vessels with lower fuel consumption (15 MT/day)
            # T1-T7 are 50,000 MT vessels (25 MT/day)
            if vessel_id in ("T8", "T9"):
                default_fuel = 15.0
            else:
                default_fuel = 25.0
            vessel_dict = {
                "id": vessel_id,
                "name": v.get("id", f"Tanker {len(vessels)+1}"),
                "imo_number": f"IMO{9000000 + len(vessels)}",
                "capacity_mt": v.get("capacity_mt", 50000),
                "grt": int(v.get("capacity_mt", 50000) * 0.6),  # Approx GRT
                "length_m": 180.0,
                "beam_m": 32.0,
                "draft_m": 12.0,
                "speed_knots": 14.0,
                "fuel_consumption_mt_per_day": v.get("fuel_consumption_mt_per_day", default_fuel),
                "daily_charter_rate": v.get("charter_rate_cr_per_day", 0.5) * 10000000,  # Convert Cr to Rs
                "crew_size": 25,
                "status": "available",
                "current_port": None
            }
            vessels.append(HPCLVessel(**vessel_dict))
        
        loading_ports = [HPCLPort(**p) for p in loading_ports_data]
        unloading_ports = [HPCLPort(**p) for p in unloading_ports_data]
        monthly_demands = [MonthlyDemand(**d) for d in demands_data]
        
        # No pre-flight capacity check with magic-number multiplier.
        # Let the CP-SAT solver determine feasibility via hard demand constraints.

        # Initialize CP-SAT optimizer with quick profile for web UI
        optimizer = HPCLCPSATOptimizer(solver_profile="quick")
        
        # Get optimization objective
        optimization_objective = "cost"
        if input_data and input_data.optimization_objective:
            optimization_objective = input_data.optimization_objective
        
        # Run CP-SAT optimization.
        # Increase solve time for better solution quality (was 15s — often too short for complex problems).
        optimization_result = await optimizer.optimize_hpcl_fleet(
            vessels=vessels,
            loading_ports=loading_ports,
            unloading_ports=unloading_ports,
            monthly_demands=monthly_demands,
            fuel_price_per_mt=45000.0,
            optimization_objective=optimization_objective,
            max_solve_time_seconds=60  # 60s for better solution quality
        )
        
        # Check if optimization was successful
        if optimization_result.optimization_status == "infeasible":
            return {
                "status": "infeasible",
                "error": "No feasible solution found - demands cannot be satisfied with available fleet",
                "recommendations": optimization_result.recommendations,
                "unmet_demand": optimization_result.unmet_demand,
                "timestamp": datetime.now().isoformat()
            }
        
        if optimization_result.optimization_status == "error":
            return {
                "status": "error",
                "error": "Optimization failed",
                "recommendations": optimization_result.recommendations,
                "timestamp": datetime.now().isoformat()
            }
        
        # Convert CP-SAT results to Challenge 7.1 output format
        output_table = []
        trips = []  # Group routes into trips for HPCL format
        total_hpcl_cost_cr = 0.0
        trip_counter = 1
        
        for route in optimization_result.selected_routes:
            execution_count = route.execution_count
            
            for trip_num in range(execution_count):
                # Get route details (HPCLRoute Pydantic model)
                loading_port = route.loading_port
                discharge_ports = route.discharge_ports
                vessel_id = route.vessel_id
                cargo_quantity = route.cargo_quantity
                total_time_hours = route.total_time_hours
                cargo_split = route.cargo_split
                
                # HPCL cost calculation: Charter rate × trip duration (days)
                trip_duration_days = total_time_hours / 24.0
                
                # Get vessel charter rate (in Cr/day)
                vessel_charter_rate_cr_per_day = 0.5  # Default
                matching_vessel = [v for v in vessels if v.id == vessel_id]
                if matching_vessel:
                    vessel_charter_rate_cr_per_day = matching_vessel[0].daily_charter_rate / 10000000
                
                hpcl_trip_cost_cr = trip_duration_days * vessel_charter_rate_cr_per_day
                total_hpcl_cost_cr += hpcl_trip_cost_cr
                
                # Create trip object for grouped display
                trip_obj = {
                    "trip_id": f"Trip {trip_counter}",
                    "vessel_id": vessel_id,
                    "loading_port": loading_port,
                    "discharge_ports": discharge_ports,
                    "trip_duration_days": round(trip_duration_days, 2),
                    "hpcl_charter_cost_cr": round(hpcl_trip_cost_cr, 4),
                    "cargo_deliveries": []
                }
                
                # Each output row shows this port's proportional share of the trip cost.
                # For a 1-port trip: row cost == full trip cost.
                # For a 2-port trip: each row shows half the trip cost.
                # This ensures the "Trip Cost" column sums to the correct total
                # without double-counting trips that serve two discharge ports.
                num_ports = len(discharge_ports)
                for discharge_port in discharge_ports:
                    # Actual cargo for this port from solver (via cargo_per_port)
                    # M2 follow-up: selected_routes are now HPCLRoute objects; per-port cargo
                    # is in cargo_split (renamed from the old raw-dict key cargo_per_port).
                    cargo_per_port = route.cargo_split if route.cargo_split else {}
                    volume = cargo_per_port.get(discharge_port, int(cargo_quantity / num_ports))

                    output_table.append({
                        "Source": loading_port,
                        "Destination": discharge_port,
                        "Tanker": vessel_id,
                        "Volume (MT)": int(volume),
                        "Trip Cost (Rs Cr)": round(hpcl_trip_cost_cr / num_ports, 4),
                        "Trip ID": trip_obj["trip_id"]
                    })

                    trip_obj["cargo_deliveries"].append({
                        "port": discharge_port,
                        "volume_mt": int(volume)
                    })
                
                trips.append(trip_obj)
                trip_counter += 1
        
        # Calculate summary statistics (no post-processing needed - solver satisfies demand exactly)
        total_volume = sum(row["Volume (MT)"] for row in output_table)
        total_hpcl_cost_cr = total_hpcl_cost_cr  # Already calculated above
        total_demand = sum(d.demand_mt for d in monthly_demands)  # Compute inline (pre-flight check removed)

        return {
            "status": "success",
            "solution_id": optimization_result.request_id,
            "optimization_status": optimization_result.optimization_status,
            "solve_time_seconds": round(optimization_result.solve_time_seconds, 2),
            "optimization_results": output_table,
            "trips": trips,  # Grouped trip data for HPCL display
            "summary": {
                "total_trips": len(trips),
                "total_routes": len(output_table),  # Total delivery rows
                "hpcl_transportation_cost_cr": round(total_hpcl_cost_cr, 4),  # Primary HPCL KPI
                "total_cost_cr": round(total_hpcl_cost_cr, 4),  # Alias for compatibility
                "total_volume_mt": total_volume,
                "total_demand_mt": total_demand,
                "satisfied_demand_mt": total_volume,
                "demand_satisfaction_percentage": round((total_volume / total_demand) * 100, 2) if total_demand > 0 else 0,
                "fleet_utilization": round(optimization_result.fleet_utilization, 2),
                "round_trip": input_data.round_trip if input_data else False
            },
            "kpis": {
                "total_cost": optimization_result.total_cost,
                "total_distance_nm": optimization_result.total_distance_nm,
                "total_cargo_mt": optimization_result.total_cargo_mt,
                "fleet_utilization": optimization_result.fleet_utilization,
                "demand_satisfaction_rate": optimization_result.demand_satisfaction_rate
            },
            "recommendations": optimization_result.recommendations,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Optimization failed: {str(e)}")


@router.get("/output-format")
async def get_output_format_example():
    """
    Returns example output in Challenge 7.1 expected format
    """
    return {
        "format_description": "Challenge 7.1 Output Format",
        "columns": ["Source", "Destination", "Tanker", "Volume (MT)", "Trip Cost (Rs Cr)"],
        "example_rows": [
            {
                "Source": "L1",
                "Destination": "U1",
                "Tanker": "T1",
                "Volume (MT)": 40000,
                "Trip Cost (Rs Cr)": 0.504
            },
            {
                "Source": "L2",
                "Destination": "U2",
                "Tanker": "T2",
                "Volume (MT)": 50000,
                "Trip Cost (Rs Cr)": 0.539
            }
        ],
        "notes": [
            "Each row represents cargo delivery from one loading port to one unloading port",
            "A tanker loading from one port and discharging at two ports will have two rows",
            "Trip Cost per row = (Charter Hire Rate × Total Trip Duration) / number of discharge ports",
            "Summing the Trip Cost column gives the correct total transportation cost"
        ]
    }
