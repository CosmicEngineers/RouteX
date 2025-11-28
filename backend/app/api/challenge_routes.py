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
    Run optimization and return results in Challenge 7.1 format:
    
    Output format:
    Source | Destination | Tanker | Volume (MT) | Trip Cost (Rs Cr)
    
    Accepts optional custom vessel and demand data
    """
    try:
        # Use custom input if provided, otherwise use default challenge data
        if input_data and input_data.vessels:
            vessels = [v.dict() for v in input_data.vessels]
        else:
            vessels = get_challenge_vessels()
        
        if input_data and input_data.demands:
            demands = [d.dict() for d in input_data.demands]
        else:
            demands = get_monthly_demands()
        
        # Get other data from challenge
        loading_ports = get_challenge_loading_ports()
        unloading_ports = get_challenge_unloading_ports()
        trip_times_lu = get_challenge_trip_times_load_to_unload()
        trip_times_uu = get_challenge_trip_times_unload_to_unload()
        
        # Create demand dictionary
        demand_dict = {d["port_id"]: d["demand_mt"] for d in demands}
        
        # Generate optimized routes (simple greedy algorithm for now)
        routes = []
        remaining_demand = demand_dict.copy()
        
        # Sort vessels by cost efficiency (charter rate / capacity)
        vessels_sorted = sorted(vessels, key=lambda v: v["charter_rate_cr_per_day"] / v["capacity_mt"])
        
        route_id = 1
        for vessel in vessels_sorted:
            vessel_capacity = vessel["capacity_mt"]
            vessel_id = vessel["id"]
            charter_rate = vessel["charter_rate_cr_per_day"]
            
            # Find best loading port and up to 2 unloading ports
            for load_port in loading_ports:
                load_id = load_port["id"]
                
                # Find unloading ports with remaining demand
                available_unload_ports = [
                    (uid, demand) for uid, demand in remaining_demand.items() if demand > 0
                ]
                
                if not available_unload_ports:
                    break
                
                # Sort by trip time from loading port
                available_unload_ports.sort(
                    key=lambda x: trip_times_lu.get(load_id, {}).get(x[0], 999)
                )
                
                # Select up to 2 discharge ports
                selected_ports = []
                remaining_capacity = vessel_capacity
                
                for unload_id, demand in available_unload_ports[:2]:
                    if remaining_capacity <= 0:
                        break
                    
                    # Allocate cargo
                    allocated = min(remaining_capacity, demand)
                    if allocated > 0:
                        selected_ports.append({
                            "port_id": unload_id,
                            "volume": allocated
                        })
                        remaining_capacity -= allocated
                
                if selected_ports:
                    # Calculate trip time and cost
                    total_trip_time = trip_times_lu.get(load_id, {}).get(selected_ports[0]["port_id"], 0.5)
                    
                    if len(selected_ports) > 1:
                        # Add inter-port sailing time
                        total_trip_time += trip_times_uu.get(
                            selected_ports[0]["port_id"], {}
                        ).get(selected_ports[1]["port_id"], 0.2)
                    
                    # Add loading/unloading time (assume 0.5 days total)
                    total_trip_time += 0.5
                    
                    # Calculate base trip cost for one-way
                    base_trip_cost = charter_rate * total_trip_time
                    
                    # If round trip, add return journey cost
                    if input_data and input_data.round_trip:
                        # Return trip from last discharge port back to loading port
                        last_discharge_port = selected_ports[-1]["port_id"]
                        return_time = trip_times_lu.get(load_id, {}).get(last_discharge_port, 0.5)
                        return_cost = charter_rate * return_time
                        total_trip_cost = base_trip_cost + return_cost
                        total_trip_time_with_return = total_trip_time + return_time
                    else:
                        total_trip_cost = base_trip_cost
                        total_trip_time_with_return = total_trip_time
                    
                    # Create route entries for each discharge port
                    for idx, port_info in enumerate(selected_ports):
                        routes.append({
                            "route_id": route_id,
                            "source": load_id,
                            "destination": port_info["port_id"],
                            "tanker": vessel_id,
                            "volume_mt": port_info["volume"],
                            "trip_cost_cr": round(total_trip_cost / len(selected_ports), 4),
                            "full_trip_cost_cr": round(total_trip_cost, 4) if idx == 0 else 0,  # Only count full cost once
                            "trip_time_days": round(total_trip_time_with_return, 2)
                        })
                        
                        # Update remaining demand
                        remaining_demand[port_info["port_id"]] -= port_info["volume"]
                    
                    route_id += 1
                    
                    # Check if all demand is satisfied
                    if all(d <= 0 for d in remaining_demand.values()):
                        break
            
            if all(d <= 0 for d in remaining_demand.values()):
                break
        
        # Calculate summary statistics
        total_cost = sum(r.get("full_trip_cost_cr", r["trip_cost_cr"]) for r in routes)
        total_volume = sum(r["volume_mt"] for r in routes)
        satisfied_demand = sum(demand_dict[uid] - max(0, remaining_demand.get(uid, 0)) for uid in demand_dict)
        
        # Format output in challenge format
        output_table = []
        for route in routes:
            output_table.append({
                "Source": route["source"],
                "Destination": route["destination"],
                "Tanker": route["tanker"],
                "Volume (MT)": route["volume_mt"],
                "Trip Cost (Rs Cr)": route["trip_cost_cr"]
            })
        
        return {
            "status": "success",
            "optimization_results": output_table,
            "summary": {
                "total_routes": len(routes),
                "total_cost_cr": round(total_cost, 2),
                "total_volume_mt": total_volume,
                "total_demand_mt": sum(demand_dict.values()),
                "satisfied_demand_mt": satisfied_demand,
                "demand_satisfaction_percentage": round((satisfied_demand / sum(demand_dict.values())) * 100, 2),
                "unsatisfied_ports": [uid for uid, demand in remaining_demand.items() if demand > 0],
                "round_trip": input_data.round_trip if input_data else False
            },
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
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
            "Trip Cost = Charter Hire Rate × Total Trip Duration (including loading, sailing, unloading)"
        ]
    }
