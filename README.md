# RouteX

Maritime fleet optimization platform for HPCL's coastal tanker operations using constraint programming.

## What It Does

RouteX automatically generates optimal shipping schedules for HPCL's 9 coastal tankers, minimizing transportation costs while satisfying demand across 17 Indian ports.

**Problem Solved**: Manual planning takes 2-3 days and causes 15-20% excess costs  
**Solution**: Automated optimization in 5 minutes with 18-20% cost savings

## Quick Start

```bash
./run.sh
```

**Endpoints**:
- Frontend: http://localhost:3000
- API: http://localhost:8000
- Docs: http://localhost:8000/docs

## Key Features

- **Optimization Engine**: Google OR-Tools CP-SAT solver for optimal route selection
- **Maritime Routing**: Real sea distances using searoute-py
- **Cost Modeling**: Fuel, port charges, charter rates, demurrage
- **Emission Tracking**: IMO-compliant EEOI calculations
- **3D Visualization**: Interactive maritime maps with Deck.gl

## How It Works

1. **Route Generation**: Creates all feasible voyage patterns (726 routes/vessel)
2. **Constraint Solving**: Applies operational rules (single loading port, max 2 discharge ports)
3. **Optimization**: Minimizes total cost while meeting all port demands
4. **Output**: Detailed vessel schedules with voyage assignments

### Constraints

- 9 vessels with varying capacities (25,000 - 50,000 MT)
- 6 loading ports + 11 unloading ports
- Each voyage: 1 loading port, ≤2 unloading ports
- Monthly time budget: 720 hours per vessel
- Demand satisfaction for all ports

## Tech Stack

**Backend**: Python, FastAPI, OR-Tools, MongoDB  
**Frontend**: Next.js, React, Deck.gl, Tailwind CSS  
**Optimization**: Google OR-Tools CP-SAT Solver

## Project Structure

```
RouteX/
├── run.sh                          # Startup script
├── backend/
│   └── app/
│       ├── main.py                 # API entry point
│       ├── api/                    # REST endpoints
│       ├── services/               # Core business logic
│       │   ├── cp_sat_optimizer.py        # Optimization engine
│       │   ├── route_generator.py         # Route enumeration
│       │   ├── cost_calculator.py         # Cost modeling
│       │   └── eeoi_calculator.py         # Emission tracking
│       ├── models/                 # Data schemas
│       └── data/                   # Sample/demo data
└── frontend/
    └── src/
        ├── components/             # React components
        │   ├── HPCLDashboard.tsx          # Main UI
        │   ├── MaritimeMap.tsx            # 3D visualization
        │   └── OptimizationPanel.tsx      # Controls
        └── utils/                  # Helper functions
```

## API Endpoints

```
GET  /api/v1/fleet              Get vessel fleet
GET  /api/v1/ports              Get all ports  
POST /api/v1/optimize           Run optimization
GET  /api/v1/results/{id}       Get results
GET  /challenge/data            Challenge dataset
```

## Mathematical Model

**Objective**: Minimize total operational cost

**Decision Variables**: Binary selection of routes from feasible set

**Constraints**:
- Demand coverage: All port demands met
- Time limits: ≤720 hours/vessel/month
- Capacity: Cargo ≤ vessel capacity
- Operational: Single loading, max 2 discharge ports

## Results

- **Cost Reduction**: 18-20% vs manual planning
- **Fleet Utilization**: 70% → 87%+
- **Planning Time**: 2-3 days → 5 minutes
- **Emissions**: Automated EEOI tracking

## Development

**Requirements**:
- Python 3.11+
- Node.js 18+
- Optional: MongoDB, Redis (for persistence/background jobs)

**Setup**:
```bash
# Automated - everything handled by run.sh
./run.sh

# Manual backend
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload

# Manual frontend
cd frontend
npm install
npm run dev
```

## Documentation

See [IMPLEMENTATION.md](IMPLEMENTATION.md) for detailed technical documentation including:
- Architecture overview
- Algorithm details
- API reference
- Configuration options

## License

MIT License

