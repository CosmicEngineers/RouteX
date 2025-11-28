"""
HPCL Coastal Tanker Optimization - Configuration Settings
Environment configuration for HPCL-specific settings
"""

from pydantic_settings import BaseSettings
from typing import List, Optional
import os


class HPCLSettings(BaseSettings):
    """
    HPCL Application Settings
    """
    
    # Application Settings
    app_name: str = "HPCL Coastal Tanker Fleet Optimizer"
    environment: str = "development"  # development, staging, production
    debug: bool = True
    version: str = "1.0.0"
    
    # API Settings
    api_prefix: str = "/api/v1"
    cors_origins: List[str] = [
        "http://localhost:3000",  # Next.js frontend local
        "http://localhost:3001",  # Development frontend
        "http://127.0.0.1:3000",
        "*"  # Allow all origins for deployment (can be restricted later)
    ]
    frontend_url: Optional[str] = None  # Set via environment variable in production
    
    # Database Settings
    mongodb_url: str = "mongodb://localhost:27017"
    database_name: str = "hpcl_coastal_optimizer"
    use_mongodb: bool = True
    
    # Redis Settings (for Celery)
    redis_url: str = "redis://localhost:6379/0"
    
    # Security Settings
    secret_key: str = "hpcl-coastal-optimizer-super-secret-key-change-in-production"
    api_keys: List[str] = ["hpcl-demo-key", "hpcl-admin-key"]
    
    # HPCL Fleet Configuration
    hpcl_fleet_size: int = 9
    hpcl_loading_ports: int = 6
    hpcl_unloading_ports: int = 11
    max_discharge_ports: int = 2
    single_loading_constraint: bool = True
    
    # Optimization Settings
    default_fuel_price_per_mt: float = 45000.0  # ₹45,000 per MT
    max_solve_time_seconds: int = 300  # 5 minutes
    default_optimization_objective: str = "cost"  # cost, emissions, time, balanced
    
    # External API Settings (optional)
    weather_api_key: Optional[str] = None
    mapbox_token: Optional[str] = None
    
    # Operational Settings
    monthly_available_hours_per_vessel: float = 720.0  # 30 days * 24 hours
    demurrage_rate_per_day: float = 25000.0  # ₹25,000 per day
    carbon_price_per_tonne: float = 2000.0  # ₹2,000 per tonne CO2
    
    # Performance Settings
    route_generation_cache_hours: int = 24
    distance_matrix_cache_hours: int = 168  # 7 days
    
    # Logging Settings
    log_level: str = "INFO"
    enable_request_logging: bool = True
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


# Global settings instance
_settings: Optional[HPCLSettings] = None


def get_settings() -> HPCLSettings:
    """
    Get application settings (singleton pattern)
    """
    global _settings
    if _settings is None:
        _settings = HPCLSettings()
    return _settings


# HPCL-Specific Constants
class HPCLConstants:
    """
    HPCL-specific operational constants
    """
    
    # Fleet Specifications
    FLEET_SIZE = 9
    LOADING_PORTS = [
        "mumbai", "kandla", "cochin", 
        "vishakhapatnam", "haldia", "paradip"
    ]
    UNLOADING_PORTS = [
        "chennai", "tuticorin", "mangalore", "new_mangalore",
        "karwar", "mormugao", "ratnagiri", "nhava_sheva",
        "hazira", "sikka", "okha"
    ]
    
    # Operational Constraints
    SINGLE_LOADING_RULE = True
    MAX_DISCHARGE_PORTS = 2
    MIN_CARGO_QUANTITY = 1000.0  # MT
    MAX_CARGO_QUANTITY = 50000.0  # MT
    
    # Cost Parameters
    BUNKER_FUEL_PRICE_RANGE = (40000.0, 50000.0)  # ₹ per MT
    TYPICAL_VOYAGE_DURATION = (24, 168)  # 1-7 days in hours
    PORT_CHARGES_RANGE = (50000.0, 200000.0)  # ₹ per port call
    
    # Performance Benchmarks
    TARGET_FLEET_UTILIZATION = 85.0  # %
    TARGET_COST_SAVINGS = 20.0  # % vs manual planning
    MAX_UNMET_DEMAND = 0.0  # MT (zero tolerance)
    
    # Environmental Targets
    TARGET_EEOI = 12.0  # gCO2/tonne-nm
    CARBON_REDUCTION_TARGET = 10.0  # % annual reduction
    
    # Time Constraints
    MAX_VOYAGE_TIME_HOURS = 240  # 10 days
    PORT_TIME_PER_CALL_HOURS = 8  # Loading/unloading time
    MAINTENANCE_TIME_PER_MONTH = 48  # 2 days maintenance
    
    @classmethod
    def get_fleet_capacity_range(cls) -> tuple:
        """Get typical fleet capacity range"""
        return (15000.0, 45000.0)  # MT per vessel
    
    @classmethod
    def get_speed_range(cls) -> tuple:
        """Get typical vessel speed range"""
        return (10.0, 16.0)  # knots
    
    @classmethod
    def validate_hpcl_constraints(cls, **kwargs) -> bool:
        """Validate that parameters meet HPCL constraints"""
        vessel_count = kwargs.get('vessel_count', 0)
        discharge_ports = kwargs.get('discharge_ports', 0)
        loading_ports = kwargs.get('loading_ports', 0)
        
        return (
            vessel_count <= cls.FLEET_SIZE and
            discharge_ports <= cls.MAX_DISCHARGE_PORTS and
            loading_ports == 1 if cls.SINGLE_LOADING_RULE else True
        )
