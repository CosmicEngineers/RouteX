"""
HPCL Coastal Tanker Optimization - Database Models
MongoDB document models for HPCL-specific data
"""

from motor.motor_asyncio import AsyncIOMotorClient
from typing import Optional, List, Dict, Any
import os
from datetime import datetime

# MongoDB Configuration
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DATABASE_NAME = "hpcl_coastal_optimizer"


class MongoDB:
    """HPCL MongoDB Connection Manager"""
    
    client: Optional[AsyncIOMotorClient] = None
    database = None


# Initialize MongoDB connection
db = MongoDB()


async def connect_to_mongo():
    """Create database connection"""
    db.client = AsyncIOMotorClient(MONGODB_URL)
    db.database = db.client[DATABASE_NAME]
    
    # Create indexes for performance
    await create_indexes()
    print(f"Connected to MongoDB: {DATABASE_NAME}")


async def close_mongo_connection():
    """Close database connection"""
    if db.client:
        db.client.close()
        print("Disconnected from MongoDB")


async def create_indexes():
    """Create database indexes for HPCL collections"""
    if db.database is None:
        return
    
    # Vessels collection indexes
    await db.database.vessels.create_index("vessel_id", unique=True)
    await db.database.vessels.create_index("status")
    
    # Ports collection indexes
    await db.database.ports.create_index("port_id", unique=True)
    await db.database.ports.create_index("type")
    await db.database.ports.create_index([("latitude", 1), ("longitude", 1)])
    
    # Routes collection indexes
    await db.database.routes.create_index("route_id", unique=True)
    await db.database.routes.create_index("vessel_id")
    await db.database.routes.create_index("loading_port")
    
    # Optimization results indexes
    await db.database.optimization_results.create_index("request_id", unique=True)
    await db.database.optimization_results.create_index("month")
    await db.database.optimization_results.create_index("created_at")
    
    # Tasks collection indexes
    await db.database.tasks.create_index("task_id", unique=True)
    await db.database.tasks.create_index("status")
    await db.database.tasks.create_index("created_at")
    
    print("Database indexes created successfully")


class HPCLVesselDB:
    """HPCL Vessel Database Operations"""
    
    @staticmethod
    async def create_vessel(vessel_data: Dict[str, Any]) -> str:
        """Create new HPCL vessel record"""
        vessel_data["created_at"] = datetime.now()
        result = await db.database.vessels.insert_one(vessel_data)
        return str(result.inserted_id)
    
    @staticmethod
    async def get_vessel(vessel_id: str) -> Optional[Dict[str, Any]]:
        """Get HPCL vessel by ID"""
        return await db.database.vessels.find_one({"vessel_id": vessel_id})
    
    @staticmethod
    async def get_all_vessels() -> List[Dict[str, Any]]:
        """Get all HPCL vessels (max 9)"""
        cursor = db.database.vessels.find({}).limit(9)
        return await cursor.to_list(length=9)
    
    @staticmethod
    async def get_available_vessels() -> List[Dict[str, Any]]:
        """Get available HPCL vessels for optimization"""
        cursor = db.database.vessels.find({"status": "available"})
        return await cursor.to_list(length=9)
    
    @staticmethod
    async def update_vessel_status(vessel_id: str, status: str, current_port: str = None):
        """Update HPCL vessel status"""
        update_data = {"status": status, "last_updated": datetime.now()}
        if current_port:
            update_data["current_port"] = current_port
        
        return await db.database.vessels.update_one(
            {"vessel_id": vessel_id},
            {"$set": update_data}
        )


class HPCLPortDB:
    """HPCL Port Database Operations"""
    
    @staticmethod
    async def create_port(port_data: Dict[str, Any]) -> str:
        """Create new HPCL port record"""
        port_data["created_at"] = datetime.now()
        result = await db.database.ports.insert_one(port_data)
        return str(result.inserted_id)
    
    @staticmethod
    async def get_port(port_id: str) -> Optional[Dict[str, Any]]:
        """Get HPCL port by ID"""
        return await db.database.ports.find_one({"port_id": port_id})
    
    @staticmethod
    async def get_loading_ports() -> List[Dict[str, Any]]:
        """Get all HPCL loading ports (max 6)"""
        cursor = db.database.ports.find({"type": "loading"}).limit(6)
        return await cursor.to_list(length=6)
    
    @staticmethod
    async def get_unloading_ports() -> List[Dict[str, Any]]:
        """Get all HPCL unloading ports (max 11)"""
        cursor = db.database.ports.find({"type": "unloading"}).limit(11)
        return await cursor.to_list(length=11)
    
    @staticmethod
    async def get_all_ports() -> List[Dict[str, Any]]:
        """Get all HPCL ports (17 total)"""
        cursor = db.database.ports.find({}).limit(17)
        return await cursor.to_list(length=17)
    
    @staticmethod
    async def get_ports_by_state(state: str) -> List[Dict[str, Any]]:
        """Get HPCL ports by Indian state"""
        cursor = db.database.ports.find({"state": state})
        return await cursor.to_list(length=None)


class HPCLRouteDB:
    """HPCL Route Database Operations"""
    
    @staticmethod
    async def save_generated_routes(routes: List[Dict[str, Any]]) -> int:
        """Save generated feasible routes (~726 per vessel)"""
        if routes:
            for route in routes:
                route["created_at"] = datetime.now()
            result = await db.database.routes.insert_many(routes)
            return len(result.inserted_ids)
        return 0
    
    @staticmethod
    async def get_routes_for_vessel(vessel_id: str) -> List[Dict[str, Any]]:
        """Get all feasible routes for specific HPCL vessel"""
        cursor = db.database.routes.find({"vessel_id": vessel_id})
        return await cursor.to_list(length=None)
    
    @staticmethod
    async def get_routes_from_port(loading_port: str) -> List[Dict[str, Any]]:
        """Get routes starting from specific loading port"""
        cursor = db.database.routes.find({"loading_port": loading_port})
        return await cursor.to_list(length=None)
    
    @staticmethod
    async def clear_routes_for_vessel(vessel_id: str):
        """Clear existing routes for vessel (before regeneration)"""
        return await db.database.routes.delete_many({"vessel_id": vessel_id})


class OptimizationResultDB:
    """HPCL Optimization Results Database Operations"""
    
    @staticmethod
    async def save_result(result_data: Dict[str, Any]) -> str:
        """Save HPCL optimization result"""
        result_data["created_at"] = datetime.now()
        result = await db.database.optimization_results.insert_one(result_data)
        return str(result.inserted_id)
    
    @staticmethod
    async def get_result(request_id: str) -> Optional[Dict[str, Any]]:
        """Get optimization result by request ID"""
        return await db.database.optimization_results.find_one({"request_id": request_id})
    
    @staticmethod
    async def get_results_by_month(month: str) -> List[Dict[str, Any]]:
        """Get all optimization results for specific month"""
        cursor = db.database.optimization_results.find({"month": month})
        return await cursor.to_list(length=None)
    
    @staticmethod
    async def get_latest_results(limit: int = 10) -> List[Dict[str, Any]]:
        """Get latest HPCL optimization results"""
        cursor = db.database.optimization_results.find({}).sort("created_at", -1).limit(limit)
        return await cursor.to_list(length=limit)


class TaskDB:
    """Celery Task Database Operations"""
    
    @staticmethod
    async def create_task(task_data: Dict[str, Any]) -> str:
        """Create new task record"""
        task_data["created_at"] = datetime.now()
        result = await db.database.tasks.insert_one(task_data)
        return str(result.inserted_id)
    
    @staticmethod
    async def get_task(task_id: str) -> Optional[Dict[str, Any]]:
        """Get task by ID"""
        return await db.database.tasks.find_one({"task_id": task_id})
    
    @staticmethod
    async def update_task_status(task_id: str, status: str, progress: int = None, message: str = None):
        """Update task status and progress"""
        update_data = {"status": status, "last_updated": datetime.now()}
        if progress is not None:
            update_data["progress"] = progress
        if message is not None:
            update_data["message"] = message
        
        return await db.database.tasks.update_one(
            {"task_id": task_id},
            {"$set": update_data}
        )
    
    @staticmethod
    async def save_task_result(task_id: str, result: Dict[str, Any]):
        """Save task result"""
        return await db.database.tasks.update_one(
            {"task_id": task_id},
            {"$set": {"result": result, "completed_at": datetime.now()}}
        )


class DistanceMatrixDB:
    """Distance Matrix Database Operations"""
    
    @staticmethod
    async def save_distance_matrix(matrix_data: Dict[str, Any]) -> str:
        """Save calculated distance matrix"""
        matrix_data["created_at"] = datetime.now()
        
        # Update existing or insert new
        result = await db.database.distance_matrix.replace_one(
            {"type": "hpcl_coastal_ports"},
            {**matrix_data, "type": "hpcl_coastal_ports"},
            upsert=True
        )
        return str(result.upserted_id) if result.upserted_id else "updated"
    
    @staticmethod
    async def get_distance_matrix() -> Optional[Dict[str, Any]]:
        """Get latest distance matrix"""
        return await db.database.distance_matrix.find_one({"type": "hpcl_coastal_ports"})


class HPCLAnalyticsDB:
    """HPCL Analytics and KPIs Database Operations"""
    
    @staticmethod
    async def save_monthly_kpis(kpi_data: Dict[str, Any]) -> str:
        """Save monthly KPIs for dashboard"""
        kpi_data["created_at"] = datetime.now()
        
        result = await db.database.kpis.replace_one(
            {"month": kpi_data["month"]},
            kpi_data,
            upsert=True
        )
        return str(result.upserted_id) if result.upserted_id else "updated"
    
    @staticmethod
    async def get_monthly_kpis(month: str) -> Optional[Dict[str, Any]]:
        """Get KPIs for specific month"""
        return await db.database.kpis.find_one({"month": month})
    
    @staticmethod
    async def get_kpi_trends(months: List[str]) -> List[Dict[str, Any]]:
        """Get KPI trends over multiple months"""
        cursor = db.database.kpis.find({"month": {"$in": months}}).sort("month", 1)
        return await cursor.to_list(length=None)


# Database health check
async def check_database_health() -> Dict[str, Any]:
    """Check HPCL database health and connections"""
    try:
        if db.database is None:
            return {"status": "error", "message": "Database not connected"}
        
        # Test basic operations
        collections = await db.database.list_collection_names()
        
        # Count documents in key collections
        vessel_count = await db.database.vessels.count_documents({})
        port_count = await db.database.ports.count_documents({})
        route_count = await db.database.routes.count_documents({})
        
        return {
            "status": "healthy",
            "database": DATABASE_NAME,
            "collections": len(collections),
            "vessels": vessel_count,
            "ports": port_count,
            "routes": route_count,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e),
            "timestamp": datetime.now().isoformat()
        }
