# API SPECIFICATION
## HPCL Challenge 7.1 — RouteX Backend API
### FastAPI + OR-Tools Coastal Tanker Optimization Service

---

## Base URL

```
http://localhost:8000
```

Interactive documentation:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

---

## Authentication

No authentication required. CORS is open to all origins (`*`) and explicitly to `localhost:3000` and `localhost:3001`.

Reference: `backend/app/main.py:CORS middleware`

---

## 1. System Endpoints

### 1.1 Root Info
```
GET /
```
Returns system metadata.

**Response `200`:**
```json
{
  "name": "HPCL Coastal Tanker Fleet Optimizer",
  "version": "1.0.0",
  "status": "running"
}
```

### 1.2 Health Check
```
GET /health
```
Basic liveness probe.

**Response `200`:**
```json
{
  "status": "healthy"
}
```

### 1.3 Detailed Health
```
GET /health/detailed
```
**Response `200`:**
```json
{
  "status": "healthy",
  "database": "connected|disconnected",
  "timestamp": "2026-03-14T10:00:00"
}
```

---

## 2. Challenge 7.1 Endpoints (Primary)

Router prefix: `/api/v1/challenge`
Source: `backend/app/api/challenge_routes.py`

### 2.1 Get Challenge Data
```
GET /api/v1/challenge/data
```

Returns all raw Problem Statement tables.

**Response `200`:**
```json
{
  "vessels": [
    {
      "id": "T1",
      "name": "Tanker T1",
      "imo_number": "IMO1000001",
      "capacity_mt": 50000,
      "charter_rate_display_cr_per_day": 0.63,
      "daily_charter_rate": 6300000,
      "grt": 25000,
      "length_m": 200,
      "beam_m": 32,
      "draft_m": 12.0,
      "speed_knots": 14.0,
      "fuel_consumption_mt_per_day": 25.0,
      "crew_size": 20,
      "status": "available",
      "current_port": null
    }
    // ... T2 through T9
  ],
  "loading_ports": [
    {
      "id": "L1",
      "name": "Loading Port L1",
      "code": "L1",
      "type": "loading",
      "latitude": 19.0,
      "longitude": 72.8,
      "state": "Maharashtra",
      "storage_capacity": 999999999,
      "loading_rate": 2000.0,
      "port_charges_per_visit": 100000,
      "grt_charge": 2.0,
      "cargo_handling_rate": 250.0
    }
    // ... L2 through L6
  ],
  "unloading_ports": [
    {
      "id": "U1",
      "name": "Unloading Port U1",
      "code": "U1",
      "type": "unloading",
      "demand_mt": 40000,
      "latitude": 18.5,
      "longitude": 73.0,
      "state": "Maharashtra",
      "unloading_rate": 1500.0
    }
    // ... U2 through U11
  ],
  "demands": [
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
  ],
  "trip_times_load_unload": {
    "L1": {"U1": 0.4, "U2": 0.7, "U3": 0.4, "U4": 0.4, "U5": 0.4,
           "U6": 0.6, "U7": 0.5, "U8": 0.4, "U9": 0.3, "U10": 0.5, "U11": 0.7},
    // ... L2 through L6
  },
  "trip_times_unload_unload": {
    "U1": {"U1": 0.0, "U2": 0.35, "U3": 0.19, ...},
    // ... U2 through U11
  }
}
```

---

### 2.2 Run Optimization ⭐ (Primary Challenge Endpoint)
```
POST /api/v1/challenge/optimize
```

Runs CP-SAT optimization and returns results in Challenge 7.1 format.

**Request Body** (all fields optional — defaults use PS data):
```json
{
  "vessels": [
    {
      "id": "T1",
      "capacity_mt": 50000,
      "charter_rate_cr_per_day": 0.63
    }
  ],
  "demands": [
    {
      "port_id": "U1",
      "demand_mt": 40000
    }
  ],
  "round_trip": false,
  "optimization_objective": "cost",
  "solver_profile": "quick"
}
```

**Request Schema** (`challenge_routes.py:OptimizationInput`):

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `vessels` | `VesselInput[]` | PS default (9 tankers) | Custom vessel fleet |
| `demands` | `DemandInput[]` | PS default (440,000 MT) | Custom port demands |
| `round_trip` | `bool` | `false` | Include return voyage in display |
| `optimization_objective` | `string` | `"cost"` | `"cost"` / `"time"` / `"emissions"` / `"balanced"` |
| `solver_profile` | `string` | `"quick"` | `"quick"` / `"balanced"` / `"thorough"` / `"production"` |

**Solver Profile Time Limits** (`config.py`):

| Profile | Max Time | Workers |
|---------|----------|---------|
| `quick` | 15s | 2 |
| `balanced` | 30s | 4 |
| `thorough` | 120s | 8 |
| `production` | 600s | 8 |

---

**Response `200` — Success:**
```json
{
  "status": "success",
  "solution_id": "hpcl_opt_1741952400",
  "optimization_status": "optimal",
  "solve_time_seconds": 3.47,

  "optimization_results": [
    {
      "Source": "L2",
      "Destination": "U2",
      "Tanker": "T2",
      "Volume (MT)": 50000,
      "Trip Cost (Rs Cr)": 0.294,
      "Trip ID": "Trip 1"
    },
    {
      "Source": "L1",
      "Destination": "U7",
      "Tanker": "T1",
      "Volume (MT)": 50000,
      "Trip Cost (Rs Cr)": 0.315,
      "Trip ID": "Trip 2"
    }
    // ... one row per (tanker, trip, discharge_port)
  ],

  "trips": [
    {
      "trip_id": "Trip 1",
      "vessel_id": "T2",
      "loading_port": "L2",
      "discharge_ports": ["U2"],
      "trip_duration_days": 0.6,
      "hpcl_charter_cost_cr": 0.294,
      "cargo_deliveries": [
        {"port": "U2", "volume_mt": 50000}
      ]
    }
    // ... all trips
  ],

  "summary": {
    "total_trips": 18,
    "total_routes": 20,
    "hpcl_transportation_cost_cr": 8.4532,
    "total_cost_cr": 8.4532,
    "total_volume_mt": 450000,
    "total_demand_mt": 440000,
    "satisfied_demand_mt": 440000,
    "demand_satisfaction_percentage": 100.0,
    "safety_buffer_mt": 10000,
    "fleet_utilization": 76.3,
    "round_trip": false
  },

  "kpis": {
    "total_cost": 84532000.0,
    "total_distance_nm": 12450.5,
    "total_cargo_mt": 450000,
    "fleet_utilization": 76.3,
    "demand_satisfaction_rate": 100.0
  },

  "recommendations": [
    "Fleet utilization at 76.3% — consider consolidating routes for Vessel T7",
    "All 11 unloading ports satisfied with ≥ demanded volumes"
  ],

  "timestamp": "2026-03-14T10:30:00.123456"
}
```

**Response `200` — Infeasible:**
```json
{
  "status": "infeasible",
  "error": "No feasible solution found - demands cannot be satisfied with available fleet",
  "recommendations": [
    "Total demand (1,000,000 MT) exceeds maximum fleet deliverable capacity",
    "Consider adding vessels or reducing demand"
  ],
  "unmet_demand": {
    "U1": 40000,
    "U2": 135000
  },
  "timestamp": "2026-03-14T10:30:00.123456"
}
```

**Response `500` — Error:**
```json
{
  "detail": "Optimization failed: <error message>"
}
```

---

**Key Output Format Notes:**

1. **Each row** in `optimization_results` represents cargo delivery from one loading port to one unloading port for one trip.
2. **Two-port trips** generate **two rows** — one per discharge port.
3. **Trip Cost per row** = (charter_rate × trip_days) / num_discharge_ports. Summing all "Trip Cost" rows = correct total cost (no double-counting).
4. **Volume** = total cargo delivered to that port across all executions / execution_count per trip.

Reference: `challenge_routes.py:199–218`

---

### 2.3 Output Format Documentation
```
GET /api/v1/challenge/output-format
```

Returns example rows and column definitions.

**Response `200`:**
```json
{
  "format_description": "Challenge 7.1 Output Format",
  "columns": ["Source", "Destination", "Tanker", "Volume (MT)", "Trip Cost (Rs Cr)"],
  "example_rows": [
    {
      "Source": "L1",
      "Destination": "U1",
      "Tanker": "T1",
      "Volume (MT)": 40000,
      "Trip Cost (Rs Cr)": 0.504
    },
    {
      "Source": "L2",
      "Destination": "U2",
      "Tanker": "T2",
      "Volume (MT)": 50000,
      "Trip Cost (Rs Cr)": 0.539
    }
  ],
  "notes": [
    "Each row represents cargo delivery from one loading port to one unloading port",
    "A tanker loading from one port and discharging at two ports will have two rows",
    "Trip Cost per row = (Charter Hire Rate × Total Trip Duration) / number of discharge ports",
    "Summing the Trip Cost column gives the correct total transportation cost"
  ]
}
```

---

## 3. General REST API Endpoints

Router prefix: `/api/v1`
Source: `backend/app/api/routes.py`

### 3.1 Fleet Management

#### Get Full Fleet
```
GET /api/v1/fleet
```
Returns all 9 HPCL vessels with their specs and current status.

**Response `200`:**
```json
{
  "vessels": [HPCLVessel...],
  "total_vessels": 9,
  "available_vessels": 9,
  "total_capacity_mt": 400000
}
```

#### Get Vessel Details
```
GET /api/v1/fleet/vessel/{vessel_id}
```
**Path Parameter:** `vessel_id` — e.g., `T1`, `T2`, ..., `T9`

**Response `200`:** Single `HPCLVessel` object
**Response `404`:** Vessel not found

#### Update Vessel Status
```
PUT /api/v1/fleet/vessel/{vessel_id}/status
```
**Body:**
```json
{"status": "available|loading|sailing|unloading|maintenance|idle"}
```

---

### 3.2 Port Management

#### Get All Ports
```
GET /api/v1/ports
```
Returns all 17 ports (6 loading + 11 unloading).

**Response `200`:**
```json
{
  "loading_ports": [HPCLPort...],
  "unloading_ports": [HPCLPort...],
  "total_ports": 17
}
```

#### Get Loading Ports Only
```
GET /api/v1/ports/loading
```

#### Get Unloading Ports Only
```
GET /api/v1/ports/unloading
```

#### Compute Distance Matrix
```
POST /api/v1/ports/distance-matrix
```
Computes maritime (sea route) distances between all port pairs using `searoute`.
Runs as background task.

**Response `202`:**
```json
{"task_id": "uuid-string", "status": "submitted"}
```

---

### 3.3 Optimization (Async via Background Task)

#### Submit Optimization Request
```
POST /api/v1/optimize
```
**Body (`OptimizationRequest`):**
```json
{
  "month": "2026-03",
  "demands": [
    {"port_id": "U1", "demand_mt": 40000, "priority": "high"}
  ],
  "available_vessels": ["T1", "T2", "T3"],
  "fuel_price_per_mt": 45000.0,
  "optimize_for": "cost",
  "max_solve_time_seconds": 300
}
```

| Field | Type | Default | Values |
|-------|------|---------|--------|
| `month` | `string` | required | `"YYYY-MM"` |
| `demands` | `MonthlyDemand[]` | required | max 11 ports |
| `available_vessels` | `string[]` | all 9 | vessel IDs |
| `fuel_price_per_mt` | `float` | 45000.0 | Rs/MT |
| `optimize_for` | `string` | `"cost"` | `cost|time|emissions|balanced` |
| `max_solve_time_seconds` | `int` | 300 | seconds |

**Response `202`:**
```json
{
  "task_id": "abc123",
  "status": "submitted",
  "estimated_completion_time": "2026-03-14T10:31:00",
  "message": "Optimization request submitted successfully"
}
```

#### Get Task Status
```
GET /api/v1/optimize/task/{task_id}
```
Polls Celery task status.

**Response `200`:**
```json
{
  "task_id": "abc123",
  "status": "pending|processing|completed|failed",
  "progress": 0,
  "message": "Solving...",
  "result": null
}
```

#### Get Result by Task ID
```
GET /api/v1/optimize/results/{request_id}
```

#### Get Optimization Result
```
GET /api/v1/results/{result_id}
```
Used by `RunStatusCard.tsx` for real-time polling (every 2 seconds).

**Response `200`:**
```json
{
  "result_id": "hpcl_opt_...",
  "status": "pending|processing|completed|failed|unknown",
  "progress": 85,
  "message": "Solver running...",
  "metadata": {
    "solver_profile": "balanced",
    "routes_generated": 6534,
    "num_variables": 13068,
    "num_constraints": 28000
  }
}
```

#### List All Results
```
GET /api/v1/results
```
Returns list of all stored optimization results from MongoDB.

#### Delete Result
```
DELETE /api/v1/results/{result_id}
```

---

### 3.4 Analytics

#### Get Monthly KPIs
```
GET /api/v1/analytics/kpis/{month}
```
**Path Parameter:** `month` — format `YYYY-MM`

**Response `200` (`HPCLKPIs`):**
```json
{
  "month": "2026-03",
  "total_shipments": 18,
  "total_cargo_mt": 450000,
  "fleet_utilization": 76.3,
  "on_time_delivery_rate": 98.5,
  "total_cost": 84532000.0,
  "cost_per_mt": 187.8,
  "demurrage_incidents": 0,
  "demurrage_cost": 0.0,
  "avg_voyage_duration": 11.4,
  "total_co2_emissions": 245000.0,
  "eeoi_average": 11.2,
  "fuel_efficiency": 4.3
}
```

#### Cost Savings Analysis
```
GET /api/v1/analytics/cost-savings/{month}
```
Compares optimized solution against manual planning baseline.

#### Emissions Calculation
```
POST /api/v1/analytics/emissions
```
Computes EEOI (IMO Energy Efficiency Operational Indicator) in gCO2/tonne-nm.

---

### 3.5 System Status
```
GET /api/v1/status
```
**Response `200`:**
```json
{
  "api_version": "1.0.0",
  "solver": "OR-Tools CP-SAT",
  "database": "connected",
  "fleet_size": 9,
  "loading_ports": 6,
  "unloading_ports": 11
}
```

---

## 4. Pydantic Schemas Reference

### 4.1 HPCLVessel (`schemas.py:72`)
```json
{
  "id": "T1",
  "name": "Tanker T1",
  "imo_number": "IMO1000001",
  "capacity_mt": 50000,
  "grt": 25000,
  "length_m": 200.0,
  "beam_m": 32.0,
  "draft_m": 12.0,
  "speed_knots": 14.0,
  "fuel_consumption_mt_per_day": 25.0,
  "daily_charter_rate": 6300000.0,
  "crew_size": 20,
  "monthly_available_hours": 720.0,
  "status": "available",
  "current_port": null
}
```

**Validators:**
- `capacity_mt`: 0 < v ≤ 500,000 MT
- `daily_charter_rate`: 0 < v ≤ 100,000,000 Rs/day
- `speed_knots`: 5 ≤ v ≤ 30 knots
- `monthly_available_hours`: 100 ≤ v ≤ 744 hours

### 4.2 HPCLPort (`schemas.py:42`)
```json
{
  "id": "L1",
  "name": "Loading Port L1",
  "code": "L1",
  "type": "loading",
  "latitude": 19.0,
  "longitude": 72.8,
  "state": "Maharashtra",
  "draft_limitation": 12.0,
  "berth_capacity": 2,
  "storage_capacity": 999999999.0,
  "loading_rate": 2000.0,
  "unloading_rate": 1500.0,
  "port_charges_per_visit": 100000.0,
  "grt_charge": 2.0,
  "cargo_handling_rate": 250.0
}
```

### 4.3 MonthlyDemand (`schemas.py:144`)
```json
{
  "port_id": "U2",
  "demand_mt": 135000,
  "priority": "medium",
  "delivery_window_start": null,
  "delivery_window_end": null
}
```

**Validators:**
- `demand_mt`: 0 ≤ v ≤ 1,000,000 MT

### 4.4 HPCLRoute (`schemas.py:170`)
```json
{
  "route_id": "HPCL_T2_L2_U2_abc12345",
  "trip_id": "",
  "vessel_id": "T2",
  "loading_port": "L2",
  "discharge_ports": ["U2"],
  "total_distance_nm": 428.5,
  "total_time_hours": 14.4,
  "hpcl_charter_cost": 2940000.0,
  "total_cost": 2940000.0,
  "cargo_quantity": 50000,
  "execution_count": 3,
  "cargo_split": {"U2": 150000},
  "route_coordinates": [[72.0, 21.0], [73.8, 15.5]]
}
```

Note: `execution_count` > 1 means this voyage **pattern** repeated that many times.
`cargo_split` holds **total** cargo across **all** `execution_count` trips.

### 4.5 OptimizationResult (`schemas.py:279`)
```json
{
  "request_id": "hpcl_opt_1741952400",
  "month": "2026-03",
  "optimization_status": "optimal",
  "solve_time_seconds": 3.47,
  "selected_routes": [HPCLRoute...],
  "vessel_schedules": [VesselSchedule...],
  "total_cost": 84532000.0,
  "total_distance_nm": 12450.5,
  "total_cargo_mt": 450000.0,
  "fleet_utilization": 76.3,
  "demands_met": {"U1": 40000, "U2": 135000, ...},
  "unmet_demand": {},
  "demand_satisfaction_rate": 100.0,
  "cost_breakdown": {
    "charter_cost": 84532000.0,
    "fuel_cost": 0.0,
    "port_charges": 0.0,
    "cargo_handling": 0.0,
    "demurrage_provision": 0.0
  },
  "emissions": null,
  "recommendations": [...]
}
```

---

## 5. Error Handling

All errors return structured JSON responses.

### Standard Error Response
```json
{
  "detail": "Error message string"
}
```

### HTTP Status Codes

| Code | Meaning | When |
|------|---------|------|
| `200` | OK | Successful response (including infeasible results) |
| `202` | Accepted | Background task submitted |
| `404` | Not Found | Vessel/port/result not found |
| `422` | Unprocessable Entity | Pydantic validation error |
| `500` | Internal Server Error | Solver exception or unexpected error |

### Global Exception Handler (`main.py:~60`)
All unhandled exceptions are caught and returned as:
```json
{
  "detail": "Internal server error: <exception message>"
}
```

---

## 6. Cost Calculation Reference

**The ONLY cost formula per Challenge 7.1 PS:**
```
Trip Cost (Rs) = daily_charter_rate (Rs/day) × trip_duration (days)
Trip Cost (Rs Cr) = Trip Cost (Rs) / 10,000,000

Where:
    trip_duration (days) = total_time_hours / 24
    total_time_hours = from PS trip time tables × 24
```

**Per-row cost in output table (2-port trips):**
```
row_cost = trip_cost_cr / num_discharge_ports
```

This ensures `SUM(Trip Cost column) = total transportation cost`.

Reference: `challenge_routes.py:177–217`

---

## 7. Frontend API Consumption

### `HPCLDashboard.tsx` (main call)
```typescript
const response = await axios.post('http://localhost:8000/api/v1/challenge/optimize', {
  solver_profile: selectedProfile,
  optimization_objective: objective,
  round_trip: false
});
```

### `ChallengeOutput.tsx`
```typescript
const res = await fetch('http://localhost:8000/api/v1/challenge/optimize', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ solver_profile: 'quick' })
});
```

### `RunStatusCard.tsx` (polling)
```typescript
// Polls every 2 seconds
GET http://localhost:8000/api/v1/results/{resultId}
```

---

*References: `backend/app/api/challenge_routes.py`, `backend/app/api/routes.py`, `backend/app/models/schemas.py`, `backend/app/core/config.py`, `frontend/src/components/HPCLDashboard.tsx`, `frontend/src/components/ChallengeOutput.tsx`, `frontend/src/components/RunStatusCard.tsx`*
