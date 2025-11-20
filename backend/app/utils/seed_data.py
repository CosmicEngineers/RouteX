"""
HPCL Coastal Tanker Fleet - Initial Data Seeding
Seeds the database with HPCL's 9 vessels and 17 Indian coastal ports
"""

import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import datetime
from app.models.database import HPCLVesselDB, HPCLPortDB, connect_to_mongo

# HPCL's 9 Coastal Tanker Fleet
HPCL_VESSELS = [
    {
        "vessel_id": "HPCL-CT-001",
        "id": "HPCL-CT-001",
        "name": "HPCL Coastal Spirit",
        "imo_number": "9876543",
        "capacity_mt": 32000,
        "grt": 35000,
        "length_m": 185.5,
        "beam_m": 28.2,
        "draft_m": 10.8,
        "speed_knots": 12.5,
        "fuel_consumption_mt_per_day": 67.2,
        "daily_charter_rate": 85000,
        "crew_size": 22,
        "status": "available",
        "current_port": "Mumbai",
        "last_updated": datetime.utcnow()
    },
    {
        "vessel_id": "HPCL-CT-002",
        "id": "HPCL-CT-002",
        "name": "HPCL Ocean Pride",
        "imo_number": "9876544",
        "capacity_mt": 28000,
        "grt": 31000,
        "length_m": 175.2,
        "beam_m": 26.8,
        "draft_m": 10.2,
        "speed_knots": 13.0,
        "fuel_consumption_mt_per_day": 62.4,
        "daily_charter_rate": 80000,
        "crew_size": 20,
        "status": "sailing",
        "current_port": "Kandla",
        "last_updated": datetime.utcnow()
    },
    {
        "vessel_id": "HPCL-CT-003",
        "id": "HPCL-CT-003",
        "name": "HPCL Maritime Excel",
        "imo_number": "9876545",
        "capacity_mt": 35000,
        "grt": 38000,
        "length_m": 192.0,
        "beam_m": 30.0,
        "draft_m": 11.2,
        "speed_knots": 12.0,
        "fuel_consumption_mt_per_day": 76.8,
        "daily_charter_rate": 90000,
        "crew_size": 24,
        "status": "available", 
        "current_port": "Visakhapatnam",
        "last_updated": datetime.utcnow()
    },
    {
        "vessel_id": "HPCL-CT-004",
        "id": "HPCL-CT-004",
        "name": "HPCL Coastal Warrior",
        "imo_number": "9876546",
        "capacity_mt": 30000,
        "grt": 33000,
        "length_m": 180.5,
        "beam_m": 27.5,
        "draft_m": 10.5,
        "speed_knots": 12.8,
        "fuel_consumption_mt_per_day": 69.6,
        "daily_charter_rate": 82000,
        "crew_size": 21,
        "status": "available",
        "current_port": "Kochi",
        "last_updated": datetime.utcnow()
    },
    {
        "vessel_id": "HPCL-CT-005",
        "id": "HPCL-CT-005", 
        "name": "HPCL Coastal Navigator",
        "imo_number": "9876547",
        "capacity_mt": 26000,
        "grt": 29000,
        "length_m": 168.0,
        "beam_m": 25.2,
        "draft_m": 9.8,
        "speed_knots": 13.5,
        "fuel_consumption_mt_per_day": 57.6,
        "daily_charter_rate": 75000,
        "crew_size": 19,
        "status": "maintenance",
        "current_port": "Chennai",
        "last_updated": datetime.utcnow()
    },
    {
        "vessel_id": "HPCL-CT-006",
        "id": "HPCL-CT-006",
        "name": "HPCL Ocean Guardian",
        "imo_number": "9876548",
        "capacity_mt": 33000,
        "grt": 36000,
        "length_m": 188.2,
        "beam_m": 29.0,
        "draft_m": 11.0,
        "speed_knots": 12.2,
        "fuel_consumption_mt_per_day": 72.0,
        "daily_charter_rate": 87000,
        "crew_size": 23,
        "status": "available",
        "current_port": "Haldia",
        "last_updated": datetime.utcnow()
    },
    {
        "vessel_id": "HPCL-CT-007",
        "id": "HPCL-CT-007",
        "name": "HPCL Maritime Pioneer",
        "imo_number": "9876549",
        "capacity_mt": 31000,
        "grt": 34000,
        "length_m": 183.5,
        "beam_m": 28.0,
        "draft_m": 10.7,
        "speed_knots": 13.2,
        "fuel_consumption_mt_per_day": 64.8,
        "daily_charter_rate": 84000,
        "crew_size": 22,
        "status": "available",
        "current_port": "Paradip",
        "last_updated": datetime.utcnow()
    },
    {
        "vessel_id": "HPCL-CT-008",
        "id": "HPCL-CT-008", 
        "name": "HPCL Coastal Champion",
        "imo_number": "9876550",
        "capacity_mt": 29000,
        "grt": 32000,
        "length_m": 178.0,
        "beam_m": 27.0,
        "draft_m": 10.3,
        "speed_knots": 12.6,
        "fuel_consumption_mt_per_day": 67.2,
        "daily_charter_rate": 81000,
        "crew_size": 21,
        "status": "available",
        "current_port": "Mangalore",
        "last_updated": datetime.utcnow()
    },
    {
        "vessel_id": "HPCL-CT-009",
        "id": "HPCL-CT-009",
        "name": "HPCL Ocean Achiever",
        "imo_number": "9876551",
        "capacity_mt": 34000,
        "grt": 37000,
        "length_m": 190.0,
        "beam_m": 29.5,
        "draft_m": 11.1,
        "speed_knots": 11.8,
        "fuel_consumption_mt_per_day": 74.4,
        "daily_charter_rate": 89000,
        "crew_size": 24,
        "status": "sailing",
        "current_port": "Tuticorin",
        "last_updated": datetime.utcnow()
    }
]

# HPCL Indian Coastal Port Network (6 Loading + 11 Unloading)
HPCL_LOADING_PORTS = [
    {
        "port_id": "LOAD_MUM", 
        "name": "Mumbai",
        "type": "loading",
        "latitude": 19.0760,
        "longitude": 72.8777,
        "state": "Maharashtra",
        "capacity_mt_per_day": 15000,
        "berth_availability": True,
        "tide_restrictions": False,
        "last_updated": datetime.utcnow()
    },
    {
        "port_id": "LOAD_KAN",
        "name": "Kandla", 
        "type": "loading",
        "latitude": 23.0225,
        "longitude": 70.2208,
        "state": "Gujarat",
        "capacity_mt_per_day": 18000,
        "berth_availability": True,
        "tide_restrictions": True,
        "last_updated": datetime.utcnow()
    },
    {
        "port_id": "LOAD_VIS",
        "name": "Visakhapatnam",
        "type": "loading", 
        "latitude": 17.6868,
        "longitude": 83.2185,
        "state": "Andhra Pradesh",
        "capacity_mt_per_day": 20000,
        "berth_availability": True,
        "tide_restrictions": False,
        "last_updated": datetime.utcnow()
    },
    {
        "port_id": "LOAD_HAL",
        "name": "Haldia",
        "type": "loading",
        "latitude": 22.0583,
        "longitude": 88.1083,
        "state": "West Bengal", 
        "capacity_mt_per_day": 16000,
        "berth_availability": True,
        "tide_restrictions": True,
        "last_updated": datetime.utcnow()
    },
    {
        "port_id": "LOAD_PAR",
        "name": "Paradip",
        "type": "loading",
        "latitude": 20.3167,
        "longitude": 86.6167,
        "state": "Odisha",
        "capacity_mt_per_day": 14000,
        "berth_availability": True,
        "tide_restrictions": False,
        "last_updated": datetime.utcnow()
    },
    {
        "port_id": "LOAD_CHE",
        "name": "Chennai",
        "type": "loading",
        "latitude": 13.0827,
        "longitude": 80.2707,
        "state": "Tamil Nadu",
        "capacity_mt_per_day": 17000,
        "berth_availability": True,
        "tide_restrictions": False,
        "last_updated": datetime.utcnow()
    }
]

HPCL_UNLOADING_PORTS = [
    {
        "port_id": "UNLD_KOC",
        "name": "Kochi",
        "type": "unloading",
        "latitude": 9.9312,
        "longitude": 76.2673,
        "state": "Kerala",
        "capacity_mt_per_day": 12000,
        "berth_availability": True,
        "tide_restrictions": False,
        "last_updated": datetime.utcnow()
    },
    {
        "port_id": "UNLD_MAN",
        "name": "Mangalore", 
        "type": "unloading",
        "latitude": 12.9141,
        "longitude": 74.8560,
        "state": "Karnataka",
        "capacity_mt_per_day": 10000,
        "berth_availability": True,
        "tide_restrictions": False,
        "last_updated": datetime.utcnow()
    },
    {
        "port_id": "UNLD_TUT",
        "name": "Tuticorin",
        "type": "unloading", 
        "latitude": 8.7642,
        "longitude": 78.1348,
        "state": "Tamil Nadu",
        "capacity_mt_per_day": 13000,
        "berth_availability": True,
        "tide_restrictions": False,
        "last_updated": datetime.utcnow()
    },
    {
        "port_id": "UNLD_GOA",
        "name": "Mormugao (Goa)",
        "type": "unloading",
        "latitude": 15.4137,
        "longitude": 73.8063,
        "state": "Goa", 
        "capacity_mt_per_day": 8000,
        "berth_availability": True,
        "tide_restrictions": True,
        "last_updated": datetime.utcnow()
    },
    {
        "port_id": "UNLD_POR",
        "name": "Porbandar",
        "type": "unloading",
        "latitude": 21.6417,
        "longitude": 69.6293,
        "state": "Gujarat",
        "capacity_mt_per_day": 9000,
        "berth_availability": True,
        "tide_restrictions": True,
        "last_updated": datetime.utcnow()
    },
    {
        "port_id": "UNLD_KAK",
        "name": "Kakinada",
        "type": "unloading",
        "latitude": 16.9891,
        "longitude": 82.2475,
        "state": "Andhra Pradesh",
        "capacity_mt_per_day": 11000,
        "berth_availability": True,
        "tide_restrictions": False,
        "last_updated": datetime.utcnow()
    },
    {
        "port_id": "UNLD_ENN",
        "name": "Ennore", 
        "type": "unloading",
        "latitude": 13.2165,
        "longitude": 80.3273,
        "state": "Tamil Nadu",
        "capacity_mt_per_day": 14000,
        "berth_availability": True,
        "tide_restrictions": False,
        "last_updated": datetime.utcnow()
    },
    {
        "port_id": "UNLD_JNP",
        "name": "JNPT (Navi Mumbai)",
        "type": "unloading",
        "latitude": 18.9647,
        "longitude": 72.9505,
        "state": "Maharashtra",
        "capacity_mt_per_day": 16000,
        "berth_availability": True,
        "tide_restrictions": False,
        "last_updated": datetime.utcnow()
    },
    {
        "port_id": "UNLD_BHV",
        "name": "Bhavnagar",
        "type": "unloading",
        "latitude": 21.7645,
        "longitude": 72.1519,
        "state": "Gujarat",
        "capacity_mt_per_day": 10000,
        "berth_availability": True, 
        "tide_restrictions": True,
        "last_updated": datetime.utcnow()
    },
    {
        "port_id": "UNLD_KOL",
        "name": "Kolkata",
        "type": "unloading",
        "latitude": 22.5726,
        "longitude": 88.3639,
        "state": "West Bengal",
        "capacity_mt_per_day": 12000,
        "berth_availability": True,
        "tide_restrictions": True,
        "last_updated": datetime.utcnow()
    },
    {
        "port_id": "UNLD_NHV",
        "name": "New Hazira",
        "type": "unloading",
        "latitude": 21.1095,
        "longitude": 72.6196,
        "state": "Gujarat", 
        "capacity_mt_per_day": 15000,
        "berth_availability": True,
        "tide_restrictions": False,
        "last_updated": datetime.utcnow()
    }
]


async def seed_hpcl_database():
    """
    Seed database with HPCL's initial fleet and port data
    """
    try:
        await connect_to_mongo()
        print("🔗 Connected to MongoDB")
        
        # Clear existing data
        print("🧹 Clearing existing data...")
        from app.models.database import db
        await db.database.vessels.delete_many({})
        await db.database.ports.delete_many({})
        
        # Seed vessels
        print("🚢 Seeding HPCL vessel fleet...")
        for vessel in HPCL_VESSELS:
            await HPCLVesselDB.create_vessel(vessel)
        print(f"✅ Added {len(HPCL_VESSELS)} HPCL vessels")
        
        # Seed loading ports
        print("📍 Seeding loading ports...")
        for port in HPCL_LOADING_PORTS:
            await HPCLPortDB.create_port(port)
        print(f"✅ Added {len(HPCL_LOADING_PORTS)} loading ports")
        
        # Seed unloading ports  
        print("📍 Seeding unloading ports...")
        for port in HPCL_UNLOADING_PORTS:
            await HPCLPortDB.create_port(port)
        print(f"✅ Added {len(HPCL_UNLOADING_PORTS)} unloading ports")
        
        print("🎉 HPCL database seeding completed successfully!")
        print(f"📊 Fleet: {len(HPCL_VESSELS)} vessels | Network: {len(HPCL_LOADING_PORTS)} loading + {len(HPCL_UNLOADING_PORTS)} unloading ports")
        
    except Exception as e:
        print(f"❌ Database seeding failed: {e}")
        raise


if __name__ == "__main__":
    asyncio.run(seed_hpcl_database())
