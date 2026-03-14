# TECHNICAL ARCHITECTURE
## HPCL Challenge 7.1 — Coastal Vessel Optimization
### RouteX: Minimizing Bulk Cargo Transportation Cost

---

## 1. System Overview

RouteX is a full-stack optimization platform built specifically for HPCL Challenge 7.1. It solves a **Set Partitioning Problem** to minimize the total charter cost of transporting 440,000 MT/month of bulk cargo across a 9-vessel, 17-port Indian coastal network using Google OR-Tools CP-SAT.

```
┌────────────────────────────────────────────────────────────────────────┐
│                         RouteX System                                  │
│                                                                        │
│  ┌─────────────────────┐          ┌──────────────────────────────────┐ │
│  │   Next.js Frontend  │◄────────►│      FastAPI Backend             │ │
│  │   (Port 3000)       │  REST    │      (Port 8000)                 │ │
│  │   TypeScript + React│  JSON    │      Python 3.14 + OR-Tools      │ │
│  └─────────────────────┘          └──────────────────────────────────┘ │
│                                              │                         │
│                                   ┌──────────┴──────────┐             │
│                                   │    MongoDB           │             │
│                                   │    localhost:27017   │             │
│                                   │    (+ in-memory      │             │
│                                   │     fallback)        │             │
│                                   └─────────────────────┘             │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Directory Structure

```
/Users/midhunan/RouteX/
├── run.sh                              # Full-stack startup script
├── README.md
│
├── backend/                            # FastAPI + Python 3.14
│   ├── requirements.txt                # Python dependencies
│   ├── pyproject.toml                  # Pytest configuration
│   ├── app/
│   │   ├── main.py                     # FastAPI app entry point, CORS, lifespan
│   │   │
│   │   ├── api/
│   │   │   ├── challenge_routes.py     # ← PRIMARY: Challenge 7.1 endpoints (3 routes)
│   │   │   └── routes.py               # General REST API (17 endpoints)
│   │   │
│   │   ├── core/
│   │   │   ├── config.py               # HPCLSettings, solver profiles, constants
│   │   │   └── celery_app.py           # Celery + Redis task queue config
│   │   │
│   │   ├── data/
│   │   │   ├── challenge_data.py       # ← ALL PS tables (vessels, ports, trip times, demands)
│   │   │   └── sample_data.py          # Seed data generator for MongoDB startup
│   │   │
│   │   ├── models/
│   │   │   ├── schemas.py              # Pydantic models (HPCLVessel, HPCLPort, HPCLRoute, etc.)
│   │   │   └── database.py             # MongoDB + in-memory fallback DB layer
│   │   │
│   │   ├── services/
│   │   │   ├── cp_sat_optimizer.py     # ← CORE: OR-Tools CP-SAT solver (52KB)
│   │   │   ├── route_generator.py      # ← CORE: ~6534 feasible route generator
│   │   │   ├── grid_manager.py         # Maritime 0.01° grid (1.1km cells) for A*
│   │   │   ├── infeasibility_analyzer.py  # Infeasibility diagnosis & recommendations
│   │   │   ├── cost_calculator.py      # Informational only — NOT used in optimizer
│   │   │   ├── distance_calculator.py  # searoute-py maritime distances
│   │   │   └── eeoi_calculator.py      # IMO EEOI emissions metric
│   │   │
│   │   └── tasks/
│   │       ├── optimization_tasks.py   # Celery: optimize, validate, emergency re-opt
│   │       ├── analytics_tasks.py      # Celery: KPIs, reports, benchmarks
│   │       └── monitoring_tasks.py     # Celery: fleet/system health monitoring
│   │
│   └── tests/
│       ├── test_cost_calc.py           # Charter-only cost, no service time
│       ├── test_demand_satisfaction.py # Demand constraints, monthly hours boundary
│       ├── test_end_to_end.py          # Full optimize → result assertion
│       └── test_route_time.py          # Trip time tables, split route accuracy
│
└── frontend/                           # Next.js 14 + TypeScript + Tailwind CSS v4
    ├── package.json                    # Dependencies (deck.gl, mapbox-gl, recharts)
    ├── next.config.js
    ├── tsconfig.json                   # ES2017, strict, @/* alias
    └── src/
        ├── app/
        │   ├── globals.css             # Maritime Deep Blue theme
        │   ├── layout.tsx              # Root layout
        │   └── page.tsx                # Entry → <HPCLDashboard />
        │
        ├── components/
        │   ├── HPCLDashboard.tsx       # Main dashboard (66.7KB), all state management
        │   ├── ChallengeOutput.tsx     # Challenge 7.1 output display (69.8KB)
        │   ├── MaritimeMap.tsx         # Google Maps + JPS pathfinding
        │   ├── OptimizationPanel.tsx   # Solver parameter controls
        │   ├── EnhancedOptimizationPanel.tsx  # 4 solver presets
        │   ├── ResultsDisplay.tsx      # KPIs, route table, cost savings
        │   ├── FleetGanttChart.tsx     # 720-hour vessel timeline
        │   ├── FleetOverview.tsx       # Fleet stats and vessel status
        │   ├── RunStatusCard.tsx       # Real-time polling status
        │   ├── RunHistory.tsx          # localStorage-backed run history
        │   ├── RouteDetailsPanel.tsx   # Per-route detail view
        │   ├── ComparisonView.tsx      # Manual vs AI-Optimized comparison
        │   ├── MultiObjectiveControls.tsx  # 4-objective weight sliders
        │   ├── ExportButtons.tsx       # CSV / JSON export
        │   ├── GuidedTour.tsx          # 5-step onboarding tour
        │   ├── EnhancedErrorDisplay.tsx  # Smart error categorization
        │   ├── StatsCard.tsx           # Reusable KPI card
        │   ├── LoadingSkeleton.tsx     # Animated loading skeletons
        │   ├── HPCLHeader.tsx          # Header with fleet summary
        │   ├── ImprovedHeader.tsx      # Alternative animated header
        │   └── LazyComponents.tsx      # next/dynamic lazy wrappers
        │
        └── utils/
            ├── formatters.ts           # ₹/MT/NM/% number formatters
            ├── accessibility.ts/.tsx   # WCAG AA compliance utilities
            └── jps-pathfinding.ts      # Full JPS A* maritime pathfinder
```

---

## 3. Backend Architecture

### 3.1 FastAPI Application (`backend/app/main.py`)

```
FastAPI("HPCL Coastal Tanker Fleet Optimizer")
├── Lifespan: connect MongoDB → seed data → serve → disconnect
├── CORS: localhost:3000, localhost:3001, *
├── Routers:
│   ├── api_router    → /api/v1  (routes.py)
│   └── challenge_router → /api/v1  (challenge_routes.py)
├── GET  /              → system info
├── GET  /health        → basic health check
└── GET  /health/detailed → detailed health
```

### 3.2 Challenge API (`backend/app/api/challenge_routes.py`)

The **primary hackathon endpoint** — 3 routes under `/api/v1/challenge`:

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/challenge/data` | Returns all PS input tables |
| `POST` | `/challenge/optimize` | Runs CP-SAT, returns Challenge 7.1 table |
| `GET` | `/challenge/output-format` | Format documentation |

**Key output transformation** (`challenge_routes.py:159–227`):
```python
# Per-row trip cost split evenly for 2-port trips:
row_cost = (charter_rate_Cr × trip_days) / num_discharge_ports
```

### 3.3 Core Optimization Pipeline

```
POST /challenge/optimize
        │
        ▼
challenge_routes.py::run_challenge_optimization()
        │
        ├── Load PS data from challenge_data.py
        ├── Build HPCLVessel/HPCLPort/MonthlyDemand Pydantic objects
        │
        ▼
HPCLCPSATOptimizer(solver_profile)      # cp_sat_optimizer.py
        │
        ├── Step 1: HPCLRouteOptimizer.generate_optimized_route_set()
        │              └── HPCLRouteGenerator.generate_all_feasible_routes()
        │                      ├── _generate_direct_routes()   (66/vessel)
        │                      ├── _generate_split_routes()    (660/vessel)
        │                      └── _prune_routes()             (>720h removed)
        │
        ├── Step 2: Pre-solve feasibility check
        │           └── if max_deliverable < total_demand → return infeasible
        │
        ├── Step 3: _initialize_cp_model()     → CpModel + CpSolver
        ├── Step 4: _create_decision_variables()
        │           ├── route_count[r] : IntVar[0, max_trips]
        │           └── cargo_to[r][p] : IntVar[0, capacity × max_trips]
        │
        ├── Step 5: _add_demand_constraints()     (>= demand per port)
        ├── Step 5: _add_vessel_time_constraints() (≤ 72,000 centihours)
        ├── Step 5: _add_hpcl_operational_constraints() (no arbitrary cap)
        │
        ├── Step 6: _set_optimization_objective()  (cost×100 scaling)
        │
        ├── Step 7: solver.Solve(model)
        │           └── Returns: OPTIMAL / FEASIBLE / INFEASIBLE
        │
        └── Step 8: _extract_optimization_result()
                    ├── Aggregate by voyage pattern
                    ├── Read cargo_to[r][p] solver values
                    ├── Build HPCLRoute Pydantic objects
                    └── Return OptimizationResult
```

### 3.4 Route Generator (`backend/app/services/route_generator.py`)

```
HPCLRouteGenerator
├── _generate_direct_routes()
│     6 loading × 11 unloading = 66 routes per vessel
│
├── _generate_split_routes()
│     6 loading × C(11,2) × 2 orderings = 660 routes per vessel
│     Both L→U1→U2 AND L→U2→U1 generated (U→U matrix is asymmetric)
│
├── _calculate_route_metrics()
│     ├── calculate_trip_time_from_tables()  ← EXACT PS table lookup
│     ├── total_cost = charter_rate × trip_days  (charter only, no fuel/port)
│     └── trip_centihours = int(round(hours × 100))  (for CP-SAT precision)
│
└── _prune_routes()
      ├── REMOVE: trip_time > 720 hours (physically impossible)
      └── KEEP: all others (no heuristic cost/time-per-MT culling)

Total: ~726 routes/vessel × 9 vessels = ~6,534 routes
```

### 3.5 CP-SAT Optimizer (`backend/app/services/cp_sat_optimizer.py`)

Key classes and methods:

| Method | Location | Purpose |
|--------|----------|---------|
| `optimize_hpcl_fleet()` | Line 49 | Main async entry point |
| `_create_decision_variables()` | Line 240 | IntVar route_count + cargo_to |
| `_add_demand_constraints()` | Line 318 | ≥ demand per port |
| `_add_vessel_time_constraints()` | Line 387 | ≤ 72,000 centihours |
| `_set_optimization_objective()` | Line 460 | cost×100 minimize |
| `_extract_optimization_result()` | Line 517 | Pattern aggregation + HPCLRoute assembly |

### 3.6 Data Layer (`backend/app/data/challenge_data.py`)

All Problem Statement (PS) tables live here as pure Python functions:

| Function | Returns | Size |
|----------|---------|------|
| `get_challenge_vessels()` | 9 tanker dicts | T1–T9 specs |
| `get_challenge_loading_ports()` | 6 port dicts | L1–L6 |
| `get_challenge_unloading_ports()` | 11 port dicts | U1–U11 with demands |
| `get_challenge_trip_times_load_to_unload()` | 6×11 dict | Days per L→U leg |
| `get_challenge_trip_times_unload_to_unload()` | 11×11 dict | Days per U→U leg |
| `get_monthly_demands()` | 11 demand dicts | MT/month per port |
| `validate_challenge_data()` | None/AssertionError | Structural invariants |

### 3.7 Pydantic Models (`backend/app/models/schemas.py`)

```
HPCLVessel          Tanker specs (capacity, charter_rate, speed, monthly_hours)
HPCLPort            Port (id, type, lat/lon, loading/unloading_rate, charges)
MonthlyDemand       port_id + demand_mt (validated 0–1,000,000 MT)
HPCLRoute           Selected route with execution_count, cargo_split
OptimizationResult  Full result (selected_routes, vessel_schedules, KPIs)
VesselSchedule      Monthly Gantt activities per tanker
TaskStatus          Celery async task lifecycle
```

### 3.8 Configuration (`backend/app/core/config.py`)

Solver profiles controlling time limit and parallelism:

| Profile | Max Time | Workers | Use Case |
|---------|----------|---------|---------|
| `quick` | 15s | 2 | Demo/hackathon |
| `balanced` | 30s | 4 | Default |
| `thorough` | 120s | 8 | Better solution |
| `production` | 600s | 8 | Full optimization |

---

## 4. Frontend Architecture

### 4.1 Component Hierarchy

```
page.tsx
└── HPCLDashboard.tsx  (66.7KB — all top-level state)
    ├── HPCLHeader.tsx / ImprovedHeader.tsx
    │
    ├── Tab: Overview
    │   ├── FleetOverview.tsx       (fleet stats, vessel status)
    │   └── OptimizationPanel.tsx   (solver params, run button)
    │
    ├── Tab: Live Map
    │   └── MaritimeMap.tsx (Google Maps + JPS + animated vessels)
    │       └── jps-pathfinding.ts  (Jump Point Search A*)
    │
    ├── Tab: Results
    │   ├── RunStatusCard.tsx       (polls /results/{id} every 2s)
    │   ├── ResultsDisplay.tsx      (KPIs, route table, cost savings)
    │   ├── FleetGanttChart.tsx     (720h Gantt)
    │   └── ComparisonView.tsx      (manual vs optimized)
    │
    ├── Tab: Challenge Output
    │   └── ChallengeOutput.tsx (69.8KB — full PS format table)
    │       ├── Summary stats cards
    │       ├── Source│Destination│Tanker│Volume│Cost table
    │       ├── Trips grouped view
    │       ├── Demand satisfaction bars
    │       └── Fleet utilization bars
    │
    ├── Tab: History
    │   └── RunHistory.tsx  (localStorage "hpcl-optimization-history")
    │
    └── Utility Components
        ├── GuidedTour.tsx          (5-step onboarding, localStorage)
        ├── EnhancedErrorDisplay.tsx (smart error categorization)
        ├── ExportButtons.tsx        (CSV / JSON download)
        ├── MultiObjectiveControls.tsx (4-objective weight sliders)
        ├── LoadingSkeleton.tsx      (animate-pulse skeletons)
        └── LazyComponents.tsx       (next/dynamic ssr:false wrappers)
```

### 4.2 State Management

All state is managed in `HPCLDashboard.tsx` via React `useState`/`useEffect` hooks — no external state library:

```typescript
const [vessels, setVessels]                     // HPCLVessel[]
const [optimizationResult, setOptimizationResult] // OptimizationResult | null
const [activeTab, setActiveTab]                 // string
const [currentRouteIndex, setCurrentRouteIndex] // number
const [isOptimizing, setIsOptimizing]           // boolean
```

### 4.3 API Communication

All API calls use `axios` to `http://localhost:8000`:

```typescript
// Primary call (HPCLDashboard.tsx)
POST /api/v1/challenge/optimize
Body: { solver_profile, optimization_objective, round_trip }

// Challenge Output (ChallengeOutput.tsx)
POST /api/v1/challenge/optimize

// Status polling (RunStatusCard.tsx, every 2s)
GET /api/v1/results/{resultId}
```

### 4.4 Maritime Map (`frontend/src/components/MaritimeMap.tsx`)

```
Google Maps API  (API key hardcoded — AIzaSyCPR...)
        │
        ├── Port markers  (green=loading, blue=unloading)
        ├── Route polylines with directional arrows
        ├── Animated vessel positions (playback 0.5x–5x speed)
        └── JPS pathfinding (jps-pathfinding.ts)
                ├── 0.1° grid (~11km resolution)
                ├── India mainland + Sri Lanka land polygons
                ├── 8-direction Jump Point Search A*
                └── createOffshoreRoute() fallback
                    ├── West coast → Arabian Sea (lon 71.5)
                    ├── East coast → Bay of Bengal (lon 85.0)
                    └── Cross-coast → southern tip (lat 7.0, lon 77.5)
```

---

## 5. Technology Stack

### Backend
| Component | Technology | Version |
|-----------|-----------|---------|
| Web Framework | FastAPI | ≥0.117.1 |
| Runtime | Python | 3.14 |
| Solver | OR-Tools CP-SAT | ≥9.0.0 |
| Data Validation | Pydantic | ≥2.11.0 |
| ASGI Server | Uvicorn | ≥0.37.0 |
| Database | MongoDB (Motor async) | 3.7.1 |
| In-Memory DB | Python dict fallback | — |
| Task Queue | Celery + Redis | 5.4.0 |
| Maritime Routing | searoute | 1.4.3 |
| LP Solver (alt) | PuLP | ≥2.9.0 |
| Testing | pytest + pytest-asyncio | 8.3.4 |

### Frontend
| Component | Technology | Version |
|-----------|-----------|---------|
| Framework | Next.js | ^14.2.18 |
| Language | TypeScript | — |
| UI Library | React | ^18.3.1 |
| Styling | Tailwind CSS | ^4 |
| 3D Maps | deck.gl | ^9.2.2 |
| Map Tiles | Mapbox GL / Google Maps | ^3.16.0 |
| Charts | Recharts | ^3.4.1 |
| HTTP Client | Axios | ^1.13.2 |
| Icons | Lucide React + Phosphor | — |
| PostCSS | @tailwindcss/postcss | — |

---

## 6. Key Design Decisions

| Decision | Rationale | Reference |
|----------|-----------|-----------|
| **CP-SAT over LP** | Integer variables for execution_count; handles discrete trip counts | `cp_sat_optimizer.py:1` |
| **Cost = charter rate × days only** | PS definition: no fuel/port charges in objective | `route_generator.py:406–410` |
| **No service time added** | PS tables encode full voyage duration | `route_generator.py:36–36` |
| **≥ (not =) for demand** | GCD of fleet capacities (25,000 MT) cannot divide 440,000 MT exactly | `cp_sat_optimizer.py:327–338` |
| **Centihour scaling ×100** | Avoids integer rounding error (9.6h → 960 centihours, not 10h) | `cp_sat_optimizer.py:410–419` |
| **Cost scaled ×100** | Preserves paise-level precision in CP-SAT integer arithmetic | `cp_sat_optimizer.py:482` |
| **Both orderings for split routes** | U→U matrix is asymmetric (L→U1→U2 ≠ L→U2→U1) | `route_generator.py:357` |
| **No voyage count cap** | PS does not specify max voyages; time budget is sufficient | `cp_sat_optimizer.py:449–453` |
| **cargo_to = total across all trips** | IntVar per port accumulates across all execution_count trips | `cp_sat_optimizer.py:244–258` |
| **In-memory MongoDB fallback** | Resilience when MongoDB is not running | `database.py` |

---

## 7. Running the System

```bash
# Backend
cd backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Frontend
cd frontend
npm run dev

# Or both together
./run.sh
```

**Base URLs:**
- Backend API: `http://localhost:8000`
- Frontend: `http://localhost:3000`
- API Docs (Swagger): `http://localhost:8000/docs`
- API Docs (ReDoc): `http://localhost:8000/redoc`

---

## 8. Testing

```bash
cd backend
pytest tests/ -v

# Test files:
# tests/test_cost_calc.py         — charter-only cost formula
# tests/test_demand_satisfaction.py — constraint satisfaction + monthly hours
# tests/test_end_to_end.py        — full optimization pipeline
# tests/test_route_time.py        — PS trip time table accuracy
```

---

*References: All architectural decisions sourced from direct code analysis.*
*Key files: `backend/app/main.py`, `backend/app/api/challenge_routes.py`, `backend/app/services/cp_sat_optimizer.py`, `backend/app/services/route_generator.py`, `backend/app/data/challenge_data.py`*
