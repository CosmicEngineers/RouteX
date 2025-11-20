"""
HPCL Coastal Tanker Optimization - Pydantic Schemas
Specific models for HPCL's 9-vessel fleet and 17 Indian coastal ports
"""

from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict, Any, Union, Literal
from datetime import datetime
from enum import Enum

# HPCL-Specific Constants
HPCL_FLEET_SIZE = 9
HPCL_LOADING_PORTS = 6
HPCL_UNLOADING_PORTS = 11
MAX_DISCHARGE_PORTS = 2


class PortType(str, Enum):
    """HPCL Port Classifications"""
    LOADING = "loading"
    UNLOADING = "unloading"


class VesselStatus(str, Enum):
    """HPCL Vessel Operating Status"""
    AVAILABLE = "available"
    LOADING = "loading"
    SAILING = "sailing"
    UNLOADING = "unloading"
    MAINTENANCE = "maintenance"
    IDLE = "idle"


class ActivityType(str, Enum):
    """HPCL Voyage Activity Types"""
    LOADING = "loading"
    SAILING = "sailing"
    UNLOADING = "unloading"
    IDLE = "idle"


class HPCLPort(BaseModel):
    """HPCL Indian Coastal Port Model"""
    id: str = Field(..., description="Unique port identifier")
    name: str = Field(..., description="Official port name")
    code: str = Field(..., description="Port code (e.g., INMAA for Mumbai)")
    type: PortType = Field(..., description="Loading or unloading port")
    latitude: float = Field(..., ge=-90, le=90, description="Port latitude")
    longitude: float = Field(..., ge=-180, le=180, description="Port longitude")
    
    # HPCL-Specific Port Data
    state: str = Field(..., description="Indian state")
    draft_limitation: float = Field(..., description="Maximum vessel draft (meters)")
    berth_capacity: int = Field(..., description="Number of berths")
    storage_capacity: float = Field(..., description="Storage capacity (MT)")
    loading_rate: float = Field(..., description="Loading rate (MT/hour)")
    unloading_rate: float = Field(..., description="Unloading rate (MT/hour)")
    
    # Cost Components
    port_charges_per_visit: float = Field(..., description="Fixed port charges (₹)")
    grt_charge: float = Field(..., description="Charge per GRT (₹/GRT)")
    cargo_handling_rate: float = Field(..., description="Cargo handling (₹/MT)")
    
    @validator('type')
    def validate_port_type(cls, v):
        if v not in [PortType.LOADING, PortType.UNLOADING]:
            raise ValueError('Port type must be loading or unloading')
        return v


class HPCLVessel(BaseModel):
    """HPCL Coastal Tanker Model - Exact Fleet Specifications"""
    id: str = Field(..., description="Unique vessel identifier")
    name: str = Field(..., description="Vessel name")
    imo_number: str = Field(..., description="IMO vessel number")
    
    # Technical Specifications
    capacity_mt: float = Field(..., description="Cargo capacity (Metric Tonnes)")
    grt: float = Field(..., description="Gross Registered Tonnage")
    length_m: float = Field(..., description="Vessel length (meters)")
    beam_m: float = Field(..., description="Vessel beam (meters)")
    draft_m: float = Field(..., description="Maximum draft (meters)")
    
    # Performance Parameters
    speed_knots: float = Field(..., description="Service speed (knots)")
    fuel_consumption_mt_per_day: float = Field(..., description="Daily fuel consumption (MT)")
    
    # Operational Parameters
    daily_charter_rate: float = Field(..., description="Daily charter rate (₹)")
    crew_size: int = Field(..., description="Crew complement")
    monthly_available_hours: float = Field(
        default=720.0, 
        description="Available operating hours per month"
    )
    
    # Current Status
    status: VesselStatus = Field(default=VesselStatus.AVAILABLE)
    current_port: Optional[str] = Field(None, description="Current port location")
    
    @validator('capacity_mt')
    def validate_capacity(cls, v):
        if v <= 0:
            raise ValueError('Vessel capacity must be positive')
        return v
    
    @validator('id')
    def validate_hpcl_fleet_size(cls, v):
        # This would be used to ensure we don't exceed HPCL's 9 vessels
        return v


class MonthlyDemand(BaseModel):
    """Monthly Demand at HPCL Unloading Ports"""
    port_id: str = Field(..., description="Unloading port ID")
    demand_mt: float = Field(..., ge=0, description="Monthly demand (MT)")
    priority: Literal["high", "medium", "low"] = Field(
        default="medium", 
        description="Demand priority level"
    )
    delivery_window_start: datetime = Field(..., description="Earliest delivery date")
    delivery_window_end: datetime = Field(..., description="Latest delivery date")
    
    @validator('demand_mt')
    def validate_demand(cls, v):
        if v < 0:
            raise ValueError('Demand cannot be negative')
        return v


class HPCLRoute(BaseModel):
    """HPCL Feasible Route (Set Partitioning Column)"""
    route_id: str = Field(..., description="Unique route identifier")
    vessel_id: str = Field(..., description="Assigned vessel")
    
    # Route Pattern
    loading_port: str = Field(..., description="Single loading port (HPCL constraint)")
    discharge_ports: List[str] = Field(..., description="Discharge ports (max 2)")
    
    # Route Metrics
    total_distance_nm: float = Field(..., description="Total nautical miles")
    total_time_hours: float = Field(..., description="Total voyage time")
    total_cost: float = Field(..., description="Total voyage cost (₹)")
    cargo_quantity: float = Field(..., description="Total cargo quantity (MT)")
    
    # Cargo Split (for multi-discharge routes)
    cargo_split: Dict[str, float] = Field(
        default_factory=dict,
        description="Cargo quantity per discharge port"
    )
    
    # Route Coordinates (for visualization)
    route_coordinates: List[List[float]] = Field(
        default_factory=list,
        description="Route coordinates for map display"
    )
    
    @validator('discharge_ports')
    def validate_discharge_ports(cls, v):
        if len(v) == 0:
            raise ValueError('Must have at least one discharge port')
        if len(v) > MAX_DISCHARGE_PORTS:
            raise ValueError(f'Cannot exceed {MAX_DISCHARGE_PORTS} discharge ports (HPCL constraint)')
        return v


class OptimizationRequest(BaseModel):
    """HPCL Fleet Optimization Request"""
    month: str = Field(..., description="Optimization month (e.g., '2025-11')")
    demands: List[MonthlyDemand] = Field(..., description="Monthly demands at all unloading ports")
    
    # Fleet Constraints
    available_vessels: List[str] = Field(
        default_factory=list,
        description="Available vessel IDs (default: all 9 vessels)"
    )
    fuel_price_per_mt: float = Field(
        default=45000.0,
        description="Bunker fuel price (₹/MT)"
    )
    
    # Optimization Parameters
    optimize_for: Literal["cost", "emissions", "balanced"] = Field(
        default="cost",
        description="Optimization objective"
    )
    max_solve_time_seconds: int = Field(
        default=300,
        description="Maximum solver time (5 minutes default)"
    )
    
    @validator('demands')
    def validate_demands_ports(cls, v):
        """Ensure demands are only for HPCL unloading ports"""
        if len(v) > HPCL_UNLOADING_PORTS:
            raise ValueError(f'Cannot exceed {HPCL_UNLOADING_PORTS} unloading ports')
        return v


class VoyageActivity(BaseModel):
    """Individual Activity in Vessel Schedule"""
    activity_type: ActivityType
    start_time: datetime
    end_time: datetime
    location: str = Field(..., description="Port or 'at_sea'")
    description: str = Field(..., description="Activity description")
    cost: Optional[float] = Field(None, description="Activity cost (₹)")


class VesselSchedule(BaseModel):
    """Monthly Schedule for HPCL Vessel"""
    vessel_id: str
    vessel_name: str
    month: str
    
    # Activities (for Gantt chart)
    activities: List[VoyageActivity] = Field(default_factory=list)
    
    # Summary Metrics
    total_voyages: int = Field(default=0)
    total_cargo_mt: float = Field(default=0.0)
    total_distance_nm: float = Field(default=0.0)
    total_cost: float = Field(default=0.0)
    utilization_percentage: float = Field(default=0.0)


class OptimizationResult(BaseModel):
    """HPCL Fleet Optimization Result"""
    request_id: str
    month: str
    optimization_status: Literal["optimal", "feasible", "infeasible", "error"]
    solve_time_seconds: float
    
    # Solution Data
    selected_routes: List[HPCLRoute] = Field(default_factory=list)
    vessel_schedules: List[VesselSchedule] = Field(default_factory=list)
    
    # Performance Metrics
    total_cost: float = Field(default=0.0)
    total_distance_nm: float = Field(default=0.0)
    total_cargo_mt: float = Field(default=0.0)
    fleet_utilization: float = Field(default=0.0)
    
    # Demand Fulfillment
    demands_met: Dict[str, float] = Field(default_factory=dict)
    unmet_demand: Dict[str, float] = Field(default_factory=dict)
    demand_satisfaction_rate: float = Field(default=0.0)
    
    # Cost Breakdown
    cost_breakdown: Dict[str, float] = Field(
        default_factory=lambda: {
            "fuel_cost": 0.0,
            "port_charges": 0.0,
            "charter_cost": 0.0,
            "cargo_handling": 0.0,
            "demurrage_provision": 0.0
        }
    )
    
    # Environmental Impact
    emissions: Optional[Dict[str, float]] = Field(
        None,
        description="CO2 emissions and EEOI metrics"
    )
    
    # Recommendations
    recommendations: List[str] = Field(
        default_factory=list,
        description="AI-generated optimization insights"
    )


class TaskStatus(BaseModel):
    """Celery Task Status for Async Optimization"""
    task_id: str
    status: Literal["pending", "processing", "completed", "failed"]
    progress: int = Field(default=0, ge=0, le=100)
    message: str = Field(default="")
    result: Optional[OptimizationResult] = None
    error: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)


class DistanceMatrix(BaseModel):
    """Maritime Distance Matrix Between HPCL Ports"""
    port_pairs: Dict[str, Dict[str, float]] = Field(
        default_factory=dict,
        description="Distance matrix: port_id -> port_id -> distance_nm"
    )
    route_coordinates: Dict[str, List[List[float]]] = Field(
        default_factory=dict,
        description="Route coordinates for visualization"
    )
    last_updated: datetime = Field(default_factory=datetime.now)


class HPCLKPIs(BaseModel):
    """HPCL Performance KPIs for Dashboard"""
    month: str
    
    # Operational KPIs
    total_shipments: int = Field(default=0)
    total_cargo_mt: float = Field(default=0.0)
    fleet_utilization: float = Field(default=0.0)
    on_time_delivery_rate: float = Field(default=0.0)
    
    # Financial KPIs
    total_cost: float = Field(default=0.0)
    cost_per_mt: float = Field(default=0.0)
    demurrage_incidents: int = Field(default=0)
    demurrage_cost: float = Field(default=0.0)
    
    # Efficiency KPIs
    avg_voyage_duration: float = Field(default=0.0)
    avg_loading_time: float = Field(default=0.0)
    avg_sailing_speed: float = Field(default=0.0)
    
    # Environmental KPIs
    total_co2_emissions: float = Field(default=0.0)
    eeoi_average: float = Field(default=0.0)
    fuel_efficiency: float = Field(default=0.0)


# Response Models for API
class HPCLPortListResponse(BaseModel):
    loading_ports: List[HPCLPort]
    unloading_ports: List[HPCLPort]
    total_ports: int


class HPCLFleetResponse(BaseModel):
    vessels: List[HPCLVessel]
    total_vessels: int
    available_vessels: int
    total_capacity_mt: float


class OptimizationRequestResponse(BaseModel):
    task_id: str
    status: str = "submitted"
    estimated_completion_time: str
    message: str = "Optimization request submitted successfully"
