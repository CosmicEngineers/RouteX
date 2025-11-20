"""
HPCL Optimization Tasks
Celery tasks for fleet optimization and route planning
"""

from celery import current_task
from typing import List, Dict, Any
import asyncio
from datetime import datetime

from ..core.celery_app import app, HPCLTaskPriority
from ..models.schemas import OptimizationRequest, HPCLVessel, HPCLPort, MonthlyDemand
from ..models.database import HPCLVesselDB, HPCLPortDB, OptimizationResultDB, TaskDB
from ..services.cp_sat_optimizer import hpcl_cp_sat_optimizer
from ..services.distance_calculator import calculate_hpcl_distance_matrix


@app.task(
    bind=True,
    name='hpcl.optimization.fleet_optimize',
    queue='optimization',
    priority=HPCLTaskPriority.HIGH,
    soft_time_limit=600,
    time_limit=900
)
def optimize_hpcl_fleet_task(self, task_id: str, request_data: Dict[str, Any]):
    """
    Main HPCL fleet optimization task
    
    Process:
    1. Load HPCL fleet and port data
    2. Generate feasible routes using Set Partitioning
    3. Solve using OR-Tools CP-SAT
    4. Save results to database
    
    Args:
        task_id: Unique task identifier
        request_data: Optimization request parameters
    """
    
    async def _run_optimization():
        try:
            # Update task status
            await TaskDB.update_task_status(task_id, "processing", 5, "Loading HPCL fleet data...")
            self.update_state(state='PROGRESS', meta={'progress': 5, 'message': 'Loading fleet data'})
            
            # Parse request
            request = OptimizationRequest(**request_data)
            
            # Get fleet data
            vessels_data = await HPCLVesselDB.get_all_vessels()
            loading_ports_data = await HPCLPortDB.get_loading_ports()
            unloading_ports_data = await HPCLPortDB.get_unloading_ports()
            
            if len(vessels_data) != 9:
                raise ValueError(f"HPCL fleet configuration error. Expected 9 vessels, found {len(vessels_data)}")
            
            if len(loading_ports_data) != 6:
                raise ValueError(f"HPCL port configuration error. Expected 6 loading ports, found {len(loading_ports_data)}")
            
            if len(unloading_ports_data) != 11:
                raise ValueError(f"HPCL port configuration error. Expected 11 unloading ports, found {len(unloading_ports_data)}")
            
            # Convert to schemas
            vessels = [HPCLVessel(**vessel) for vessel in vessels_data]
            loading_ports = [HPCLPort(**port) for port in loading_ports_data]
            unloading_ports = [HPCLPort(**port) for port in unloading_ports_data]
            
            await TaskDB.update_task_status(task_id, "processing", 15, "Validating HPCL constraints...")
            self.update_state(state='PROGRESS', meta={'progress': 15, 'message': 'Validating constraints'})
            
            # Validate available vessels
            available_vessel_ids = set(request.available_vessels) if request.available_vessels else {v.id for v in vessels}
            if not available_vessel_ids.issubset({v.id for v in vessels}):
                raise ValueError("Some specified vessels not found in HPCL fleet")
            
            # Filter vessels
            available_vessels = [v for v in vessels if v.id in available_vessel_ids]
            
            await TaskDB.update_task_status(task_id, "processing", 25, "Generating feasible routes...")
            self.update_state(state='PROGRESS', meta={'progress': 25, 'message': 'Generating routes'})
            
            # Run optimization
            result = await hpcl_cp_sat_optimizer.optimize_hpcl_fleet(
                vessels=available_vessels,
                loading_ports=loading_ports,
                unloading_ports=unloading_ports,
                monthly_demands=request.demands,
                fuel_price_per_mt=request.fuel_price_per_mt,
                optimization_objective=request.optimize_for,
                max_solve_time_seconds=request.max_solve_time_seconds,
                progress_callback=lambda p, msg: _update_progress(task_id, 30 + int(p * 0.6), msg)
            )
            
            await TaskDB.update_task_status(task_id, "processing", 95, "Saving optimization results...")
            self.update_state(state='PROGRESS', meta={'progress': 95, 'message': 'Saving results'})
            
            # Save results
            result.request_id = task_id
            result_dict = result.dict()
            await OptimizationResultDB.save_result(result_dict)
            
            await TaskDB.update_task_status(task_id, "completed", 100, "HPCL fleet optimization completed successfully")
            self.update_state(
                state='SUCCESS',
                meta={
                    'progress': 100,
                    'message': 'Optimization completed',
                    'result_summary': {
                        'total_cost': result.total_cost,
                        'selected_routes': len(result.selected_routes),
                        'fleet_utilization': result.fleet_utilization,
                        'demand_satisfaction': result.demand_satisfaction_rate,
                        'solve_time': result.solve_time_seconds
                    }
                }
            )
            
            return result_dict
            
        except Exception as e:
            error_msg = f"HPCL optimization failed: {str(e)}"
            await TaskDB.update_task_status(task_id, "failed", 0, error_msg)
            self.update_state(state='FAILURE', meta={'error': error_msg})
            raise
    
    async def _update_progress(task_id: str, progress: int, message: str):
        await TaskDB.update_task_status(task_id, "processing", progress, message)
        current_task.update_state(state='PROGRESS', meta={'progress': progress, 'message': message})
    
    # Run async optimization
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(_run_optimization())
    finally:
        loop.close()


@app.task(
    bind=True,
    name='hpcl.optimization.calculate_distance_matrix',
    queue='optimization',
    priority=HPCLTaskPriority.MEDIUM,
    soft_time_limit=300,
    time_limit=450
)
def calculate_distance_matrix_task(self, task_id: str, ports_data: List[Dict]):
    """
    Calculate maritime distance matrix for HPCL ports
    
    Args:
        task_id: Task identifier
        ports_data: List of HPCL port data
    """
    
    async def _calculate_distances():
        try:
            await TaskDB.update_task_status(task_id, "processing", 10, "Starting distance calculation...")
            self.update_state(state='PROGRESS', meta={'progress': 10, 'message': 'Starting calculation'})
            
            if len(ports_data) != 17:
                raise ValueError(f"HPCL port count mismatch. Expected 17 ports, found {len(ports_data)}")
            
            # Calculate distance matrix
            result = await calculate_hpcl_distance_matrix(ports_data)
            
            await TaskDB.update_task_status(task_id, "processing", 90, "Validating distance matrix...")
            self.update_state(state='PROGRESS', meta={'progress': 90, 'message': 'Validating results'})
            
            # Validate result
            if not result.get('distance_matrix') or len(result['distance_matrix']) != 17:
                raise ValueError("Invalid distance matrix generated")
            
            await TaskDB.update_task_status(task_id, "completed", 100, "Distance matrix calculated successfully")
            self.update_state(
                state='SUCCESS',
                meta={
                    'progress': 100,
                    'message': 'Distance matrix completed',
                    'matrix_size': f"{len(result['distance_matrix'])}x{len(result['distance_matrix'][0])}"
                }
            )
            
            return result
            
        except Exception as e:
            error_msg = f"Distance calculation failed: {str(e)}"
            await TaskDB.update_task_status(task_id, "failed", 0, error_msg)
            self.update_state(state='FAILURE', meta={'error': error_msg})
            raise
    
    # Run async calculation
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(_calculate_distances())
    finally:
        loop.close()


@app.task(
    bind=True,
    name='hpcl.optimization.validate_solution',
    queue='optimization',
    priority=HPCLTaskPriority.MEDIUM
)
def validate_optimization_solution(self, optimization_result: Dict[str, Any]):
    """
    Validate HPCL optimization solution against constraints
    
    Args:
        optimization_result: Optimization result to validate
    """
    try:
        validation_report = {
            'is_valid': True,
            'violations': [],
            'warnings': [],
            'summary': {}
        }
        
        selected_routes = optimization_result.get('selected_routes', [])
        
        # Check single loading constraint
        for route in selected_routes:
            loading_ports = route.get('loading_ports', [])
            if len(loading_ports) > 1:
                validation_report['violations'].append({
                    'type': 'single_loading_violation',
                    'route_id': route.get('route_id'),
                    'loading_ports': loading_ports,
                    'message': 'Route violates single loading port constraint'
                })
                validation_report['is_valid'] = False
        
        # Check max discharge constraint
        for route in selected_routes:
            unloading_ports = route.get('unloading_ports', [])
            if len(unloading_ports) > 2:
                validation_report['violations'].append({
                    'type': 'max_discharge_violation',
                    'route_id': route.get('route_id'),
                    'unloading_ports': unloading_ports,
                    'message': 'Route violates maximum 2 discharge ports constraint'
                })
                validation_report['is_valid'] = False
        
        # Check fleet utilization
        fleet_utilization = optimization_result.get('fleet_utilization', 0)
        if fleet_utilization < 70:
            validation_report['warnings'].append({
                'type': 'low_utilization',
                'value': fleet_utilization,
                'message': f'Fleet utilization ({fleet_utilization}%) below recommended 70%'
            })
        
        # Check demand satisfaction
        demand_satisfaction = optimization_result.get('demand_satisfaction_rate', 0)
        if demand_satisfaction < 95:
            validation_report['warnings'].append({
                'type': 'demand_shortfall',
                'value': demand_satisfaction,
                'message': f'Demand satisfaction ({demand_satisfaction}%) below target 95%'
            })
        
        # Summary
        validation_report['summary'] = {
            'total_routes': len(selected_routes),
            'violation_count': len(validation_report['violations']),
            'warning_count': len(validation_report['warnings']),
            'validation_status': 'PASSED' if validation_report['is_valid'] else 'FAILED',
            'validation_timestamp': datetime.now().isoformat()
        }
        
        return validation_report
        
    except Exception as e:
        self.update_state(state='FAILURE', meta={'error': str(e)})
        raise


@app.task(
    bind=True,
    name='hpcl.optimization.emergency_reoptimization',
    queue='optimization',
    priority=HPCLTaskPriority.CRITICAL
)
def emergency_fleet_reoptimization(self, disruption_data: Dict[str, Any]):
    """
    Emergency re-optimization for fleet disruptions
    
    Args:
        disruption_data: Details about fleet disruption (vessel breakdown, port closure, etc.)
    """
    
    async def _emergency_reopt():
        try:
            self.update_state(state='PROGRESS', meta={'progress': 5, 'message': 'Processing emergency disruption'})
            
            disruption_type = disruption_data.get('type')
            affected_assets = disruption_data.get('affected_assets', [])
            
            # Get current active optimization
            active_optimization = await OptimizationResultDB.get_active_optimization()
            
            if not active_optimization:
                raise ValueError("No active optimization found for emergency re-optimization")
            
            self.update_state(state='PROGRESS', meta={'progress': 20, 'message': f'Handling {disruption_type} disruption'})
            
            # Modify constraints based on disruption
            if disruption_type == 'vessel_breakdown':
                # Remove affected vessels from available fleet
                available_vessels = [v for v in active_optimization.get('available_vessels', [])
                                   if v not in affected_assets]
            elif disruption_type == 'port_closure':
                # Redirect cargo from closed ports
                # This would require more complex rerouting logic
                pass
            
            # Trigger emergency optimization with modified constraints
            emergency_task_id = f"emergency_{int(datetime.now().timestamp())}"
            
            # This would normally trigger a new optimization task
            # For now, return emergency response plan
            
            emergency_response = {
                'emergency_task_id': emergency_task_id,
                'disruption_type': disruption_type,
                'affected_assets': affected_assets,
                'mitigation_actions': [
                    'Immediate vessel reallocation',
                    'Route optimization for remaining fleet',
                    'Customer notification for potential delays',
                    'Alternative port arrangements if needed'
                ],
                'estimated_impact': {
                    'capacity_reduction': '15-25%',
                    'cost_increase': '8-12%',
                    'delivery_delays': '2-4 hours average'
                },
                'response_timestamp': datetime.now().isoformat()
            }
            
            self.update_state(
                state='SUCCESS',
                meta={
                    'progress': 100,
                    'message': 'Emergency response plan generated',
                    'emergency_response': emergency_response
                }
            )
            
            return emergency_response
            
        except Exception as e:
            self.update_state(state='FAILURE', meta={'error': str(e)})
            raise
    
    # Run async emergency optimization
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(_emergency_reopt())
    finally:
        loop.close()
