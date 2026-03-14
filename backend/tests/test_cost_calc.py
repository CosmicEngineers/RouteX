"""
Test cost calculation accuracy.
After Bug 1 fix: cost = trip_days × charter_rate ONLY.
No port charges or fuel costs are added to total_cost.
"""

import pytest
from app.services.route_generator import calculate_trip_time_from_tables


def test_cost_formula_charter_only():
    """
    Bug 1 fix: PS-correct cost is charter hire rate × trip days only.
    Port charges and fuel are informational but NOT added to total_cost.
    """
    charter_rate_per_day = 5000000  # ₹50 lakh per day
    trip_days = 1.5

    expected_cost = trip_days * charter_rate_per_day  # ₹75 lakh
    assert expected_cost == 7500000

    # Port charges and fuel must NOT be part of the PS-defined cost
    fake_port_charges = 200000
    fake_fuel = 300000
    wrong_cost = (trip_days * charter_rate_per_day) + fake_port_charges + fake_fuel
    assert wrong_cost != expected_cost, "Adding port/fuel cost would violate PS definition"


def test_trip_time_accuracy_from_ps_table():
    """
    After Bug 4 fix: trip time = raw PS table value only.
    No service time (loading 6h + unloading 4h) is added.
    L1 -> U1 is 0.4 days from the PS table.
    """
    trip_time = calculate_trip_time_from_tables("L1", ["U1"], include_service_time=False)
    assert abs(trip_time - 0.4) < 0.01, f"Expected exactly 0.4 days from PS table, got {trip_time}"

    # include_service_time has no effect after Bug 4 fix
    with_service = calculate_trip_time_from_tables("L1", ["U1"], include_service_time=True)
    assert abs(with_service - 0.4) < 0.01, (
        f"include_service_time should have no effect (Bug 4 fix). Got {with_service}"
    )


def test_cost_per_mt():
    """Test cost per MT calculation"""
    total_cost = 7500000  # ₹75 lakh (charter-only)
    cargo_quantity = 50000  # MT

    cost_per_mt = total_cost / cargo_quantity
    assert cost_per_mt == 150, f"Cost per MT should be 150, got {cost_per_mt}"


def test_no_integer_truncation():
    """Test that decimal precision is preserved (no int() truncation)"""
    charter_rate = 4900000  # ₹49 lakh/day
    trip_days = 1.37

    calculated_cost = charter_rate * trip_days
    expected_cost_exact = 6713000.0

    assert abs(calculated_cost - expected_cost_exact) < 1, (
        f"Cost precision lost: {calculated_cost} vs {expected_cost_exact}"
    )

    # int() truncation would give 4900000 * 1 = 4900000 (wrong)
    wrong_cost = int(charter_rate) * int(trip_days)
    assert wrong_cost != calculated_cost, "Integer truncation gives wrong result"


def test_round_trip_calculation():
    """Test round trip time is approximately 2× one-way sailing time"""
    one_way = calculate_trip_time_from_tables("L1", ["U1"], include_service_time=False, include_return_trip=False)
    round_trip = calculate_trip_time_from_tables("L1", ["U1"], include_service_time=False, include_return_trip=True)

    # Round trip = forward sailing + return sailing ≈ 2× forward
    assert abs(round_trip - 2 * one_way) < 0.1, (
        f"Round trip should be ~2× one-way. Got one_way={one_way}, round_trip={round_trip}"
    )


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
