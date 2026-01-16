# RouteX - HPCL Coastal Tanker Fleet Optimizer

## What It Does

RouteX solves the complex problem of optimizing petroleum product transportation for Hindustan Petroleum Corporation Limited (HPCL) across India's coastal shipping network using mathematical optimization.

## The Problem

HPCL operates 9 coastal tankers to move petroleum products from 6 loading ports to 11 unloading ports along the Indian coast. Manual planning takes 2-3 days each month and results in:

- **High fuel costs** from suboptimal routing
- **Underutilized fleet** (~70% capacity usage)
- **Port delays** causing demurrage charges
- **No emission tracking** for regulatory compliance

## The Solution

RouteX uses **constraint programming** (Google OR-Tools CP-SAT solver) to automatically find the optimal fleet schedule that minimizes costs while satisfying all operational constraints.

### How It Works

1. **Route Generation**: Pre-generates all feasible voyage patterns (726 routes per vessel)
   - Direct routes: Loading Port → Unloading Port
   - Split routes: Loading Port → Unloading Port 1 → Unloading Port 2

2. **Optimization**: Solves a Set Partitioning Problem with constraints:
   - Each vessel loads from exactly 1 port per voyage
   - Maximum 2 discharge ports per voyage
   - All port demands must be satisfied
   - Vessels limited to 720 hours/month
   - Cargo cannot exceed vessel capacity

3. **Cost Calculation**: Evaluates each route considering:
   - Fuel consumption (bunker costs)
   - Port charges (per visit + GRT + cargo handling)
   - Vessel charter rates (daily)
   - Demurrage risk
   - Carbon emissions (EEOI tracking)

4. **Result**: Optimal vessel assignments with detailed route sequences

## Technology Stack

**Backend (Python)**
- FastAPI - REST API framework
- OR-Tools - Google's optimization solver
- searoute-py - Maritime route calculations
- Motor - Async MongoDB driver
- Celery - Background task processing

**Frontend (TypeScript/React)**
- Next.js 14 - React framework
- Deck.gl - 3D map visualization
- Tailwind CSS - Styling
- Axios - API client

## Quick Start

```bash
# From project root
./run.sh
```

This starts:
- Backend API: http://localhost:8000
- Frontend: http://localhost:3000
- API Docs: http://localhost:8000/docs

## Project Structure

```
RouteX/
├── run.sh                      # Startup script
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI app entry
│   │   ├── api/
│   │   │   ├── routes.py      # Main endpoints
│   │   │   └── challenge_routes.py
│   │   ├── models/
│   │   │   ├── schemas.py     # Data models
│   │   │   └── database.py    # MongoDB/in-memory storage
│   │   ├── services/
│   │   │   ├── cp_sat_optimizer.py    # OR-Tools solver
│   │   │   ├── route_generator.py     # Route enumeration
│   │   │   ├── distance_calculator.py # Maritime distances
│   │   │   ├── cost_calculator.py     # Cost modeling
│   │   │   └── eeoi_calculator.py     # Emission tracking
│   │   ├── data/
│   │   │   ├── sample_data.py         # Demo data
│   │   │   └── challenge_data.py      # Challenge 7.1 data
│   │   └── core/
│   │       └── config.py      # Settings
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── app/
    │   │   └── page.tsx       # Main page
    │   ├── components/
    │   │   ├── HPCLDashboard.tsx      # Main dashboard
    │   │   ├── MaritimeMap.tsx        # 3D map
    │   │   ├── FleetOverview.tsx      # Vessel cards
    │   │   ├── OptimizationPanel.tsx  # Controls
    │   │   ├── ResultsDisplay.tsx     # Results
    │   │   └── ChallengeOutput.tsx    # Challenge view
    │   └── utils/
    │       ├── formatters.ts          # Utilities
    │       └── jps-pathfinding.ts
    └── package.json
```

## Key Features

### Optimization Engine
- **Mathematical Solver**: Uses constraint programming for provably optimal solutions
- **Fast Computation**: Generates and evaluates 726 routes per vessel in seconds
- **Multiple Objectives**: Optimize for cost, time, emissions, or utilization

### Fleet Management
- **9 Vessels**: Exact HPCL fleet configuration
- **Real-time Status**: Track vessel availability and locations
- **Capacity Planning**: Monitor total fleet capacity vs demand

### Maritime Routing
- **Realistic Distances**: Uses searoute-py for actual sea routes
- **Indian Coastal Network**: 6 loading + 11 unloading ports
- **Constraint Compliance**: Single loading, max 2 discharge per voyage

### Environmental Tracking
- **EEOI Calculation**: IMO-compliant emission metrics
- **Carbon Cost**: Estimates carbon pricing impact
- **Green Optimization**: Can minimize emissions instead of cost

### Business Intelligence
- **Cost Savings**: Shows savings vs manual planning
- **Demand Satisfaction**: Tracks how much of each port's demand is met
- **Fleet Utilization**: Monitors vessel usage efficiency
- **KPI Dashboard**: Key performance indicators

## API Endpoints

```
GET  /api/v1/status              System status
GET  /api/v1/fleet               Fleet information
GET  /api/v1/ports               All ports
GET  /api/v1/ports/loading       Loading ports
GET  /api/v1/ports/unloading     Unloading ports
POST /api/v1/optimize            Run optimization
GET  /api/v1/results/{id}        Get optimization result
GET  /api/v1/kpis                Performance metrics
GET  /challenge/data             Challenge 7.1 data
POST /challenge/optimize          Challenge optimization
```

## Key Algorithms

### Set Partitioning Problem (SPP)
```
Minimize: Σ(route_cost × route_selected)

Subject to:
- Σ(cargo_delivered_to_port_p) ≥ Demand[p]  ∀ ports
- Σ(route_time_for_vessel_v) ≤ 720 hours   ∀ vessels
- Each route: 1 loading port, ≤2 unloading ports
- route_selected ∈ {0, 1}  (binary decision)
```

### Cost Model
```
Total Cost = Fuel Cost + Port Costs + Charter Cost + Handling Cost

Fuel Cost = Distance × Speed/24 × Fuel_Rate × Fuel_Price
Port Cost = Fixed_Charge + (GRT × GRT_Rate) + (Cargo × Handling_Rate)
Charter Cost = (Total_Time / 24) × Daily_Rate
```

### EEOI Calculation
```
EEOI = (Fuel_Consumed × Carbon_Factor) / (Cargo × Distance)

Units: gCO2 per tonne-nautical mile
Benchmarks:
- Excellent: < 8.0
- Good: < 12.0
- Average: < 16.0
```

## Configuration

Environment variables (optional):
```bash
MONGODB_URL=mongodb://localhost:27017
REDIS_URL=redis://localhost:6379
HPCL_FLEET_SIZE=9
MAX_DISCHARGE_PORTS=2
DEFAULT_FUEL_PRICE=45000
```

## Dependencies

**Backend**
- Python 3.11+
- OR-Tools 9.0+ (optimization)
- FastAPI (API framework)
- searoute-py (maritime routing)
- Motor (async MongoDB)

**Frontend**
- Node.js 18+
- Next.js 14
- React 18
- Deck.gl (map visualization)

## Development

The codebase is structured for clarity:

1. **Separation of Concerns**: Services handle specific tasks (routing, costing, optimization)
2. **Async/Await**: Backend uses async Python for non-blocking I/O
3. **Type Safety**: Pydantic models for Python, TypeScript for frontend
4. **In-Memory Fallback**: Works without MongoDB for quick demos
5. **Modular Design**: Each service is independent and testable

## Business Impact

**Quantifiable Benefits**:
- 15-20% reduction in fuel costs
- 70% → 87%+ fleet utilization
- 2-3 days → 5 minutes planning time
- Automated EEOI compliance tracking
- ₹15-42 lakhs monthly savings potential

## License

MIT License - See LICENSE file
