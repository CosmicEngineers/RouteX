"""
HPCL Challenge 7.1 - Exact Specification Data
Coastal Vessel Optimization - Minimizing Bulk Cargo Transportation Cost
"""

from typing import List, Dict, Any
from datetime import datetime


def get_challenge_vessels() -> List[Dict[str, Any]]:
    """
    9 Coastal Tankers as per Challenge 7.1
    - T1-T7: 50,000 MT capacity
    - T8-T9: 25,000 MT capacity
    """
    return [
        {
            "id": "T1",
            "name": "Tanker T1",
            "imo_number": "IMO1000001",
            "capacity_mt": 50000,
            "charter_rate_cr_per_day": 0.63,  # Rs Cr/day
            "daily_charter_rate": 6300000,  # Rs per day (0.63 Cr)
            "grt": 25000,
            "length_m": 200,
            "beam_m": 32,
            "draft_m": 12.0,
            "speed_knots": 14.0,
            "fuel_consumption_mt_per_day": 25.0,
            "crew_size": 20,
            "status": "available",
            "current_port": None
        },
        {
            "id": "T2",
            "name": "Tanker T2",
            "imo_number": "IMO1000002",
            "capacity_mt": 50000,
            "charter_rate_cr_per_day": 0.49,
            "daily_charter_rate": 4900000,
            "grt": 25000,
            "length_m": 200,
            "beam_m": 32,
            "draft_m": 12.0,
            "speed_knots": 14.0,
            "fuel_consumption_mt_per_day": 25.0,
            "crew_size": 20,
            "status": "available",
            "current_port": None
        },
        {
            "id": "T3",
            "name": "Tanker T3",
            "imo_number": "IMO1000003",
            "capacity_mt": 50000,
            "charter_rate_cr_per_day": 0.51,
            "daily_charter_rate": 5100000,
            "grt": 25000,
            "length_m": 200,
            "beam_m": 32,
            "draft_m": 12.0,
            "speed_knots": 14.0,
            "fuel_consumption_mt_per_day": 25.0,
            "crew_size": 20,
            "status": "available",
            "current_port": None
        },
        {
            "id": "T4",
            "name": "Tanker T4",
            "imo_number": "IMO1000004",
            "capacity_mt": 50000,
            "charter_rate_cr_per_day": 0.51,
            "daily_charter_rate": 5100000,
            "grt": 25000,
            "length_m": 200,
            "beam_m": 32,
            "draft_m": 12.0,
            "speed_knots": 14.0,
            "fuel_consumption_mt_per_day": 25.0,
            "crew_size": 20,
            "status": "available",
            "current_port": None
        },
        {
            "id": "T5",
            "name": "Tanker T5",
            "imo_number": "IMO1000005",
            "capacity_mt": 50000,
            "charter_rate_cr_per_day": 0.53,
            "daily_charter_rate": 5300000,
            "grt": 25000,
            "length_m": 200,
            "beam_m": 32,
            "draft_m": 12.0,
            "speed_knots": 14.0,
            "fuel_consumption_mt_per_day": 25.0,
            "crew_size": 20,
            "status": "available",
            "current_port": None
        },
        {
            "id": "T6",
            "name": "Tanker T6",
            "imo_number": "IMO1000006",
            "capacity_mt": 50000,
            "charter_rate_cr_per_day": 0.57,
            "daily_charter_rate": 5700000,
            "grt": 25000,
            "length_m": 200,
            "beam_m": 32,
            "draft_m": 12.0,
            "speed_knots": 14.0,
            "fuel_consumption_mt_per_day": 25.0,
            "crew_size": 20,
            "status": "available",
            "current_port": None
        },
        {
            "id": "T7",
            "name": "Tanker T7",
            "imo_number": "IMO1000007",
            "capacity_mt": 50000,
            "charter_rate_cr_per_day": 0.65,
            "daily_charter_rate": 6500000,
            "grt": 25000,
            "length_m": 200,
            "beam_m": 32,
            "draft_m": 12.0,
            "speed_knots": 14.0,
            "fuel_consumption_mt_per_day": 25.0,
            "crew_size": 20,
            "status": "available",
            "current_port": None
        },
        {
            "id": "T8",
            "name": "Tanker T8",
            "imo_number": "IMO1000008",
            "capacity_mt": 25000,
            "charter_rate_cr_per_day": 0.39,
            "daily_charter_rate": 3900000,
            "grt": 12500,
            "length_m": 150,
            "beam_m": 24,
            "draft_m": 10.0,
            "speed_knots": 13.0,
            "fuel_consumption_mt_per_day": 15.0,
            "crew_size": 18,
            "status": "available",
            "current_port": None
        },
        {
            "id": "T9",
            "name": "Tanker T9",
            "imo_number": "IMO1000009",
            "capacity_mt": 25000,
            "charter_rate_cr_per_day": 0.38,
            "daily_charter_rate": 3800000,
            "grt": 12500,
            "length_m": 150,
            "beam_m": 24,
            "draft_m": 10.0,
            "speed_knots": 13.0,
            "fuel_consumption_mt_per_day": 15.0,
            "crew_size": 18,
            "status": "available",
            "current_port": None
        }
    ]


def get_challenge_loading_ports() -> List[Dict[str, Any]]:
    """6 Loading Ports (L1-L6) with unlimited supply"""
    return [
        {
            "id": "L1",
            "name": "Loading Port L1",
            "code": "L1",
            "type": "loading",
            "latitude": 19.0,
            "longitude": 72.8,
            "state": "Maharashtra",
            "storage_capacity": 999999999,  # Unlimited
            "loading_rate": 2000.0,
            "port_charges_per_visit": 100000,
            "grt_charge": 2.0,
            "cargo_handling_rate": 250.0
        },
        {
            "id": "L2",
            "name": "Loading Port L2",
            "code": "L2",
            "type": "loading",
            "latitude": 21.0,
            "longitude": 72.0,
            "state": "Gujarat",
            "storage_capacity": 999999999,
            "loading_rate": 2000.0,
            "port_charges_per_visit": 100000,
            "grt_charge": 2.0,
            "cargo_handling_rate": 250.0
        },
        {
            "id": "L3",
            "name": "Loading Port L3",
            "code": "L3",
            "type": "loading",
            "latitude": 20.5,
            "longitude": 71.5,
            "state": "Gujarat",
            "storage_capacity": 999999999,
            "loading_rate": 2000.0,
            "port_charges_per_visit": 100000,
            "grt_charge": 2.0,
            "cargo_handling_rate": 250.0
        },
        {
            "id": "L4",
            "name": "Loading Port L4",
            "code": "L4",
            "type": "loading",
            "latitude": 13.1,
            "longitude": 80.3,
            "state": "Tamil Nadu",
            "storage_capacity": 999999999,
            "loading_rate": 2000.0,
            "port_charges_per_visit": 100000,
            "grt_charge": 2.0,
            "cargo_handling_rate": 250.0
        },
        {
            "id": "L5",
            "name": "Loading Port L5",
            "code": "L5",
            "type": "loading",
            "latitude": 17.7,
            "longitude": 83.3,
            "state": "Andhra Pradesh",
            "storage_capacity": 999999999,
            "loading_rate": 2000.0,
            "port_charges_per_visit": 100000,
            "grt_charge": 2.0,
            "cargo_handling_rate": 250.0
        },
        {
            "id": "L6",
            "name": "Loading Port L6",
            "code": "L6",
            "type": "loading",
            "latitude": 22.5,
            "longitude": 88.3,
            "state": "West Bengal",
            "storage_capacity": 999999999,
            "loading_rate": 2000.0,
            "port_charges_per_visit": 100000,
            "grt_charge": 2.0,
            "cargo_handling_rate": 250.0
        }
    ]


def get_challenge_unloading_ports() -> List[Dict[str, Any]]:
    """11 Unloading Ports (U1-U11) with monthly demand"""
    return [
        {"id": "U1", "name": "Unloading Port U1", "code": "U1", "type": "unloading", "demand_mt": 40000, "latitude": 18.5, "longitude": 73.0, "state": "Maharashtra", "unloading_rate": 1500.0},
        {"id": "U2", "name": "Unloading Port U2", "code": "U2", "type": "unloading", "demand_mt": 135000, "latitude": 15.5, "longitude": 73.8, "state": "Goa", "unloading_rate": 1500.0},
        {"id": "U3", "name": "Unloading Port U3", "code": "U3", "type": "unloading", "demand_mt": 5000, "latitude": 19.5, "longitude": 72.5, "state": "Maharashtra", "unloading_rate": 1500.0},
        {"id": "U4", "name": "Unloading Port U4", "code": "U4", "type": "unloading", "demand_mt": 20000, "latitude": 18.0, "longitude": 73.5, "state": "Maharashtra", "unloading_rate": 1500.0},
        {"id": "U5", "name": "Unloading Port U5", "code": "U5", "type": "unloading", "demand_mt": 20000, "latitude": 17.5, "longitude": 73.0, "state": "Maharashtra", "unloading_rate": 1500.0},
        {"id": "U6", "name": "Unloading Port U6", "code": "U6", "type": "unloading", "demand_mt": 20000, "latitude": 16.0, "longitude": 74.0, "state": "Karnataka", "unloading_rate": 1500.0},
        {"id": "U7", "name": "Unloading Port U7", "code": "U7", "type": "unloading", "demand_mt": 110000, "latitude": 10.0, "longitude": 76.3, "state": "Kerala", "unloading_rate": 1500.0},
        {"id": "U8", "name": "Unloading Port U8", "code": "U8", "type": "unloading", "demand_mt": 30000, "latitude": 19.0, "longitude": 72.5, "state": "Maharashtra", "unloading_rate": 1500.0},
        {"id": "U9", "name": "Unloading Port U9", "code": "U9", "type": "unloading", "demand_mt": 20000, "latitude": 18.2, "longitude": 73.2, "state": "Maharashtra", "unloading_rate": 1500.0},
        {"id": "U10", "name": "Unloading Port U10", "code": "U10", "type": "unloading", "demand_mt": 20000, "latitude": 18.8, "longitude": 72.9, "state": "Maharashtra", "unloading_rate": 1500.0},
        {"id": "U11", "name": "Unloading Port U11", "code": "U11", "type": "unloading", "demand_mt": 20000, "latitude": 15.0, "longitude": 74.5, "state": "Karnataka", "unloading_rate": 1500.0}
    ]


def get_challenge_trip_times_load_to_unload() -> Dict[str, Dict[str, float]]:
    """Trip times from Loading ports to Unloading ports (in days)"""
    return {
        "L1": {"U1": 0.4, "U2": 0.7, "U3": 0.4, "U4": 0.4, "U5": 0.4, "U6": 0.6, "U7": 0.5, "U8": 0.4, "U9": 0.3, "U10": 0.5, "U11": 0.7},
        "L2": {"U1": 0.4, "U2": 0.6, "U3": 0.5, "U4": 0.4, "U5": 0.4, "U6": 0.5, "U7": 0.5, "U8": 0.5, "U9": 0.3, "U10": 0.5, "U11": 0.6},
        "L3": {"U1": 0.4, "U2": 0.6, "U3": 0.5, "U4": 0.4, "U5": 0.4, "U6": 0.5, "U7": 0.5, "U8": 0.5, "U9": 0.3, "U10": 0.6, "U11": 0.6},
        "L4": {"U1": 0.4, "U2": 0.6, "U3": 0.4, "U4": 0.3, "U5": 0.3, "U6": 0.5, "U7": 0.5, "U8": 0.4, "U9": 0.3, "U10": 0.5, "U11": 0.6},
        "L5": {"U1": 0.4, "U2": 0.6, "U3": 0.4, "U4": 0.3, "U5": 0.3, "U6": 0.5, "U7": 0.5, "U8": 0.4, "U9": 0.3, "U10": 0.5, "U11": 0.5},
        "L6": {"U1": 0.58, "U2": 0.73, "U3": 0.64, "U4": 0.56, "U5": 0.56, "U6": 0.65, "U7": 0.67, "U8": 0.64, "U9": 0.50, "U10": 0.70, "U11": 0.73}
    }


def get_challenge_trip_times_unload_to_unload() -> Dict[str, Dict[str, float]]:
    """Trip times between Unloading ports (in days) - for multi-port discharge"""
    return {
        "U1": {"U1": 0.00, "U2": 0.35, "U3": 0.19, "U4": 0.16, "U5": 0.16, "U6": 0.25, "U7": 0.23, "U8": 0.19, "U9": 0.09, "U10": 0.19, "U11": 0.33},
        "U2": {"U1": 0.36, "U2": 0.00, "U3": 0.38, "U4": 0.37, "U5": 0.37, "U6": 0.15, "U7": 0.34, "U8": 0.38, "U9": 0.29, "U10": 0.40, "U11": 0.19},
        "U3": {"U1": 0.16, "U2": 0.33, "U3": 0.00, "U4": 0.16, "U5": 0.16, "U6": 0.25, "U7": 0.21, "U8": 0.17, "U9": 0.09, "U10": 0.19, "U11": 0.32},
        "U4": {"U1": 0.18, "U2": 0.37, "U3": 0.21, "U4": 0.00, "U5": 0.12, "U6": 0.29, "U7": 0.25, "U8": 0.21, "U9": 0.05, "U10": 0.21, "U11": 0.35},
        "U5": {"U1": 0.18, "U2": 0.37, "U3": 0.21, "U4": 0.12, "U5": 0.00, "U6": 0.29, "U7": 0.25, "U8": 0.21, "U9": 0.05, "U10": 0.21, "U11": 0.35},
        "U6": {"U1": 0.29, "U2": 0.17, "U3": 0.32, "U4": 0.31, "U5": 0.31, "U6": 0.00, "U7": 0.22, "U8": 0.32, "U9": 0.24, "U10": 0.34, "U11": 0.18},
        "U7": {"U1": 0.19, "U2": 0.29, "U3": 0.21, "U4": 0.20, "U5": 0.20, "U6": 0.15, "U7": 0.00, "U8": 0.21, "U9": 0.12, "U10": 0.21, "U11": 0.28},
        "U8": {"U1": 0.16, "U2": 0.33, "U3": 0.17, "U4": 0.16, "U5": 0.16, "U6": 0.25, "U7": 0.21, "U8": 0.00, "U9": 0.09, "U10": 0.19, "U11": 0.32},
        "U9": {"U1": 0.17, "U2": 0.37, "U3": 0.21, "U4": 0.12, "U5": 0.12, "U6": 0.29, "U7": 0.25, "U8": 0.21, "U9": 0.00, "U10": 0.21, "U11": 0.35},
        "U10": {"U1": 0.14, "U2": 0.34, "U3": 0.18, "U4": 0.15, "U5": 0.15, "U6": 0.27, "U7": 0.20, "U8": 0.18, "U9": 0.07, "U10": 0.00, "U11": 0.33},
        "U11": {"U1": 0.33, "U2": 0.17, "U3": 0.34, "U4": 0.33, "U5": 0.33, "U6": 0.13, "U7": 0.30, "U8": 0.34, "U9": 0.25, "U10": 0.36, "U11": 0.00}
    }


def get_monthly_demands() -> List[Dict[str, Any]]:
    """Monthly demand at all unloading ports (MT/month)"""
    demands = [
        {"port_id": "U1", "demand_mt": 40000},
        {"port_id": "U2", "demand_mt": 135000},
        {"port_id": "U3", "demand_mt": 5000},
        {"port_id": "U4", "demand_mt": 20000},
        {"port_id": "U5", "demand_mt": 20000},
        {"port_id": "U6", "demand_mt": 20000},
        {"port_id": "U7", "demand_mt": 110000},
        {"port_id": "U8", "demand_mt": 30000},
        {"port_id": "U9", "demand_mt": 20000},
        {"port_id": "U10", "demand_mt": 20000},
        {"port_id": "U11", "demand_mt": 20000}
    ]
    return demands


def get_challenge_configuration() -> Dict[str, Any]:
    """Complete challenge configuration"""
    return {
        "fleet_size": 9,
        "loading_ports": 6,
        "unloading_ports": 11,
        "max_discharge_ports": 2,
        "single_loading_constraint": True,
        "unlimited_supply": True,
        "total_monthly_demand_mt": 440000,
        "vessels": get_challenge_vessels(),
        "loading_ports_data": get_challenge_loading_ports(),
        "unloading_ports_data": get_challenge_unloading_ports(),
        "trip_times_load_unload": get_challenge_trip_times_load_to_unload(),
        "trip_times_unload_unload": get_challenge_trip_times_unload_to_unload(),
        "monthly_demands": get_monthly_demands()
    }
