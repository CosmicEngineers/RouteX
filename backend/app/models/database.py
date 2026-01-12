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
    try:
        db.client = AsyncIOMotorClient(
            MONGODB_URL,
            serverSelectionTimeoutMS=5000,  # 5 second timeout
            connectTimeoutMS=5000
        )
        db.database = db.client[DATABASE_NAME]
        
        # Test connection
        await db.client.server_info()
        
        # Create indexes for performance
        await create_indexes()
        print(f"✅ Connected to MongoDB: {DATABASE_NAME}")
    except Exception as e:
        print(f"⚠️  MongoDB not available: {e}")
        print("⚠️  Running without database persistence (using in-memory data)")
        db.client = None
        db.database = None


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


# In-memory data fallback when database is not available
_in_memory_data = {
    "vessels": [],
    "ports": [],
    "routes": [],
    "optimization_results": [],
    "tasks": {},
    "distance_matrix": None,
    "kpis": {}
}


class HPCLVesselDB:
    """HPCL Vessel Database Operations"""
    
    @staticmethod
    async def create_vessel(vessel_data: Dict[str, Any]) -> str:
        """Create new HPCL vessel record"""
        vessel_data["created_at"] = datetime.now()
        if db.database:
            result = await db.database.vessels.insert_one(vessel_data)
            return str(result.inserted_id)
        else:
            # In-memory fallback
            vessel_data["vessel_id"] = vessel_data.get("id", f"vessel_{len(_in_memory_data['vessels'])}")
            _in_memory_data["vessels"].append(vessel_data)
            return vessel_data["vessel_id"]
    
    @staticmethod
    async def get_vessel(vessel_id: str) -> Optional[Dict[str, Any]]:
        """Get HPCL vessel by ID"""
        if db.database:
            return await db.database.vessels.find_one({"vessel_id": vessel_id})
        else:
            # In-memory fallback
            for vessel in _in_memory_data["vessels"]:
                if vessel.get("id") == vessel_id or vessel.get("vessel_id") == vessel_id:
                    return vessel
            return None
    
    @staticmethod
    async def get_all_vessels() -> List[Dict[str, Any]]:
        """Get all HPCL vessels (max 9)"""
        if db.database:
            cursor = db.database.vessels.find({}).limit(9)
            return await cursor.to_list(length=9)
        else:
            # In-memory fallback
            return _in_memory_data["vessels"][:9]
    
    @staticmethod
    async def get_available_vessels() -> List[Dict[str, Any]]:
        """Get available HPCL vessels for optimization"""
        if db.database:
            cursor = db.database.vessels.find({"status": "available"})
            return await cursor.to_list(length=9)
        else:
            # In-memory fallback
            return [v for v in _in_memory_data["vessels"] if v.get("status") == "available"][:9]
    
    @staticmethod
    async def update_vessel_status(vessel_id: str, status: str, current_port: str = None):
        """Update HPCL vessel status"""
        update_data = {"status": status, "last_updated": datetime.now()}
        if current_port:
            update_data["current_port"] = current_port
        
        if db.database:
            return await db.database.vessels.update_one(
                {"vessel_id": vessel_id},
                {"$set": update_data}
            )
        else:
            # In-memory fallback
            for vessel in _in_memory_data["vessels"]:
                if vessel.get("id") == vessel_id or vessel.get("vessel_id") == vessel_id:
                    vessel.update(update_data)
                    return type('obj', (object,), {'modified_count': 1})()
            return type('obj', (object,), {'modified_count': 0})()



class HPCLPortDB:
    """HPCL Port Database Operations"""
    
    @staticmethod
    async def create_port(port_data: Dict[str, Any]) -> str:
        """Create new HPCL port record"""
        port_data["created_at"] = datetime.now()
        if db.database:
            result = await db.database.ports.insert_one(port_data)
            return str(result.inserted_id)
        else:
            # In-memory fallback
            port_data["port_id"] = port_data.get("id", f"port_{len(_in_memory_data['ports'])}")
            _in_memory_data["ports"].append(port_data)
            return port_data["port_id"]
    
    @staticmethod
    async def get_port(port_id: str) -> Optional[Dict[str, Any]]:
        """Get HPCL port by ID"""
        if db.database:
            return await db.database.ports.find_one({"port_id": port_id})
        else:
            # In-memory fallback
            for port in _in_memory_data["ports"]:
                if port.get("id") == port_id or port.get("port_id") == port_id:
                    return port
            return None
    
    @staticmethod
    async def get_loading_ports() -> List[Dict[str, Any]]:
        """Get all HPCL loading ports (max 6)"""
        if db.database:
            cursor = db.database.ports.find({"type": "loading"}).limit(6)
            return await cursor.to_list(length=6)
        else:
            # In-memory fallback
            return [p for p in _in_memory_data["ports"] if p.get("type") == "loading"][:6]
    
    @staticmethod
    async def get_unloading_ports() -> List[Dict[str, Any]]:
        """Get all HPCL unloading ports (max 11)"""
        if db.database:
            cursor = db.database.ports.find({"type": "unloading"}).limit(11)
            return await cursor.to_list(length=11)
        else:
            # In-memory fallback
            return [p for p in _in_memory_data["ports"] if p.get("type") == "unloading"][:11]
    
    @staticmethod
    async def get_all_ports() -> List[Dict[str, Any]]:
        """Get all HPCL ports (17 total)"""
        if db.database:
            cursor = db.database.ports.find({}).limit(17)
            return await cursor.to_list(length=17)
        else:
            # In-memory fallback
            return _in_memory_data["ports"][:17]
    
    @staticmethod
    async def get_ports_by_state(state: str) -> List[Dict[str, Any]]:
        """Get HPCL ports by Indian state"""
        if db.database:
            cursor = db.database.ports.find({"state": state})
            return await cursor.to_list(length=None)
        else:
            # In-memory fallback
            return [p for p in _in_memory_data["ports"] if p.get("state") == state]



class HPCLRouteDB:
    """HPCL Route Database Operations"""
    
    @staticmethod
    async def save_generated_routes(routes: List[Dict[str, Any]]) -> int:
        """Save generated feasible routes (~726 per vessel)"""
        if routes:
            for route in routes:
                route["created_at"] = datetime.now()
            if db.database:
                result = await db.database.routes.insert_many(routes)
                return len(result.inserted_ids)
            else:
                # In-memory fallback
                _in_memory_data["routes"].extend(routes)
                return len(routes)
        return 0
    
    @staticmethod
    async def get_routes_for_vessel(vessel_id: str) -> List[Dict[str, Any]]:
        """Get all feasible routes for specific HPCL vessel"""
        if db.database:
            cursor = db.database.routes.find({"vessel_id": vessel_id})
            return await cursor.to_list(length=None)
        else:
            # In-memory fallback
            return [r for r in _in_memory_data["routes"] if r.get("vessel_id") == vessel_id]
    
    @staticmethod
    async def get_routes_from_port(loading_port: str) -> List[Dict[str, Any]]:
        """Get routes starting from specific loading port"""
        if db.database:
            cursor = db.database.routes.find({"loading_port": loading_port})
            return await cursor.to_list(length=None)
        else:
            # In-memory fallback
            return [r for r in _in_memory_data["routes"] if r.get("loading_port") == loading_port]
    
    @staticmethod
    async def clear_routes_for_vessel(vessel_id: str):
        """Clear existing routes for vessel (before regeneration)"""
        if db.database:
            return await db.database.routes.delete_many({"vessel_id": vessel_id})
        else:
            # In-memory fallback
            _in_memory_data["routes"] = [r for r in _in_memory_data["routes"] if r.get("vessel_id") != vessel_id]
            return type('obj', (object,), {'deleted_count': 0})()


class OptimizationResultDB:
    """HPCL Optimization Results Database Operations"""
    
    @staticmethod
    async def save_result(result_data: Dict[str, Any]) -> str:
        """Save HPCL optimization result"""
        result_data["created_at"] = datetime.now()
        if db.database:
            result = await db.database.optimization_results.insert_one(result_data)
            return str(result.inserted_id)
        else:
            # In-memory fallback
            _in_memory_data["optimization_results"].append(result_data)
            return result_data.get("request_id", "in_memory_result")
    
    @staticmethod
    async def get_result(request_id: str) -> Optional[Dict[str, Any]]:
        """Get optimization result by request ID"""
        if db.database:
            return await db.database.optimization_results.find_one({"request_id": request_id})
        else:
            # In-memory fallback
            for result in _in_memory_data["optimization_results"]:
                if result.get("request_id") == request_id:
                    return result
            return None
    
    @staticmethod
    async def get_results_by_month(month: str) -> List[Dict[str, Any]]:
        """Get all optimization results for specific month"""
        if db.database:
            cursor = db.database.optimization_results.find({"month": month})
            return await cursor.to_list(length=None)
        else:
            # In-memory fallback
            return [r for r in _in_memory_data["optimization_results"] if r.get("month") == month]
    
    @staticmethod
    async def get_latest_results(limit: int = 10) -> List[Dict[str, Any]]:
        """Get latest HPCL optimization results"""
        if db.database:
            cursor = db.database.optimization_results.find({}).sort("created_at", -1).limit(limit)
            return await cursor.to_list(length=limit)
        else:
            # In-memory fallback
            sorted_results = sorted(_in_memory_data["optimization_results"], key=lambda x: x.get("created_at", datetime.min), reverse=True)
            return sorted_results[:limit]


class TaskDB:
    """Celery Task Database Operations"""
    
    @staticmethod
    async def create_task(task_data: Dict[str, Any]) -> str:
        """Create new task record"""
        task_data["created_at"] = datetime.now()
        if db.database:
            result = await db.database.tasks.insert_one(task_data)
            return str(result.inserted_id)
        else:
            # In-memory fallback
            task_id = task_data.get("task_id")
            _in_memory_data["tasks"][task_id] = task_data
            return task_id
    
    @staticmethod
    async def get_task(task_id: str) -> Optional[Dict[str, Any]]:
        """Get task by ID"""
        if db.database:
            return await db.database.tasks.find_one({"task_id": task_id})
        else:
            # In-memory fallback
            return _in_memory_data["tasks"].get(task_id)
    
    @staticmethod
    async def update_task_status(task_id: str, status: str, progress: int = None, message: str = None):
        """Update task status and progress"""
        update_data = {"status": status, "last_updated": datetime.now()}
        if progress is not None:
            update_data["progress"] = progress
        if message is not None:
            update_data["message"] = message
        
        if db.database:
            return await db.database.tasks.update_one(
                {"task_id": task_id},
                {"$set": update_data}
            )
        else:
            # In-memory fallback
            if task_id in _in_memory_data["tasks"]:
                _in_memory_data["tasks"][task_id].update(update_data)
            return type('obj', (object,), {'modified_count': 1})()
    
    @staticmethod
    async def save_task_result(task_id: str, result: Dict[str, Any]):
        """Save task result"""
        if db.database:
            return await db.database.tasks.update_one(
                {"task_id": task_id},
                {"$set": {"result": result, "completed_at": datetime.now()}}
            )
        else:
            # In-memory fallback
            if task_id in _in_memory_data["tasks"]:
                _in_memory_data["tasks"][task_id].update({"result": result, "completed_at": datetime.now()})
            return type('obj', (object,), {'modified_count': 1})()


class DistanceMatrixDB:
    """Distance Matrix Database Operations"""
    
    @staticmethod
    async def save_distance_matrix(matrix_data: Dict[str, Any]) -> str:
        """Save calculated distance matrix"""
        matrix_data["created_at"] = datetime.now()
        
        if db.database:
            # Update existing or insert new
            result = await db.database.distance_matrix.replace_one(
                {"type": "hpcl_coastal_ports"},
                {**matrix_data, "type": "hpcl_coastal_ports"},
                upsert=True
            )
            return str(result.upserted_id) if result.upserted_id else "updated"
        else:
            # In-memory fallback
            _in_memory_data["distance_matrix"] = {**matrix_data, "type": "hpcl_coastal_ports"}
            return "in_memory_matrix"
    
    @staticmethod
    async def get_distance_matrix() -> Optional[Dict[str, Any]]:
        """Get latest distance matrix"""
        if db.database:
            return await db.database.distance_matrix.find_one({"type": "hpcl_coastal_ports"})
        else:
            # In-memory fallback
            return _in_memory_data["distance_matrix"]


class HPCLAnalyticsDB:
    """HPCL Analytics and KPIs Database Operations"""
    
    @staticmethod
    async def save_monthly_kpis(kpi_data: Dict[str, Any]) -> str:
        """Save monthly KPIs for dashboard"""
        kpi_data["created_at"] = datetime.now()
        
        if db.database:
            result = await db.database.kpis.replace_one(
                {"month": kpi_data["month"]},
                kpi_data,
                upsert=True
            )
            return str(result.upserted_id) if result.upserted_id else "updated"
        else:
            # In-memory fallback
            month = kpi_data["month"]
            _in_memory_data["kpis"][month] = kpi_data
            return f"in_memory_kpi_{month}"
    
    @staticmethod
    async def get_monthly_kpis(month: str) -> Optional[Dict[str, Any]]:
        """Get KPIs for specific month"""
        if db.database:
            return await db.database.kpis.find_one({"month": month})
        else:
            # In-memory fallback
            return _in_memory_data["kpis"].get(month)
    
    @staticmethod
    async def get_kpi_trends(months: List[str]) -> List[Dict[str, Any]]:
        """Get KPI trends over multiple months"""
        if db.database:
            cursor = db.database.kpis.find({"month": {"$in": months}}).sort("month", 1)
            return await cursor.to_list(length=None)
        else:
            # In-memory fallback
            return [kpi for month, kpi in _in_memory_data["kpis"].items() if month in months]


# Database health check
async def check_database_health() -> Dict[str, Any]:
    """Check HPCL database health and connections"""
    try:
        if db.database is None:
            # Return in-memory status
            return {
                "status": "in_memory",
                "message": "Using in-memory data (MongoDB not connected)",
                "database": "in_memory",
                "vessels": len(_in_memory_data["vessels"]),
                "ports": len(_in_memory_data["ports"]),
                "routes": len(_in_memory_data["routes"]),
                "timestamp": datetime.now().isoformat()
            }
        
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
