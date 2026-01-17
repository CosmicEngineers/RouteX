# RouteX Backend - FastAPI Optimization Engine

High-performance RESTful API for maritime logistics optimization using Google OR-Tools CP-SAT solver.

## Overview

The backend provides optimization services for HPCL's coastal tanker fleet, implementing advanced constraint programming algorithms to minimize transportation costs while satisfying operational constraints. Built with FastAPI for high performance and automatic API documentation.

## Technology Stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| **Python** | 3.11+ | Core programming language |
| **FastAPI** | 0.117+ | High-performance async web framework |
| **OR-Tools** | 9.0+ | Google's CP-SAT optimization solver |
| **Pydantic** | 2.11+ | Data validation and settings |
| **Motor** | 3.7+ | Async MongoDB driver |
| **Celery** | 5.4+ | Distributed task queue |
| **Redis** | 5.2+ | Message broker and caching |
| **searoute** | 1.4.3 | Maritime routing calculations |
| **NumPy** | 1.26+ | Numerical computations |
| **Pandas** | 2.0+ | Data manipulation |

## Features

### Core Optimization

- **CP-SAT Solver**: Google OR-Tools constraint programming
- **Set Partitioning Model**: Pre-generates ~726 feasible routes
- **Multi-Objective**: Cost, time, emissions optimization
- **Solver Profiles**: Fast (15s), Balanced (60s), Thorough (300s)
- **Parallel Processing**: Multi-threaded route generation

### Services

- **Route Generator**: Creates all feasible voyage patterns
- **Cost Calculator**: Comprehensive maritime cost breakdown
- **Distance Calculator**: Realistic sea routes with searoute-py
- **EEOI Calculator**: Energy efficiency metrics
- **Infeasibility Analyzer**: Diagnoses unsolvable scenarios

### Data Management

- **MongoDB**: Primary database with async operations
- **In-Memory Fallback**: Works without external database
- **Redis Caching**: Fast access to frequently used data
- **Pydantic Validation**: Type-safe data models

## Quick Start

### Prerequisites

- Python 3.11 or higher
- MongoDB 5.0+ (optional)
- Redis 6.0+ (optional)

### Installation

```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### Environment Configuration

Create `.env` file:

```env
# Database
MONGODB_URL=mongodb://localhost:27017
DATABASE_NAME=hpcl_coastal_optimizer
USE_MONGODB=true

# Redis
REDIS_URL=redis://localhost:6379/0

# API
API_PREFIX=/api/v1
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# Security
SECRET_KEY=your-secret-key-change-in-production
API_KEYS=hpcl-demo-key,hpcl-admin-key

# Optimization
DEFAULT_SOLVER_PROFILE=balanced
MAX_SOLVE_TIME_SECONDS=60
```

### Running the Server

```bash
# Development mode with auto-reload
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Production mode
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

Server will be available at **http://localhost:8000**

API Documentation at **http://localhost:8000/docs**

### Optional: Celery Worker

```bash
# Start Celery worker for async tasks
celery -A app.core.celery_app worker --loglevel=info
```

## Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI application entry point
│   ├── api/                    # API route handlers
│   │   ├── routes.py           # Main API routes
│   │   └── challenge_routes.py # Challenge 7.1 endpoints
│   ├── core/                   # Core configuration
│   │   ├── config.py           # Settings management
│   │   └── celery_app.py       # Celery configuration
│   ├── data/                   # Data fixtures
│   │   ├── challenge_data.py   # Challenge 7.1 specifications
│   │   └── sample_data.py      # Sample vessels and ports
│   ├── models/                 # Data models
│   │   ├── database.py         # MongoDB models
│   │   └── schemas.py          # Pydantic schemas
│   ├── services/               # Business logic
│   │   ├── cp_sat_optimizer.py
│   │   ├── route_generator.py
│   │   ├── cost_calculator.py
│   │   ├── distance_calculator.py
│   │   ├── eeoi_calculator.py
│   │   ├── grid_manager.py
│   │   └── infeasibility_analyzer.py
│   └── tasks/                  # Async tasks
│       ├── optimization_tasks.py
│       ├── analytics_tasks.py
│       └── monitoring_tasks.py
├── tests/                      # Test suite
│   ├── test_cost_calc.py
│   ├── test_demand_satisfaction.py
│   ├── test_end_to_end.py
│   └── test_route_time.py
├── requirements.txt
├── pyproject.toml
└── README.md
```

## API Endpoints

### System Health

```http
GET /health
```

Returns system status and component health.

### Challenge 7.1 Optimization

```http
POST /api/v1/challenge/optimize
Content-Type: application/json

{
  "vessels": [...],  // Optional: custom vessel data
  "demands": [...],  // Optional: custom demand data
  "round_trip": false,
  "optimization_objective": "cost"
}
```

### Fleet Management

```http
GET /api/v1/fleet                    # Get all vessels
GET /api/v1/fleet/vessel/{id}        # Get specific vessel
PUT /api/v1/fleet/vessel/{id}/status # Update vessel status
```

### Port Management

```http
GET /api/v1/ports                    # Get all ports
GET /api/v1/ports/loading            # Get loading ports only
GET /api/v1/ports/unloading          # Get unloading ports only
```

### Optimization

```http
POST /api/v1/optimize                # Run optimization
GET /api/v1/optimize/task/{task_id}  # Check task status
GET /api/v1/optimize/results/{id}    # Get results
```

## Core Services

### CP-SAT Optimizer

Main optimization engine implementing the Set Partitioning Problem.

```python
from app.services.cp_sat_optimizer import HPCLCPSATOptimizer

optimizer = HPCLCPSATOptimizer(solver_profile="balanced")

result = await optimizer.optimize_hpcl_fleet(
    vessels=vessels,
    loading_ports=loading_ports,
    unloading_ports=unloading_ports,
    monthly_demands=demands,
    optimization_objective="cost"
)
```

**Algorithm**: Constraint Programming (CP-SAT)
**Approach**: Set Partitioning with pre-generated route columns
**Performance**: Optimal or near-optimal in < 60 seconds

### Route Generator

Generates all feasible voyage patterns for set partitioning.

```python
from app.services.route_generator import HPCLRouteOptimizer

route_gen = HPCLRouteOptimizer()

routes = await route_gen.generate_optimized_route_set(
    vessels=vessels,
    loading_ports=loading_ports,
    unloading_ports=unloading_ports,
    optimization_focus="cost"
)
```

**Output**: ~726 feasible routes satisfying all constraints
**Constraints**: Single loading port, max 2 discharge ports, capacity limits

### Cost Calculator

Calculates comprehensive voyage costs.

```python
from app.services.cost_calculator import HPCLCostCalculator

calculator = HPCLCostCalculator()

cost = calculator.calculate_voyage_cost(
    vessel=vessel,
    trip_time_days=0.5,
    cargo_volume_mt=50000,
    loading_port=loading_port,
    discharge_ports=[port1, port2]
)
```

**Components**: 
- Charter/operating costs (time-based)
- Bunker fuel costs (with speed optimization)
- Port charges (Indian coastal ports)
- Cargo handling costs
- Demurrage risk provisioning
- HPCL-specific compliance costs
- Monsoon season factors (15% increase during Jun-Sep)

### Distance Calculator

Computes maritime distances using actual sea routes.

```python
from app.services.distance_calculator import get_hpcl_route_distance

distance = get_hpcl_route_distance(
    origin_lat=18.9388,
    origin_lon=72.8354,
    dest_lat=13.0827,
    dest_lon=80.2707
)
```

**Method**: searoute-py for realistic maritime paths
**Fallback**: Haversine (Great Circle) distance

## Data Models

### HPCLVessel

```python
class HPCLVessel(BaseModel):
    id: str
    name: str
    capacity_mt: float
    daily_charter_rate: float
    speed_knots: float
    fuel_consumption_mt_per_day: float
    status: VesselStatus
    monthly_available_hours: float  # Default: 720 hours
```

### HPCLPort

```python
class HPCLPort(BaseModel):
    id: str
    name: str
    type: PortType  # loading or unloading
    latitude: float
    longitude: float
    state: str
```

### HPCLRoute

```python
class HPCLRoute(BaseModel):
    route_id: str
    vessel_id: str
    loading_port_id: str
    discharge_port_ids: List[str]
    total_cargo_mt: float
    trip_time_days: float
    total_cost: float
```

### OptimizationResult

```python
class OptimizationResult(BaseModel):
    request_id: str
    status: str
    total_cost: float
    total_cost_cr: str
    selected_routes: List[HPCLRoute]
    demand_satisfaction_rate: float
    fleet_utilization: float
```

## Configuration

### Solver Profiles

Defined in `app/core/config.py`:

```python
solver_profiles = {
    "quick": {
        "max_time_seconds": 15,
        "num_workers": 4,
        "log_search_progress": False
    },
    "balanced": {
        "max_time_seconds": 60,
        "num_workers": 8,
        "log_search_progress": True
    },
    "thorough": {
        "max_time_seconds": 300,
        "num_workers": 16,
        "log_search_progress": True
    }
}
```

### Database Configuration

```python
class HPCLSettings(BaseSettings):
    mongodb_url: str = "mongodb://localhost:27017"
    database_name: str = "hpcl_coastal_optimizer"
    use_mongodb: bool = True
    
    class Config:
        env_file = ".env"
```

## Testing

### Run All Tests

```bash
pytest tests/ -v
```

### Run Specific Test

```bash
pytest tests/test_end_to_end.py -v
```

### Test Coverage

```bash
pytest tests/ --cov=app --cov-report=html
```

### Test Categories

- **Unit Tests**: Individual service functions
- **Integration Tests**: Service interactions
- **End-to-End Tests**: Full optimization pipeline
- **Performance Tests**: Solver efficiency

## Performance Optimization

### Route Caching

```python
from functools import lru_cache

@lru_cache(maxsize=10000)
def calculate_trip_time_cached(
    loading_port: str,
    discharge_ports: Tuple[str, ...]
) -> float:
    return calculate_trip_time(loading_port, list(discharge_ports))
```

### Async Processing

```python
# Parallel route generation
tasks = [
    generate_routes_for_vessel(vessel)
    for vessel in vessels
]
routes = await asyncio.gather(*tasks)
```

### Database Indexing

```python
# Create indexes for fast queries
await db.vessels.create_index("id", unique=True)
await db.ports.create_index([("type", 1), ("state", 1)])
await db.optimization_results.create_index("request_id", unique=True)
```

## Error Handling

### Input Validation

Pydantic automatically validates all inputs:

```python
@router.post("/optimize")
async def optimize(request: OptimizationRequest):
    # Request automatically validated
    # Invalid data raises 422 Unprocessable Entity
    ...
```

### Infeasibility Analysis

```python
if status == cp_model.INFEASIBLE:
    analyzer = InfeasibilityAnalyzer(vessels, demands, fuel_price)
    suggestions = [
        *analyzer.analyze_capacity_shortage(),
        *analyzer.analyze_time_constraints(),
        *analyzer.analyze_vessel_constraints(),
        *analyzer.analyze_demand_distribution(),
        *analyzer.analyze_solver_settings(solve_time, num_workers)
    ]
    raise HTTPException(
        status_code=400,
        detail={
            "error": "Infeasible problem",
            "suggestions": [s.__dict__ for s in suggestions]
        }
    )
```

## Logging

### Configuration

```python
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)
```

### Usage

```python
logger.info("Starting optimization...")
logger.warning("High demand detected at port U2")
logger.error(f"Optimization failed: {error}")
```

## Deployment

### Production Server

```bash
# Using Gunicorn with Uvicorn workers
gunicorn app.main:app \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000
```

### Docker

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Environment Variables

```env
ENVIRONMENT=production
DEBUG=false
MONGODB_URL=mongodb+srv://user:pass@cluster.mongodb.net
SECRET_KEY=production-secret-key
```

## Common Issues

### Issue: MongoDB Connection Failed

**Solution**: System automatically falls back to in-memory storage.

### Issue: Slow Optimization

**Solution**: Use "fast" solver profile or reduce route generation scope.

### Issue: Infeasible Problem

**Solution**: Check total demand vs. fleet capacity, adjust demands or add vessels.

## Contributing

When contributing to the backend:

1. Follow PEP 8 style guidelines
2. Add type hints to all functions
3. Write unit tests for new services
4. Update API documentation
5. Use async/await for I/O operations

## Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [OR-Tools CP-SAT Guide](https://developers.google.com/optimization/cp/cp_solver)
- [Pydantic Documentation](https://docs.pydantic.dev/)
- [Motor (Async MongoDB) Documentation](https://motor.readthedocs.io/)

---

For frontend integration details, see [Frontend README](../frontend/README.md)

For overall project documentation, see [Main README](../README.md)
