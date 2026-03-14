# MATHEMATICAL MODEL
## HPCL Challenge 7.1 — Coastal Vessel Optimization
### Set Partitioning Problem via OR-Tools CP-SAT

---

## 1. Problem Classification

RouteX solves a **Set Partitioning / Set Covering Problem** (SPP/SCP) formulated as a **Mixed-Integer Linear Program (MILP)**, solved using Google OR-Tools **Constraint Programming with Satisfiability (CP-SAT)**.

The problem belongs to the family of Vehicle Routing Problems (VRP) with:
- Multiple vehicles (9 tankers)
- Multiple depots (6 loading ports)
- Multiple customers (11 unloading ports)
- Capacity constraints
- Time-window horizon (720 hours/month per vessel)
- Objective: minimize total charter cost

---

## 2. Problem Data (from `backend/app/data/challenge_data.py`)

### 2.1 Sets

| Symbol | Description | Size |
|--------|-------------|------|
| `T` | Set of tankers | {T1, T2, ..., T9} = 9 |
| `L` | Set of loading ports | {L1, L2, ..., L6} = 6 |
| `U` | Set of unloading ports | {U1, U2, ..., U11} = 11 |
| `R` | Set of all feasible routes | ~6,534 |
| `R_v` | Routes for vessel `v` | ~726 per vessel |
| `R_p` | Routes serving unloading port `p` | variable |

### 2.2 Parameters

#### Vessel Parameters (`challenge_data.py:10–170`)

| Tanker | Capacity (MT) | Charter Rate (Rs/day) | Charter Rate (Rs Cr/day) |
|--------|--------------|----------------------|------------------------|
| T1 | 50,000 | 6,300,000 | 0.63 |
| T2 | 50,000 | 4,900,000 | 0.49 |
| T3 | 50,000 | 5,100,000 | 0.51 |
| T4 | 50,000 | 5,100,000 | 0.51 |
| T5 | 50,000 | 5,300,000 | 0.53 |
| T6 | 50,000 | 5,700,000 | 0.57 |
| T7 | 50,000 | 6,500,000 | 0.65 |
| T8 | 25,000 | 3,900,000 | 0.39 |
| T9 | 25,000 | 3,800,000 | 0.38 |

**Monthly time budget:** `H_v = 720 hours` for all vessels (30 days × 24 h)

#### Port Demands (`challenge_data.py:309–324`)

| Port | Demand (MT/month) |
|------|-------------------|
| U1 | 40,000 |
| U2 | 135,000 |
| U3 | 5,000 |
| U4 | 20,000 |
| U5 | 20,000 |
| U6 | 20,000 |
| U7 | 110,000 |
| U8 | 30,000 |
| U9 | 20,000 |
| U10 | 20,000 |
| U11 | 20,000 |
| **Total** | **440,000** |

#### Trip Times — L→U (`challenge_data.py:282–289`, in days)

```
         U1    U2    U3    U4    U5    U6    U7    U8    U9   U10   U11
L1:     0.40  0.70  0.40  0.40  0.40  0.60  0.50  0.40  0.30  0.50  0.70
L2:     0.40  0.60  0.50  0.40  0.40  0.50  0.50  0.50  0.30  0.50  0.60
L3:     0.40  0.60  0.50  0.40  0.40  0.50  0.50  0.50  0.30  0.60  0.60
L4:     0.40  0.60  0.40  0.30  0.30  0.50  0.50  0.40  0.30  0.50  0.60
L5:     0.40  0.60  0.40  0.30  0.30  0.50  0.50  0.40  0.30  0.50  0.50
L6:     0.58  0.73  0.64  0.56  0.56  0.65  0.67  0.64  0.50  0.70  0.73
```

#### Trip Times — U→U (`challenge_data.py:294–306`, in days, asymmetric)

The inter-discharge-port matrix is **not symmetric**: `t(Ui→Uj) ≠ t(Uj→Ui)`.
This is why **both orderings** of split routes are generated.

Example asymmetry:
- `U1 → U2`: 0.35 days
- `U2 → U1`: 0.36 days

---

## 3. Route Generation (`backend/app/services/route_generator.py`)

### 3.1 Route Patterns

For each vessel `v ∈ T`, two route patterns are generated:

**Pattern A — Direct Route (L→U):**
```
Route r = (v, L_i, [U_j])
Trip time: τ_r = t_LU[L_i][U_j]  days
```
Count per vessel: 6 × 11 = **66 routes**

**Pattern B — Split Route (L→U1→U2):**
```
Route r = (v, L_i, [U_j, U_k])           where j ≠ k
Trip time: τ_r = t_LU[L_i][U_j] + t_UU[U_j][U_k]  days
```
Both orderings generated:
- `(v, L_i, [U_j, U_k])` using `t_LU[L_i][U_j] + t_UU[U_j][U_k]`
- `(v, L_i, [U_k, U_j])` using `t_LU[L_i][U_k] + t_UU[U_k][U_j]`

Count per vessel: 6 × C(11,2) × 2 = 6 × 55 × 2 = **660 routes**

**Total per vessel:** 66 + 660 = **726 routes**
**Total fleet:** 726 × 9 = **~6,534 feasible routes**

### 3.2 Trip Time Formula

```
route_generator.py:61–97 (calculate_trip_time_from_tables)

For direct route (v, L_i, [U_j]):
    τ_r = t_LU[L_i][U_j]                                    (days)

For split route (v, L_i, [U_j, U_k]):
    τ_r = t_LU[L_i][U_j] + t_UU[U_j][U_k]                 (days)

In centihours (×100 for CP-SAT integer arithmetic):
    centihours_r = round(τ_r × 24 × 100)
```

**Important:** The PS trip time tables represent **complete voyage duration** — no additional service time, loading time, or waiting time is added. (`route_generator.py:36`).

### 3.3 Route Cost Formula

```
route_generator.py:406–410

cost_r = charter_rate_v (Rs/day) × τ_r (days)
```

**Only charter cost is included** — no fuel surcharges, no port charges, as per Problem Statement. (`route_generator.py:108`).

### 3.4 Pruning Rules

```
route_generator.py:210–247

REMOVE if:  τ_r × 24 > 720 hours  (physically impossible in one month)
KEEP all others — no heuristic cost/time thresholds
```

Dominated route removal is secondary (`route_generator.py:249–309`): route A dominates B only when same (vessel, loading_port, discharge_sequence) and A is weakly better on both cost and time with strict improvement on one. In practice this is a no-op since costs and times are deterministic from PS tables.

---

## 4. Decision Variables (`cp_sat_optimizer.py:240–316`)

### 4.1 Primary Variables

For each feasible route `r ∈ R`:

```
route_count[r]  ∈  {0, 1, ..., max_trips_r}   (IntVar)
```
Number of times route `r` is executed in the month.

```
cargo_to[r][p]  ∈  {0, 1, ..., capacity_v × max_trips_r}   (IntVar)
```
Total cargo (MT) delivered to port `p` across **all** `route_count[r]` executions of route `r`.

### 4.2 Auxiliary Variable

```
total_cargo[r]  =  Σ_p  cargo_to[r][p]   (IntVar, alias for backward compat)
```

### 4.3 Domain Bounds

```python
# cp_sat_optimizer.py:266–272
time_bound  = floor(720 / max(trip_hours_r, 0.01))      # max trips by time budget
demand_bound = ceil(total_system_demand / capacity_v)    # max trips by demand coverage
max_trips_r  = min(time_bound, demand_bound)             # tight upper bound
```

This tight domain significantly reduces the search space.

---

## 5. Constraints (`cp_sat_optimizer.py:318–458`)

### 5.1 Full-Capacity Loading Constraint

Each tanker must load its full capacity per trip (PS Constraint 1):

```
∀r ∈ R:
    Σ_p  cargo_to[r][p]  =  capacity_v(r)  ×  route_count[r]
```

Reference: `cp_sat_optimizer.py:288–291`
```python
total_cargo_expr = sum(self.cargo_to_vars[route_id].values())
self.model.Add(total_cargo_expr == vessel_capacity * self.route_count_vars[route_id])
```

This is an **equality** constraint (not ≤) because partial loads are forbidden by the PS.

### 5.2 Cargo Linking Constraint

Prevents cargo being assigned to a port when the route has zero executions:

```
∀r ∈ R, ∀p ∈ discharge_ports(r):
    cargo_to[r][p]  ≤  capacity_v(r)  ×  route_count[r]
```

Reference: `cp_sat_optimizer.py:293–298`

### 5.3 Demand Satisfaction Constraint

Every unloading port must receive at least its monthly demand:

```
∀p ∈ U:
    Σ_{r ∈ R_p}  cargo_to[r][p]  ≥  demand_p
```

Reference: `cp_sat_optimizer.py:365–368`
```python
self.model.Add(sum(serving_cargo_vars) >= demand_mt)
```

**Why `≥` instead of `=`?**
Total fleet capacity = 7 × 50,000 + 2 × 25,000 = 400,000 MT/load.
Total demand = 440,000 MT.
GCD(50,000, 25,000) = 25,000 MT.
440,000 ÷ 25,000 = 17.6 → **not an integer**, so exact equality is arithmetically impossible under full-capacity loading.
The cost objective naturally minimizes over-delivery, yielding ~450,000 MT delivered (2% safety buffer at zero incremental cost).

Reference: `cp_sat_optimizer.py:327–338`

### 5.4 Vessel Time Budget Constraint

Each vessel's total voyage time across all routes cannot exceed 720 hours/month:

```
∀v ∈ T:
    Σ_{r ∈ R_v}  centihours_r  ×  route_count[r]  ≤  72,000
```

where `centihours_r = round(τ_r × 24 × 100)` and `72,000 = 720 × 100`.

Reference: `cp_sat_optimizer.py:421–427`
```python
time_terms.append(count_var * time_centihours)
self.model.Add(sum(time_terms) <= available_centihours)  # 72,000
```

**Why centihours?** Integer rounding of hours would cause errors: 9.6 h rounds to 10 h (+4% error per trip). Scaling by 100 gives `960 centihours` — exact integer representation. (`cp_sat_optimizer.py:410`)

### 5.5 Single-Loading-Port Constraint

Enforced structurally: every route `r` is generated with exactly one loading port. The CP-SAT model needs no explicit constraint because route generation guarantees this. Reference: `route_generator.py:580`.

### 5.6 Maximum Two Discharge Ports Constraint

Enforced at route generation: `_validate_hpcl_constraints()` rejects any route with `len(discharge_ports) > 2`. Reference: `route_generator.py:583–585`.

---

## 6. Objective Function (`cp_sat_optimizer.py:460–515`)

### 6.1 Primary Objective: Minimize Total Charter Cost

```
Minimize:   Σ_{r ∈ R}  cost_r_scaled  ×  route_count[r]

where:  cost_r_scaled = round(cost_r × 100)
        cost_r = charter_rate_v(r) (Rs/day) × τ_r (days)
```

**Why scale cost ×100?**
`cost_r` is in Rs (e.g., 2,940,000 Rs). Multiplied by 100 = 294,000,000, stored as int64. CP-SAT requires integer coefficients; scaling preserves two decimal digits of precision in Rs Cr. (`cp_sat_optimizer.py:476–484`)

### 6.2 Alternative Objectives

| Objective | Formula | Reference |
|-----------|---------|-----------|
| `cost` | Minimize Σ cost_r×100 × route_count[r] | Line 479–484 |
| `time` | Minimize Σ centihours_r × route_count[r] | Line 493–498 |
| `emissions` | Minimize Σ fuel_consumption_r×100 × route_count[r] | Line 487–491 |
| `balanced` | Minimize Σ (cost_r×100 + centihours_r) × route_count[r] | Line 500–506 |

### 6.3 No Penalty Terms

There are **no soft penalty terms** for unmet demand. Demand constraints are **hard** (≥). If no feasible solution exists, the solver returns `INFEASIBLE`. This guarantees either a valid complete solution or an explicit infeasibility report. Reference: `cp_sat_optimizer.py:508–510`.

---

## 7. Complete Model Summary

```
Sets:
    T = {T1,...,T9}     (9 tankers)
    L = {L1,...,L6}     (6 loading ports)
    U = {U1,...,U11}    (11 unloading ports)
    R ≈ 6534            (feasible routes)

Parameters:
    cap_v       vessel capacity (MT)                    T1–T7: 50,000; T8–T9: 25,000
    rate_v      daily charter rate (Rs/day)             0.38–0.65 Cr/day
    τ_r         trip time (days)                        from PS tables
    d_p         monthly demand at port p (MT)           440,000 MT total
    H_v = 720   monthly available hours per vessel

Decision Variables:
    route_count[r] ∈ {0, ..., max_trips_r}              integer count
    cargo_to[r][p] ∈ {0, ..., cap_v × max_trips_r}      integer MT

Objective:
    Minimize  Σ_{r∈R}  (round(rate_v(r) × τ_r × 100))  ×  route_count[r]

Subject to:
    [C1] Full capacity loading:
         ∀r:  Σ_p cargo_to[r][p]  =  cap_v(r) × route_count[r]

    [C2] Cargo linking (zero when inactive):
         ∀r, ∀p ∈ discharge(r):  cargo_to[r][p]  ≤  cap_v(r) × route_count[r]

    [C3] Demand satisfaction (at-least):
         ∀p ∈ U:  Σ_{r ∈ R_p}  cargo_to[r][p]  ≥  d_p

    [C4] Vessel time budget (centihour-scaled):
         ∀v ∈ T:  Σ_{r ∈ R_v}  centihours_r × route_count[r]  ≤  72,000

    [C5–C6] Structural (no explicit CP-SAT constraint needed):
         Single loading port per route (enforced by route generator)
         Max 2 discharge ports per route (enforced by route generator)

Non-negativity:
    route_count[r] ≥ 0,  cargo_to[r][p] ≥ 0   (integers)
```

---

## 8. Output Interpretation (`challenge_routes.py:159–227`)

### 8.1 Per-Row Trip Cost

For each executed trip, the challenge output splits the cost across discharge rows:

```
For trip t with execution_count trips on route r:
    trip_duration_days = total_time_hours / 24
    trip_cost_cr = charter_rate_Cr/day × trip_duration_days
    row_cost_cr  = trip_cost_cr / num_discharge_ports
    volume_per_trip = cargo_to[r][p] / execution_count
```

For a 1-port trip: `row_cost_cr = trip_cost_cr` (full cost on one row)
For a 2-port trip: each port row shows `trip_cost_cr / 2` (avoids double-counting)

Reference: `challenge_routes.py:203–218`

### 8.2 Summing the Output Table

```
Total Transportation Cost = Σ_{all rows} Trip_Cost(Rs Cr)

This equals:
    Σ_{r ∈ selected} route_count[r] × charter_rate_v(r) × τ_r  (in Rs Cr)
```

The per-row split ensures summing the "Trip Cost" column gives the **correct total** without double-counting trips that serve two ports.

### 8.3 Demand Satisfaction Rate

```
cp_sat_optimizer.py:621–623

demand_satisfaction_rate = (1 - total_unmet / total_demand) × 100
                         = min(100%, (delivered / demanded) × 100)
```

Since the model uses `>=` constraints with a cost-minimization objective, `delivered ≥ demanded` always holds in feasible solutions. Any surplus is the minimal over-delivery required by GCD arithmetic.

---

## 9. Pre-Solve Feasibility Check (`cp_sat_optimizer.py:110–125`)

Before constructing the CP-SAT model, a fast capacity check is performed:

```python
min_trip_hours = min(r['total_time_hours'] for r in feasible_routes)
max_trips_any_vessel = floor(720 / min_trip_hours)          # upper bound
max_deliverable = sum(v.capacity_mt × max_trips_any_vessel for v in vessels)

if max_deliverable < total_demand:
    → return INFEASIBLE immediately (skip CP-SAT solver)
```

This prevents wasted time when the problem is structurally infeasible (e.g., unrealistically high custom demand input).

---

## 10. Solver Configuration (`config.py:solver_profiles`)

```python
# quick profile (default for hackathon)
{
    "max_time_seconds": 15,
    "num_search_workers": 2
}

# production profile
{
    "max_time_seconds": 600,
    "num_search_workers": 8
}
```

CP-SAT solver uses parallel portfolio search. With 8 workers on the ~6,534-variable model, an optimal or near-optimal solution is typically found within 15–30 seconds.

---

## 11. Complexity Analysis

| Component | Size | Notes |
|-----------|------|-------|
| Decision variables (route_count) | ~6,534 IntVar | One per route |
| Decision variables (cargo_to) | ~6,534 to ~13,068 IntVar | 1 or 2 per route |
| Demand constraints | 11 | One per unloading port |
| Vessel time constraints | 9 | One per tanker |
| Full-capacity constraints | ~6,534 | One per route |
| Cargo linking constraints | ~6,534–13,068 | One per (route, port) |
| **Total constraints** | **~25,000–30,000** | MILP scale |

The problem is NP-hard in general (VRP class), but OR-Tools CP-SAT with parallel search and tight domain bounds finds optimal solutions quickly due to:
1. Small number of vessels (9)
2. Small number of ports (17)
3. Tight `max_trips` bounds reducing variable domains
4. Hard demand constraints guiding the search

---

*References: `backend/app/services/cp_sat_optimizer.py`, `backend/app/services/route_generator.py`, `backend/app/data/challenge_data.py`, `backend/app/api/challenge_routes.py`*
