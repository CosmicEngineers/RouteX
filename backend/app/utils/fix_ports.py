"""
Quick fix for unloading ports - add missing required fields
"""

import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import datetime
from app.models.database import HPCLPortDB, connect_to_mongo

# Updated unloading ports with all required fields
UNLOADING_PORTS_UPDATE = [
    {
        "port_id": "UNLD_KOC",
        "id": "UNLD_KOC",
        "name": "Kochi",
        "code": "INCOJ",
        "type": "unloading",
        "latitude": 9.9312,
        "longitude": 76.2673,
        "state": "Kerala",
        "draft_limitation": 11.5,
        "berth_capacity": 2,
        "storage_capacity": 300000,
        "loading_rate": 800,
        "unloading_rate": 1000,
        "port_charges_per_visit": 55000,
        "grt_charge": 2.0,
        "cargo_handling_rate": 300
    },
    {
        "port_id": "UNLD_MAN",
        "id": "UNLD_MAN",
        "name": "Mangalore",
        "code": "INMNG", 
        "type": "unloading",
        "latitude": 12.9141,
        "longitude": 74.8560,
        "state": "Karnataka",
        "draft_limitation": 10.5,
        "berth_capacity": 2,
        "storage_capacity": 250000,
        "loading_rate": 600,
        "unloading_rate": 800,
        "port_charges_per_visit": 50000,
        "grt_charge": 1.8,
        "cargo_handling_rate": 280
    },
    {
        "port_id": "UNLD_TUT",
        "id": "UNLD_TUT",
        "name": "Tuticorin",
        "code": "INTUT",
        "type": "unloading", 
        "latitude": 8.7642,
        "longitude": 78.1348,
        "state": "Tamil Nadu",
        "draft_limitation": 12.0,
        "berth_capacity": 3,
        "storage_capacity": 350000,
        "loading_rate": 900,
        "unloading_rate": 1100,
        "port_charges_per_visit": 60000,
        "grt_charge": 2.1,
        "cargo_handling_rate": 310
    }
]

async def update_unloading_ports():
    """Update unloading ports with missing fields"""
    try:
        await connect_to_mongo()
        print("🔗 Connected to MongoDB")
        
        from app.models.database import db
        
        # Update each unloading port with missing fields
        for port in UNLOADING_PORTS_UPDATE:
            result = await db.database.ports.update_one(
                {"port_id": port["port_id"]},
                {"$set": port}
            )
            print(f"✅ Updated {port['name']}")
        
        print("🎉 Unloading ports updated successfully!")
        
    except Exception as e:
        print(f"❌ Update failed: {e}")
        raise

if __name__ == "__main__":
    asyncio.run(update_unloading_ports())
