# HPCL RouteX Backend Tests

## Running Tests

```bash
cd backend
pytest tests/ -v
```

## Test Coverage

```bash
pytest tests/ --cov=app --cov-report=html
```

## Test Structure

- `test_demand_satisfaction.py` - Hard constraint validation tests
- `test_cost_calc.py` - Cost calculation accuracy tests
- `test_route_time.py` - Trip time composition tests
- `test_end_to_end.py` - Full optimization flow tests

## Test Philosophy

All tests use:
- **Deterministic inputs** - No randomness
- **Small 2×2 instances** - Fast execution
- **Exact assertions** - Verify correctness precisely
- **Edge cases** - Test infeasibility, validation, constraints
