"""
HPCL Coastal Tanker Optimization - API Routes
HPCL-specific endpoints for fleet optimization and analytics
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from typing import List, Dict, Any, Optional
import uuid
import time
from datetime import datetime

from ..models.schemas import (
    OptimizationRequest, OptimizationResult, OptimizationRequestResponse,
    HPCLVessel, HPCLPort, MonthlyDemand, HPCLKPIs,
    HPCLPortListResponse, HPCLFleetResponse, TaskStatus
)
from ..models.database import (
    HPCLVesselDB, HPCLPortDB, OptimizationResultDB, TaskDB,
    check_database_health
)
from ..services.cp_sat_optimizer import hpcl_cp_sat_optimizer
from ..services.distance_calculator import calculate_hpcl_distance_matrix
from ..services.eeoi_calculator import hpcl_eeoi_calculator
from ..core.config import get_settings

router = APIRouter()
settings = get_settings()


# ==== HEALTH AND STATUS ENDPOINTS ====

@router.get("/status", tags=["System"])
async def get_system_status():
    """
    Get HPCL system status and capabilities
    """
    db_health = await check_database_health()
    
    return {
        "service": "HPCL Coastal Tanker Fleet Optimizer",
        "version": settings.version,
        "status": "operational",
        "capabilities": {
            "fleet_optimization": True,
            "route_generation": True,
            "cost_calculation": True,
            "emission_tracking": True,
            "demand_satisfaction": True,
            "real_time_processing": True
        },
        "hpcl_configuration": {
            "fleet_size": settings.hpcl_fleet_size,
            "loading_ports": settings.hpcl_loading_ports,
            "unloading_ports": settings.hpcl_unloading_ports,
            "max_discharge_ports": settings.max_discharge_ports,
            "single_loading_rule": settings.single_loading_constraint
        },
        "database": db_health,
        "last_updated": datetime.now().isoformat()
    }


# ==== FLEET MANAGEMENT ENDPOINTS ====

@router.get("/fleet", response_model=HPCLFleetResponse, tags=["Fleet Management"])
async def get_hpcl_fleet():
    """
    Get HPCL's 9-vessel coastal tanker fleet
    """
    try:
        vessels_data = await HPCLVesselDB.get_all_vessels()
        available_vessels_data = await HPCLVesselDB.get_available_vessels()
        
        vessels = [HPCLVessel(**vessel) for vessel in vessels_data]
        total_capacity = sum(vessel.capacity_mt for vessel in vessels)
        
        return HPCLFleetResponse(
            vessels=vessels,
            total_vessels=len(vessels),
            available_vessels=len(available_vessels_data),
            total_capacity_mt=total_capacity
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve HPCL fleet: {str(e)}")


@router.get("/fleet/vessel/{vessel_id}", response_model=HPCLVessel, tags=["Fleet Management"])
async def get_vessel_details(vessel_id: str):
    """
    Get detailed information about specific HPCL vessel
    """
    try:
        vessel_data = await HPCLVesselDB.get_vessel(vessel_id)
        if not vessel_data:
            raise HTTPException(status_code=404, detail=f"Vessel {vessel_id} not found")
        
        return HPCLVessel(**vessel_data)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve vessel details: {str(e)}")


@router.put("/fleet/vessel/{vessel_id}/status", tags=["Fleet Management"])
async def update_vessel_status(vessel_id: str, status: str, current_port: Optional[str] = None):
    """
    Update HPCL vessel operational status
    """
    try:
        result = await HPCLVesselDB.update_vessel_status(vessel_id, status, current_port)
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail=f"Vessel {vessel_id} not found")
        
        return {
            "vessel_id": vessel_id,
            "status": status,
            "current_port": current_port,
            "updated_at": datetime.now().isoformat(),
            "message": "Vessel status updated successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update vessel status: {str(e)}")


# ==== PORT NETWORK ENDPOINTS ====

@router.get("/ports", response_model=HPCLPortListResponse, tags=["Port Network"])
async def get_hpcl_ports():
    """
    Get HPCL's Indian coastal port network (6 loading + 11 unloading)
    """
    try:
        loading_ports_data = await HPCLPortDB.get_loading_ports()
        unloading_ports_data = await HPCLPortDB.get_unloading_ports()
        
        loading_ports = [HPCLPort(**port) for port in loading_ports_data]
        unloading_ports = [HPCLPort(**port) for port in unloading_ports_data]
        
        return HPCLPortListResponse(
            loading_ports=loading_ports,
            unloading_ports=unloading_ports,
            total_ports=len(loading_ports) + len(unloading_ports)
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve HPCL ports: {str(e)}")


@router.get("/ports/loading", tags=["Port Network"])
async def get_loading_ports():
    """
    Get HPCL's 6 loading ports
    """
    try:
        ports_data = await HPCLPortDB.get_loading_ports()
        return [HPCLPort(**port) for port in ports_data]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve loading ports: {str(e)}")


@router.get("/ports/unloading", tags=["Port Network"])
async def get_unloading_ports():
    """
    Get HPCL's 11 unloading ports
    """
    try:
        ports_data = await HPCLPortDB.get_unloading_ports()
        return [HPCLPort(**port) for port in ports_data]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve unloading ports: {str(e)}")


@router.post("/ports/distance-matrix", tags=["Port Network"])
async def calculate_distance_matrix(background_tasks: BackgroundTasks):
    """
    Calculate maritime distance matrix between HPCL ports
    """
    try:
        # Get all ports
        all_ports_data = await HPCLPortDB.get_all_ports()
        
        if len(all_ports_data) < 17:
            raise HTTPException(
                status_code=400, 
                detail=f"Insufficient ports configured. Expected 17, found {len(all_ports_data)}"
            )
        
        # Calculate distance matrix in background
        task_id = str(uuid.uuid4())
        background_tasks.add_task(
            _calculate_distance_matrix_background,
            all_ports_data, task_id
        )
        
        return {
            "task_id": task_id,
            "status": "processing",
            "message": "Distance matrix calculation started",
            "ports_count": len(all_ports_data),
            "estimated_time_minutes": 3
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start distance calculation: {str(e)}")


# ==== OPTIMIZATION ENDPOINTS ====

@router.post("/optimize", response_model=OptimizationRequestResponse, tags=["Optimization"])
async def optimize_hpcl_fleet(
    request: OptimizationRequest,
    background_tasks: BackgroundTasks
):
    """
    **Main HPCL Fleet Optimization Endpoint**
    
    Optimizes HPCL's 9-vessel coastal tanker fleet using Set Partitioning algorithm.
    
    **Process:**
    1. Validates HPCL constraints (single loading + max 2 discharge)
    2. Generates ~726 feasible routes per vessel
    3. Solves using OR-Tools CP-SAT
    4. Returns optimal vessel schedules and cost breakdown
    
    **Response:** Task ID for async processing (typical solve time: 30-300 seconds)
    """
    try:
        # Validate request against HPCL constraints
        _validate_hpcl_optimization_request(request)
        
        # Generate unique task ID
        task_id = f"hpcl_opt_{int(time.time())}_{uuid.uuid4().hex[:8]}"
        
        # Create task record
        await TaskDB.create_task({
            "task_id": task_id,
            "status": "pending",
            "request_data": request.dict(),
            "progress": 0,
            "message": "Optimization request received"
        })
        
        # Start optimization in background
        background_tasks.add_task(
            _run_optimization_background,
            task_id, request
        )
        
        return OptimizationRequestResponse(
            task_id=task_id,
            status="submitted",
            estimated_completion_time=f"{request.max_solve_time_seconds + 60} seconds",
            message="HPCL fleet optimization started. Use task_id to check status."
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start optimization: {str(e)}")


@router.get("/optimize/task/{task_id}", response_model=TaskStatus, tags=["Optimization"])
async def get_optimization_status(task_id: str):
    """
    Get HPCL optimization task status and results
    """
    try:
        task_data = await TaskDB.get_task(task_id)
        
        if not task_data:
            raise HTTPException(status_code=404, detail=f"Task {task_id} not found")
        
        return TaskStatus(**task_data)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve task status: {str(e)}")


@router.get("/optimize/results/{request_id}", response_model=OptimizationResult, tags=["Optimization"])
async def get_optimization_result(request_id: str):
    """
    Get detailed HPCL optimization results
    """
    try:
        result_data = await OptimizationResultDB.get_result(request_id)
        
        if not result_data:
            raise HTTPException(status_code=404, detail=f"Results for request {request_id} not found")
        
        return OptimizationResult(**result_data)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve optimization results: {str(e)}")


# ==== ANALYTICS ENDPOINTS ====

@router.get("/analytics/kpis/{month}", response_model=HPCLKPIs, tags=["Analytics"])
async def get_monthly_kpis(month: str):
    """
    Get HPCL monthly performance KPIs
    Example month format: "2025-11"
    """
    try:
        # Get optimization results for the month
        results = await OptimizationResultDB.get_results_by_month(month)
        
        if not results:
            raise HTTPException(status_code=404, detail=f"No data found for month {month}")
        
        # Calculate KPIs from results
        kpis = _calculate_monthly_kpis(results, month)
        
        return HPCLKPIs(**kpis)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to calculate KPIs: {str(e)}")


@router.get("/analytics/cost-savings/{month}", tags=["Analytics"])
async def get_cost_savings_analysis(month: str):
    """
    Analyze HPCL cost savings vs manual planning
    """
    try:
        results = await OptimizationResultDB.get_results_by_month(month)
        
        if not results:
            raise HTTPException(status_code=404, detail=f"No data found for month {month}")
        
        # Calculate cost savings
        total_optimized_cost = sum(result.get('total_cost', 0) for result in results)
        
        # Estimate manual planning cost (typically 20% higher)
        estimated_manual_cost = total_optimized_cost * 1.20
        absolute_savings = estimated_manual_cost - total_optimized_cost
        percentage_savings = (absolute_savings / estimated_manual_cost * 100) if estimated_manual_cost > 0 else 0
        
        return {
            "month": month,
            "optimized_cost": total_optimized_cost,
            "estimated_manual_cost": estimated_manual_cost,
            "absolute_savings": absolute_savings,
            "percentage_savings": round(percentage_savings, 2),
            "monthly_savings": absolute_savings,
            "annual_projection": absolute_savings * 12,
            "analysis_date": datetime.now().isoformat(),
            "savings_breakdown": {
                "fuel_efficiency": absolute_savings * 0.4,
                "route_optimization": absolute_savings * 0.3,
                "demurrage_avoidance": absolute_savings * 0.2,
                "port_efficiency": absolute_savings * 0.1
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to analyze cost savings: {str(e)}")


@router.post("/analytics/emissions", tags=["Analytics"])
async def calculate_fleet_emissions(optimization_results: List[Dict[str, Any]]):
    """
    Calculate HPCL fleet EEOI emissions for optimization results
    """
    try:
        # Mock vessel data for calculation (should be retrieved from DB in production)
        mock_vessels = [
            HPCLVessel(
                id=f"hpcl_vessel_{i}",
                name=f"HPCL Tanker {i}",
                imo_number=f"IMO{1000000 + i}",
                capacity_mt=30000,
                grt=15000,
                length_m=180,
                beam_m=25,
                draft_m=12,
                speed_knots=14,
                fuel_consumption_mt_per_day=25,
                daily_charter_rate=75000
            ) for i in range(1, 10)
        ]
        
        # Convert results to OptimizationResult format
        result = OptimizationResult(
            request_id="emissions_calculation",
            month="2025-11",
            optimization_status="completed",
            solve_time_seconds=0,
            selected_routes=optimization_results,
            total_cost=sum(r.get('total_cost', 0) for r in optimization_results),
            fleet_utilization=85.0,
            demand_satisfaction_rate=100.0
        )
        
        # Calculate emissions
        emissions = hpcl_eeoi_calculator.calculate_fleet_eeoi(result, mock_vessels)
        
        return {
            "fleet_emissions": emissions,
            "compliance_report": hpcl_eeoi_calculator.generate_eeoi_compliance_report(emissions),
            "calculation_timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to calculate emissions: {str(e)}")


# ==== BACKGROUND TASKS ====

async def _calculate_distance_matrix_background(ports_data: List[Dict], task_id: str):
    """
    Background task for distance matrix calculation
    """
    try:
        await TaskDB.update_task_status(task_id, "processing", 10, "Starting distance calculation...")
        
        # Calculate distance matrix
        result = await calculate_hpcl_distance_matrix(ports_data)
        
        await TaskDB.update_task_status(task_id, "completed", 100, "Distance matrix calculated")
        await TaskDB.save_task_result(task_id, result)
        
    except Exception as e:
        await TaskDB.update_task_status(task_id, "failed", 0, f"Error: {str(e)}")


async def _run_optimization_background(task_id: str, request: OptimizationRequest):
    """
    Background task for HPCL fleet optimization
    """
    try:
        await TaskDB.update_task_status(task_id, "processing", 5, "Loading HPCL fleet data...")
        
        # Get fleet and ports data
        vessels_data = await HPCLVesselDB.get_all_vessels()
        loading_ports_data = await HPCLPortDB.get_loading_ports()
        unloading_ports_data = await HPCLPortDB.get_unloading_ports()
        
        vessels = [HPCLVessel(**vessel) for vessel in vessels_data]
        loading_ports = [HPCLPort(**port) for port in loading_ports_data]
        unloading_ports = [HPCLPort(**port) for port in unloading_ports_data]
        
        await TaskDB.update_task_status(task_id, "processing", 20, "Generating feasible routes...")
        
        # Run optimization
        result = await hpcl_cp_sat_optimizer.optimize_hpcl_fleet(
            vessels=vessels,
            loading_ports=loading_ports,
            unloading_ports=unloading_ports,
            monthly_demands=request.demands,
            fuel_price_per_mt=request.fuel_price_per_mt,
            optimization_objective=request.optimize_for,
            max_solve_time_seconds=request.max_solve_time_seconds
        )
        
        await TaskDB.update_task_status(task_id, "processing", 90, "Saving optimization results...")
        
        # Save results
        result.request_id = task_id
        result_dict = result.dict()
        await OptimizationResultDB.save_result(result_dict)
        
        await TaskDB.update_task_status(task_id, "completed", 100, "Optimization completed successfully")
        await TaskDB.save_task_result(task_id, result_dict)
        
    except Exception as e:
        await TaskDB.update_task_status(task_id, "failed", 0, f"Optimization failed: {str(e)}")


# ==== HELPER FUNCTIONS ====

def _validate_hpcl_optimization_request(request: OptimizationRequest):
    """
    Validate optimization request against HPCL constraints
    """
    # Check demand ports count
    if len(request.demands) > settings.hpcl_unloading_ports:
        raise HTTPException(
            status_code=400,
            detail=f"Too many demand ports. HPCL has {settings.hpcl_unloading_ports} unloading ports maximum."
        )
    
    # Check vessel availability
    if len(request.available_vessels) > settings.hpcl_fleet_size:
        raise HTTPException(
            status_code=400,
            detail=f"Too many vessels specified. HPCL fleet size is {settings.hpcl_fleet_size} vessels."
        )
    
    # Validate fuel price range
    if not (20000 <= request.fuel_price_per_mt <= 80000):
        raise HTTPException(
            status_code=400,
            detail="Fuel price out of reasonable range (₹20,000 - ₹80,000 per MT)"
        )


def _calculate_monthly_kpis(results: List[Dict[str, Any]], month: str) -> Dict[str, Any]:
    """
    Calculate monthly KPIs from optimization results
    """
    if not results:
        return {
            "month": month,
            "total_shipments": 0,
            "total_cargo_mt": 0.0,
            "fleet_utilization": 0.0,
            "on_time_delivery_rate": 0.0,
            "total_cost": 0.0,
            "cost_per_mt": 0.0,
            "demurrage_incidents": 0,
            "demurrage_cost": 0.0,
            "avg_voyage_duration": 0.0,
            "avg_loading_time": 0.0,
            "avg_sailing_speed": 0.0,
            "total_co2_emissions": 0.0,
            "eeoi_average": 0.0,
            "fuel_efficiency": 0.0
        }
    
    # Aggregate metrics
    total_cost = sum(result.get('total_cost', 0) for result in results)
    total_cargo = sum(result.get('total_cargo_mt', 0) for result in results)
    total_distance = sum(result.get('total_distance_nm', 0) for result in results)
    
    avg_fleet_utilization = sum(result.get('fleet_utilization', 0) for result in results) / len(results)
    avg_demand_satisfaction = sum(result.get('demand_satisfaction_rate', 0) for result in results) / len(results)
    
    return {
        "month": month,
        "total_shipments": len(results),
        "total_cargo_mt": total_cargo,
        "fleet_utilization": round(avg_fleet_utilization, 2),
        "on_time_delivery_rate": round(avg_demand_satisfaction, 2),
        "total_cost": total_cost,
        "cost_per_mt": round(total_cost / total_cargo, 2) if total_cargo > 0 else 0,
        "demurrage_incidents": 0,  # Would be calculated from vessel schedules
        "demurrage_cost": 0.0,
        "avg_voyage_duration": 0.0,  # Would be calculated from vessel schedules
        "avg_loading_time": 0.0,
        "avg_sailing_speed": round(total_distance / (total_distance / 14), 2) if total_distance > 0 else 0,  # Assume 14 knots avg
        "total_co2_emissions": 0.0,  # Would be calculated from EEOI
        "eeoi_average": 0.0,
        "fuel_efficiency": 0.0
    }
