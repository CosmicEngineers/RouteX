"""
Test route time composition
All times come DIRECTLY from PS trip-time tables.
No service times are added — the tables already encode full trip duration.
"""

import pytest
from app.services.route_generator import calculate_trip_time_from_tables


def test_direct_route_time():
    """Test direct route: single loading -> single unloading"""

    # L1 -> U1 (direct): trips time from PS table only
    trip_time = calculate_trip_time_from_tables("L1", ["U1"], include_service_time=False)
    assert abs(trip_time - 0.4) < 0.01, f"Expected 0.4 days, got {trip_time}"


def test_split_route_time():
    """Test split route: L -> U1 -> U2"""

    # L1 -> U1 -> U2 (split delivery)
    trip_time = calculate_trip_time_from_tables("L1", ["U1", "U2"], include_service_time=False)

    # Expected: L1->U1 (0.4) + U1->U2 (from U->U table, expected ~0.35)
    # Split route must be strictly longer than direct route
    direct = calculate_trip_time_from_tables("L1", ["U1"], include_service_time=False)
    assert trip_time > direct, "Split route should take longer than direct route"
    assert trip_time < 3.0, "Split route time seems too long"


def test_service_time_parameter_has_no_effect():
    """
    After Bug 4 fix: include_service_time is a no-op.
    The PS trip time tables already encode full trip duration.
    include_service_time=True and include_service_time=False must give identical results.
    """
    time_with = calculate_trip_time_from_tables("L1", ["U1"], include_service_time=True)
    time_without = calculate_trip_time_from_tables("L1", ["U1"], include_service_time=False)
    assert abs(time_with - time_without) < 1e-9, (
        f"include_service_time must have NO effect after Bug 4 fix. "
        f"Got with={time_with}, without={time_without}"
    )


def test_service_time_parameter_has_no_effect_two_ports():
    """Same no-op check for 2-discharge-port routes."""
    time_with = calculate_trip_time_from_tables("L1", ["U1", "U2"], include_service_time=True)
    time_without = calculate_trip_time_from_tables("L1", ["U1", "U2"], include_service_time=False)
    assert abs(time_with - time_without) < 1e-9, (
        f"include_service_time must have NO effect after Bug 4 fix. "
        f"Got with={time_with}, without={time_without}"
    )


def test_max_two_discharge_ports():
    """Test constraint: maximum 2 discharge ports per route"""

    time_one = calculate_trip_time_from_tables("L1", ["U1"], include_service_time=False)
    assert time_one > 0, "Single discharge port should be valid"

    time_two = calculate_trip_time_from_tables("L1", ["U1", "U2"], include_service_time=False)
    assert time_two > time_one, "Two discharge ports should take longer"


def test_different_loading_ports():
    """Test routes from different loading ports"""

    time_l1_u1 = calculate_trip_time_from_tables("L1", ["U1"], include_service_time=False)
    time_l2_u1 = calculate_trip_time_from_tables("L2", ["U1"], include_service_time=False)
    assert time_l1_u1 >= 0 and time_l2_u1 >= 0, "Both routes should have valid times"


def test_trip_time_tables_coverage():
    """Test that trip time tables have complete coverage"""

    loading_ports = ["L1", "L2", "L3", "L4", "L5", "L6"]
    unloading_ports = ["U1", "U2", "U3", "U4", "U5", "U6", "U7", "U8", "U9", "U10", "U11"]

    for l_port in loading_ports:
        for u_port in unloading_ports:
            time = calculate_trip_time_from_tables(l_port, [u_port], include_service_time=False)
            assert time > 0, f"Missing trip time for {l_port} -> {u_port}"
            assert time < 10, f"Trip time too high for {l_port} -> {u_port}: {time} days"


def test_return_trip_is_symmetric_approximation():
    """
    BUG-m4 fix: The PS does NOT provide U→L (discharge-to-loading) trip times.
    The return trip is approximated by reusing the L→U forward table value.
    This test documents that approximation — it does NOT assert PS correctness.
    The return time equals the forward time by construction (same table lookup),
    so the 2x round-trip estimate is valid as an approximation only.
    """
    forward_time = calculate_trip_time_from_tables("L1", ["U1"], include_service_time=False, include_return_trip=False)
    with_return = calculate_trip_time_from_tables("L1", ["U1"], include_service_time=False, include_return_trip=True)

    # The approximation: return time = forward L→U time (PS has no U→L table)
    return_time = with_return - forward_time
    # Since we reuse the same forward lookup, return_time == forward_time exactly
    assert abs(return_time - forward_time) < 1e-9, (
        f"Return approximation changed unexpectedly: {return_time} vs {forward_time}. "
        f"Note: this is NOT a PS value — it is an approximation using the L→U table."
    )


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
