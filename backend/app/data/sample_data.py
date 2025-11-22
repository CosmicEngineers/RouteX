"""
HPCL Sample Data Generator
Creates realistic demo data for HPCL's 9-vessel coastal tanker fleet
"""

from typing import List, Dict, Any
import json
from datetime import datetime, timedelta
import random

from ..models.schemas import HPCLVessel, HPCLPort, MonthlyDemand
from .challenge_data import (
    get_challenge_vessels,
    get_challenge_loading_ports,
    get_challenge_unloading_ports,
    get_monthly_demands,
    get_challenge_trip_times_load_to_unload,
    get_challenge_trip_times_unload_to_unload
)


def generate_hpcl_sample_data() -> Dict[str, List[Dict]]:
    """
    Generate comprehensive sample data for HPCL coastal tanker operations
    Now using Challenge 7.1 exact specifications
    
    Returns:
        Dictionary containing vessels, ports, and demand data
    """
    
    # Use Challenge 7.1 data
    vessels_data = get_challenge_vessels()
    loading_ports_data = get_challenge_loading_ports()
    unloading_ports_data = get_challenge_unloading_ports()
    monthly_demands = get_monthly_demands()
    
    # Combine all ports
    ports_data = loading_ports_data + unloading_ports_data
    
    return {
        "vessels": vessels_data,
        "ports": ports_data,
        "loading_ports": loading_ports_data,
        "unloading_ports": unloading_ports_data,
        "demands": monthly_demands,
        "trip_times_load_unload": get_challenge_trip_times_load_to_unload(),
        "trip_times_unload_unload": get_challenge_trip_times_unload_to_unload()
    }


def generate_hpcl_sample_data_old() -> Dict[str, List[Dict]]:
    """
    OLD DEMO DATA - Keep for reference
    Generate comprehensive sample data for HPCL coastal tanker operations
    
    Returns:
        Dictionary containing vessels, ports, and demand data
    """
    
    # HPCL's 9-vessel coastal tanker fleet (OLD DEMO DATA)
    vessels_data = [
        {
            "id": "HPCL-CT-001",
            "name": "HPCL Coastal Spirit",
            "imo_number": "IMO9876543",
            "capacity_mt": 32000,
            "grt": 15800,
            "length_m": 182,
            "beam_m": 26,
            "draft_m": 12.5,
            "speed_knots": 14.5,
            "fuel_consumption_mt_per_day": 24.8,
            "daily_charter_rate": 78000,
            "status": "available",
            "current_port": "Mumbai",
            "last_updated": datetime.now().isoformat()
        },
        {
            "id": "HPCL-CT-002", 
            "name": "HPCL Ocean Pride",
            "imo_number": "IMO9876544",
            "capacity_mt": 28000,
            "grt": 13200,
            "length_m": 175,
            "beam_m": 24,
            "draft_m": 11.8,
            "speed_knots": 13.8,
            "fuel_consumption_mt_per_day": 22.5,
            "daily_charter_rate": 72000,
            "status": "sailing",
            "current_port": "Kandla",
            "last_updated": datetime.now().isoformat()
        },
        {
            "id": "HPCL-CT-003",
            "name": "HPCL Maritime Excel",
            "imo_number": "IMO9876545",
            "capacity_mt": 35000,
            "grt": 17500,
            "length_m": 190,
            "beam_m": 28,
            "draft_m": 13.2,
            "speed_knots": 15.2,
            "fuel_consumption_mt_per_day": 26.8,
            "daily_charter_rate": 82000,
            "status": "available", 
            "current_port": "Visakhapatnam",
            "last_updated": datetime.now().isoformat()
        },
        {
            "id": "HPCL-CT-004",
            "name": "HPCL Coastal Warrior",
            "imo_number": "IMO9876546",
            "capacity_mt": 30000,
            "grt": 14800,
            "length_m": 178,
            "beam_m": 25,
            "draft_m": 12.2,
            "speed_knots": 14.2,
            "fuel_consumption_mt_per_day": 23.5,
            "daily_charter_rate": 75000,
            "status": "available",
            "current_port": "Kochi",
            "last_updated": datetime.now().isoformat()
        },
        {
            "id": "HPCL-CT-005",
            "name": "HPCL Blue Navigator",
            "imo_number": "IMO9876547",
            "capacity_mt": 25000,
            "grt": 12000,
            "length_m": 168,
            "beam_m": 22,
            "draft_m": 11.2,
            "speed_knots": 13.5,
            "fuel_consumption_mt_per_day": 21.2,
            "daily_charter_rate": 68000,
            "status": "maintenance",
            "current_port": "Chennai",
            "last_updated": datetime.now().isoformat()
        },
        {
            "id": "HPCL-CT-006",
            "name": "HPCL Eastern Star",
            "imo_number": "IMO9876548",
            "capacity_mt": 33000,
            "grt": 16200,
            "length_m": 185,
            "beam_m": 26.5,
            "draft_m": 12.8,
            "speed_knots": 14.8,
            "fuel_consumption_mt_per_day": 25.5,
            "daily_charter_rate": 79000,
            "status": "available",
            "current_port": "Haldia",
            "last_updated": datetime.now().isoformat()
        },
        {
            "id": "HPCL-CT-007",
            "name": "HPCL Western Gem",
            "imo_number": "IMO9876549",
            "capacity_mt": 27000,
            "grt": 13800,
            "length_m": 172,
            "beam_m": 24.5,
            "draft_m": 11.5,
            "speed_knots": 13.9,
            "fuel_consumption_mt_per_day": 22.8,
            "daily_charter_rate": 71000,
            "status": "sailing",
            "current_port": "Goa",
            "last_updated": datetime.now().isoformat()
        },
        {
            "id": "HPCL-CT-008",
            "name": "HPCL Southern Belle",
            "imo_number": "IMO9876550",
            "capacity_mt": 29000,
            "grt": 14200,
            "length_m": 176,
            "beam_m": 25.2,
            "draft_m": 12.0,
            "speed_knots": 14.1,
            "fuel_consumption_mt_per_day": 23.2,
            "daily_charter_rate": 74000,
            "status": "available",
            "current_port": "Tuticorin",
            "last_updated": datetime.now().isoformat()
        },
        {
            "id": "HPCL-CT-009",
            "name": "HPCL Coastal Champion",
            "imo_number": "IMO9876551",
            "capacity_mt": 31000,
            "grt": 15200,
            "length_m": 180,
            "beam_m": 25.8,
            "draft_m": 12.3,
            "speed_knots": 14.4,
            "fuel_consumption_mt_per_day": 24.2,
            "daily_charter_rate": 76000,
            "status": "available",
            "current_port": "Paradip",
            "last_updated": datetime.now().isoformat()
        }
    ]
    
    # HPCL's Indian coastal port network
    ports_data = [
        # Loading Ports (6)
        {
            "id": "INMUN", 
            "name": "Mumbai",
            "type": "loading",
            "latitude": 18.9667,
            "longitude": 72.8333,
            "state": "Maharashtra",
            "region": "western",
            "berth_capacity": 4,
            "storage_capacity_mt": 150000,
            "draft_limit_m": 14.5,
            "loading_rate_mt_per_hour": 800,
            "unloading_rate_mt_per_hour": 0,
            "port_charges_per_mt": 285,
            "demurrage_rate_per_day": 25000,
            "weather_factor": 0.95,
            "congestion_factor": 1.1,
            "operational_hours": 24,
            "tide_dependent": False,
            "monsoon_restrictions": True
        },
        {
            "id": "INKAN",
            "name": "Kandla", 
            "type": "loading",
            "latitude": 23.0333,
            "longitude": 70.2167,
            "state": "Gujarat",
            "region": "western",
            "berth_capacity": 3,
            "storage_capacity_mt": 120000,
            "draft_limit_m": 13.8,
            "loading_rate_mt_per_hour": 750,
            "unloading_rate_mt_per_hour": 0,
            "port_charges_per_mt": 260,
            "demurrage_rate_per_day": 22000,
            "weather_factor": 0.98,
            "congestion_factor": 1.05,
            "operational_hours": 24,
            "tide_dependent": True,
            "monsoon_restrictions": False
        },
        {
            "id": "INVIZ",
            "name": "Visakhapatnam",
            "type": "loading",
            "latitude": 17.7,
            "longitude": 83.3,
            "state": "Andhra Pradesh", 
            "region": "eastern",
            "berth_capacity": 5,
            "storage_capacity_mt": 180000,
            "draft_limit_m": 15.2,
            "loading_rate_mt_per_hour": 850,
            "unloading_rate_mt_per_hour": 0,
            "port_charges_per_mt": 295,
            "demurrage_rate_per_day": 28000,
            "weather_factor": 0.92,
            "congestion_factor": 1.15,
            "operational_hours": 24,
            "tide_dependent": False,
            "monsoon_restrictions": True
        },
        {
            "id": "INHAL",
            "name": "Haldia",
            "type": "loading", 
            "latitude": 22.0667,
            "longitude": 88.1,
            "state": "West Bengal",
            "region": "eastern",
            "berth_capacity": 2,
            "storage_capacity_mt": 100000,
            "draft_limit_m": 12.8,
            "loading_rate_mt_per_hour": 700,
            "unloading_rate_mt_per_hour": 0,
            "port_charges_per_mt": 270,
            "demurrage_rate_per_day": 24000,
            "weather_factor": 0.89,
            "congestion_factor": 1.2,
            "operational_hours": 22,
            "tide_dependent": True,
            "monsoon_restrictions": True
        },
        {
            "id": "INPAR",
            "name": "Paradip",
            "type": "loading",
            "latitude": 20.2667,
            "longitude": 86.6167,
            "state": "Odisha",
            "region": "eastern",
            "berth_capacity": 3,
            "storage_capacity_mt": 110000,
            "draft_limit_m": 13.5,
            "loading_rate_mt_per_hour": 720,
            "unloading_rate_mt_per_hour": 0,
            "port_charges_per_mt": 275,
            "demurrage_rate_per_day": 23000,
            "weather_factor": 0.91,
            "congestion_factor": 1.12,
            "operational_hours": 24,
            "tide_dependent": False,
            "monsoon_restrictions": True
        },
        {
            "id": "INKOC",
            "name": "Kochi",
            "type": "loading",
            "latitude": 9.9667,
            "longitude": 76.2833,
            "state": "Kerala",
            "region": "southern",
            "berth_capacity": 2,
            "storage_capacity_mt": 85000,
            "draft_limit_m": 12.5,
            "loading_rate_mt_per_hour": 650,
            "unloading_rate_mt_per_hour": 0,
            "port_charges_per_mt": 255,
            "demurrage_rate_per_day": 21000,
            "weather_factor": 0.94,
            "congestion_factor": 1.08,
            "operational_hours": 20,
            "tide_dependent": False,
            "monsoon_restrictions": True
        },
        
        # Unloading Ports (11)
        {
            "id": "INCHE",
            "name": "Chennai",
            "type": "unloading",
            "latitude": 13.0833,
            "longitude": 80.2833,
            "state": "Tamil Nadu",
            "region": "southern",
            "berth_capacity": 3,
            "storage_capacity_mt": 95000,
            "draft_limit_m": 13.2,
            "loading_rate_mt_per_hour": 0,
            "unloading_rate_mt_per_hour": 720,
            "port_charges_per_mt": 245,
            "demurrage_rate_per_day": 20000,
            "weather_factor": 0.96,
            "congestion_factor": 1.05,
            "operational_hours": 22,
            "tide_dependent": False,
            "monsoon_restrictions": True
        },
        {
            "id": "INTUT",
            "name": "Tuticorin",
            "type": "unloading",
            "latitude": 8.8,
            "longitude": 78.15,
            "state": "Tamil Nadu",
            "region": "southern",
            "berth_capacity": 2,
            "storage_capacity_mt": 70000,
            "draft_limit_m": 12.8,
            "loading_rate_mt_per_hour": 0,
            "unloading_rate_mt_per_hour": 680,
            "port_charges_per_mt": 235,
            "demurrage_rate_per_day": 18000,
            "weather_factor": 0.97,
            "congestion_factor": 1.03,
            "operational_hours": 20,
            "tide_dependent": False,
            "monsoon_restrictions": False
        },
        {
            "id": "INCAL",
            "name": "Calicut",
            "type": "unloading",
            "latitude": 11.25,
            "longitude": 75.7833,
            "state": "Kerala",
            "region": "southern",
            "berth_capacity": 1,
            "storage_capacity_mt": 45000,
            "draft_limit_m": 11.5,
            "loading_rate_mt_per_hour": 0,
            "unloading_rate_mt_per_hour": 550,
            "port_charges_per_mt": 220,
            "demurrage_rate_per_day": 15000,
            "weather_factor": 0.93,
            "congestion_factor": 1.1,
            "operational_hours": 18,
            "tide_dependent": True,
            "monsoon_restrictions": True
        },
        {
            "id": "INMANG",
            "name": "Mangalore",
            "type": "unloading",
            "latitude": 12.85,
            "longitude": 74.85,
            "state": "Karnataka",
            "region": "southern",
            "berth_capacity": 2,
            "storage_capacity_mt": 65000,
            "draft_limit_m": 12.2,
            "loading_rate_mt_per_hour": 0,
            "unloading_rate_mt_per_hour": 600,
            "port_charges_per_mt": 240,
            "demurrage_rate_per_day": 17000,
            "weather_factor": 0.95,
            "congestion_factor": 1.07,
            "operational_hours": 20,
            "tide_dependent": False,
            "monsoon_restrictions": True
        },
        {
            "id": "INGOA",
            "name": "Goa",
            "type": "unloading",
            "latitude": 15.4833,
            "longitude": 73.8167,
            "state": "Goa",
            "region": "western",
            "berth_capacity": 1,
            "storage_capacity_mt": 35000,
            "draft_limit_m": 10.8,
            "loading_rate_mt_per_hour": 0,
            "unloading_rate_mt_per_hour": 480,
            "port_charges_per_mt": 210,
            "demurrage_rate_per_day": 14000,
            "weather_factor": 0.98,
            "congestion_factor": 1.02,
            "operational_hours": 16,
            "tide_dependent": True,
            "monsoon_restrictions": True
        },
        {
            "id": "INJAW",
            "name": "Jawaharlal Nehru Port",
            "type": "unloading",
            "latitude": 18.9333,
            "longitude": 72.95,
            "state": "Maharashtra",
            "region": "western",
            "berth_capacity": 4,
            "storage_capacity_mt": 125000,
            "draft_limit_m": 14.8,
            "loading_rate_mt_per_hour": 0,
            "unloading_rate_mt_per_hour": 780,
            "port_charges_per_mt": 290,
            "demurrage_rate_per_day": 26000,
            "weather_factor": 0.96,
            "congestion_factor": 1.12,
            "operational_hours": 24,
            "tide_dependent": False,
            "monsoon_restrictions": True
        },
        {
            "id": "INDAH",
            "name": "Dahej",
            "type": "unloading",
            "latitude": 21.7,
            "longitude": 72.6,
            "state": "Gujarat",
            "region": "western",
            "berth_capacity": 2,
            "storage_capacity_mt": 75000,
            "draft_limit_m": 13.0,
            "loading_rate_mt_per_hour": 0,
            "unloading_rate_mt_per_hour": 650,
            "port_charges_per_mt": 250,
            "demurrage_rate_per_day": 19000,
            "weather_factor": 0.99,
            "congestion_factor": 1.04,
            "operational_hours": 22,
            "tide_dependent": True,
            "monsoon_restrictions": False
        },
        {
            "id": "INORK",
            "name": "Okha",
            "type": "unloading", 
            "latitude": 22.4667,
            "longitude": 69.0833,
            "state": "Gujarat",
            "region": "western",
            "berth_capacity": 1,
            "storage_capacity_mt": 40000,
            "draft_limit_m": 11.2,
            "loading_rate_mt_per_hour": 0,
            "unloading_rate_mt_per_hour": 520,
            "port_charges_per_mt": 215,
            "demurrage_rate_per_day": 16000,
            "weather_factor": 0.97,
            "congestion_factor": 1.06,
            "operational_hours": 18,
            "tide_dependent": True,
            "monsoon_restrictions": False
        },
        {
            "id": "INENN",
            "name": "Ennore",
            "type": "unloading",
            "latitude": 13.2167,
            "longitude": 80.3167,
            "state": "Tamil Nadu",
            "region": "southern",
            "berth_capacity": 2,
            "storage_capacity_mt": 55000,
            "draft_limit_m": 12.5,
            "loading_rate_mt_per_hour": 0,
            "unloading_rate_mt_per_hour": 580,
            "port_charges_per_mt": 225,
            "demurrage_rate_per_day": 17500,
            "weather_factor": 0.94,
            "congestion_factor": 1.08,
            "operational_hours": 20,
            "tide_dependent": False,
            "monsoon_restrictions": True
        },
        {
            "id": "INDHA",
            "name": "Dhamra",
            "type": "unloading",
            "latitude": 20.9167,
            "longitude": 87.0333,
            "state": "Odisha",
            "region": "eastern",
            "berth_capacity": 1,
            "storage_capacity_mt": 30000,
            "draft_limit_m": 11.0,
            "loading_rate_mt_per_hour": 0,
            "unloading_rate_mt_per_hour": 450,
            "port_charges_per_mt": 200,
            "demurrage_rate_per_day": 13000,
            "weather_factor": 0.92,
            "congestion_factor": 1.15,
            "operational_hours": 16,
            "tide_dependent": True,
            "monsoon_restrictions": True
        },
        {
            "id": "INKAR",
            "name": "Kakinada",
            "type": "unloading",
            "latitude": 16.9333,
            "longitude": 82.2167,
            "state": "Andhra Pradesh",
            "region": "eastern",
            "berth_capacity": 2,
            "storage_capacity_mt": 60000,
            "draft_limit_m": 12.0,
            "loading_rate_mt_per_hour": 0,
            "unloading_rate_mt_per_hour": 620,
            "port_charges_per_mt": 230,
            "demurrage_rate_per_day": 18500,
            "weather_factor": 0.93,
            "congestion_factor": 1.12,
            "operational_hours": 22,
            "tide_dependent": False,
            "monsoon_restrictions": True
        }
    ]
    
    # November 2025 monthly demand scenario
    demands_data = [
        {
            "port_id": "INCHE",
            "port_name": "Chennai",
            "demand_mt": 45000,
            "priority": "high",
            "product_type": "gasoline",
            "delivery_window_start": "2025-11-01",
            "delivery_window_end": "2025-11-07",
            "flexible": False
        },
        {
            "port_id": "INTUT", 
            "port_name": "Tuticorin",
            "demand_mt": 32000,
            "priority": "medium",
            "product_type": "diesel",
            "delivery_window_start": "2025-11-05",
            "delivery_window_end": "2025-11-12",
            "flexible": True
        },
        {
            "port_id": "INMANG",
            "port_name": "Mangalore",
            "demand_mt": 38000,
            "priority": "high",
            "product_type": "gasoline",
            "delivery_window_start": "2025-11-08",
            "delivery_window_end": "2025-11-15",
            "flexible": False
        },
        {
            "port_id": "INGOA",
            "port_name": "Goa",
            "demand_mt": 18000,
            "priority": "low",
            "product_type": "kerosene",
            "delivery_window_start": "2025-11-12",
            "delivery_window_end": "2025-11-20",
            "flexible": True
        },
        {
            "port_id": "INJAW",
            "port_name": "Jawaharlal Nehru Port",
            "demand_mt": 55000,
            "priority": "critical",
            "product_type": "diesel",
            "delivery_window_start": "2025-11-03",
            "delivery_window_end": "2025-11-10",
            "flexible": False
        },
        {
            "port_id": "INDAH",
            "port_name": "Dahej",
            "demand_mt": 28000,
            "priority": "medium",
            "product_type": "gasoline",
            "delivery_window_start": "2025-11-10",
            "delivery_window_end": "2025-11-17",
            "flexible": True
        },
        {
            "port_id": "INENN",
            "port_name": "Ennore",
            "demand_mt": 25000,
            "priority": "medium",
            "product_type": "diesel",
            "delivery_window_start": "2025-11-15",
            "delivery_window_end": "2025-11-22",
            "flexible": True
        },
        {
            "port_id": "INKAR",
            "port_name": "Kakinada",
            "demand_mt": 35000,
            "priority": "high",
            "product_type": "gasoline",
            "delivery_window_start": "2025-11-18",
            "delivery_window_end": "2025-11-25",
            "flexible": False
        },
        {
            "port_id": "INCAL",
            "port_name": "Calicut",
            "demand_mt": 15000,
            "priority": "low",
            "product_type": "kerosene",
            "delivery_window_start": "2025-11-20",
            "delivery_window_end": "2025-11-28",
            "flexible": True
        },
        {
            "port_id": "INDHA",
            "port_name": "Dhamra",
            "demand_mt": 12000,
            "priority": "low",
            "product_type": "diesel",
            "delivery_window_start": "2025-11-22",
            "delivery_window_end": "2025-11-30",
            "flexible": True
        },
        {
            "port_id": "INORK",
            "port_name": "Okha",
            "demand_mt": 22000,
            "priority": "medium",
            "product_type": "gasoline",
            "delivery_window_start": "2025-11-25",
            "delivery_window_end": "2025-11-30",
            "flexible": True
        }
    ]
    
    return {
        "vessels": vessels_data,
        "ports": ports_data,
        "monthly_demands": demands_data,
        "metadata": {
            "generated_at": datetime.now().isoformat(),
            "data_version": "1.0",
            "scenario": "November 2025 - Peak Season Operations",
            "total_vessels": len(vessels_data),
            "total_ports": len(ports_data),
            "loading_ports": len([p for p in ports_data if p["type"] == "loading"]),
            "unloading_ports": len([p for p in ports_data if p["type"] == "unloading"]),
            "total_demand_mt": sum(d["demand_mt"] for d in demands_data),
            "fleet_capacity_mt": sum(v["capacity_mt"] for v in vessels_data),
            "capacity_utilization_required": (sum(d["demand_mt"] for d in demands_data) / sum(v["capacity_mt"] for v in vessels_data)) * 100
        }
    }


def save_sample_data_to_files():
    """
    Save sample data to JSON files for easy loading
    """
    sample_data = generate_hpcl_sample_data()
    
    # Save individual files
    with open("backend/app/data/hpcl_vessels.json", "w") as f:
        json.dump(sample_data["vessels"], f, indent=2)
    
    with open("backend/app/data/hpcl_ports.json", "w") as f:
        json.dump(sample_data["ports"], f, indent=2)
    
    with open("backend/app/data/hpcl_demands_nov2025.json", "w") as f:
        json.dump(sample_data["monthly_demands"], f, indent=2)
    
    # Save complete dataset
    with open("backend/app/data/hpcl_complete_dataset.json", "w") as f:
        json.dump(sample_data, f, indent=2)
    
    print("✅ HPCL sample data saved to files")
    print(f"📊 Fleet: {sample_data['metadata']['total_vessels']} vessels")
    print(f"🏭 Ports: {sample_data['metadata']['total_ports']} ports ({sample_data['metadata']['loading_ports']} loading + {sample_data['metadata']['unloading_ports']} unloading)")
    print(f"📦 Total demand: {sample_data['metadata']['total_demand_mt']:,} MT")
    print(f"🚢 Fleet capacity: {sample_data['metadata']['fleet_capacity_mt']:,} MT")
    print(f"📈 Required utilization: {sample_data['metadata']['capacity_utilization_required']:.1f}%")


if __name__ == "__main__":
    save_sample_data_to_files()
