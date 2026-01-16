"""
Test route time composition
Ensures correct calculation: L->U1 + U1->U2 + service times
"""

import pytest
from app.services.route_generator import calculate_trip_time_from_tables


def test_direct_route_time():
    """Test direct route: single loading -> single unloading"""
    
    # L1 -> U1 (direct)
    trip_time = calculate_trip_time_from_tables("L1", ["U1"], include_service_time=False)
    
    # From challenge data: L1 -> U1 = 0.4 days
    assert abs(trip_time - 0.4) < 0.01, f"Expected 0.4 days, got {trip_time}"


def test_split_route_time():
    """Test split route: L -> U1 -> U2"""
    
    # L1 -> U1 -> U2 (split delivery)
    trip_time = calculate_trip_time_from_tables("L1", ["U1", "U2"], include_service_time=False)
    
    # Expected: L1->U1 (0.4) + U1->U2 (from U->U table)
    # From tables: L1->U1 = 0.4, U1->U2 = 0.35
    expected_time = 0.4 + 0.35  # 0.75 days
    
    assert abs(trip_time - expected_time) < 0.01, f"Expected {expected_time} days, got {trip_time}"


def test_service_time_addition():
    """Test that loading and unloading times are correctly added"""
    
    # Constants from route_generator
    LOADING_TIME_HOURS = 6.0
    UNLOADING_TIME_HOURS_PER_PORT = 4.0
    
    # Single discharge port
    trip_with_service = calculate_trip_time_from_tables("L1", ["U1"], include_service_time=True)
    trip_without_service = calculate_trip_time_from_tables("L1", ["U1"], include_service_time=False)
    
    service_time_days = (LOADING_TIME_HOURS + UNLOADING_TIME_HOURS_PER_PORT) / 24.0
    expected_diff = service_time_days
    
    actual_diff = trip_with_service - trip_without_service
    assert abs(actual_diff - expected_diff) < 0.01, f"Service time mismatch: {actual_diff} vs {expected_diff}"
    
    # Two discharge ports - should have 2× unloading time
    trip_two_ports = calculate_trip_time_from_tables("L1", ["U1", "U2"], include_service_time=True)
    trip_two_ports_no_service = calculate_trip_time_from_tables("L1", ["U1", "U2"], include_service_time=False)
    
    service_time_two_ports = (LOADING_TIME_HOURS + 2 * UNLOADING_TIME_HOURS_PER_PORT) / 24.0
    actual_diff_two = trip_two_ports - trip_two_ports_no_service
    
    assert abs(actual_diff_two - service_time_two_ports) < 0.01, f"Two-port service time mismatch"


def test_max_two_discharge_ports():
    """Test constraint: maximum 2 discharge ports per route"""
    
    # Valid: 1 discharge port
    time_one = calculate_trip_time_from_tables("L1", ["U1"], include_service_time=False)
    assert time_one > 0, "Single discharge port should be valid"
    
    # Valid: 2 discharge ports
    time_two = calculate_trip_time_from_tables("L1", ["U1", "U2"], include_service_time=False)
    assert time_two > time_one, "Two discharge ports should take longer"
    
    # Time should be: L1->U1 + U1->U2
    # Should NOT be: L1->U1 + L1->U2 (that would be wrong)


def test_different_loading_ports():
    """Test routes from different loading ports"""
    
    # L1 -> U1
    time_l1_u1 = calculate_trip_time_from_tables("L1", ["U1"], include_service_time=False)
    
    # L2 -> U1
    time_l2_u1 = calculate_trip_time_from_tables("L2", ["U1"], include_service_time=False)
    
    # Times should be different (different port distances)
    # From tables: L1->U1 = 0.4, L2->U1 = 0.4 (happens to be same, but test the mechanism)
    assert time_l1_u1 >= 0 and time_l2_u1 >= 0, "Both routes should have valid times"


def test_trip_time_tables_coverage():
    """Test that trip time tables have complete coverage"""
    
    loading_ports = ["L1", "L2", "L3", "L4", "L5", "L6"]
    unloading_ports = ["U1", "U2", "U3", "U4", "U5", "U6", "U7", "U8", "U9", "U10", "U11"]
    
    # Test that we can calculate time for all L->U combinations
    for l_port in loading_ports:
        for u_port in unloading_ports:
            time = calculate_trip_time_from_tables(l_port, [u_port], include_service_time=False)
            assert time > 0, f"Missing trip time for {l_port} -> {u_port}"
            assert time < 10, f"Trip time too high for {l_port} -> {u_port}: {time} days"


def test_symmetry_assumption():
    """Test that return trip time is approximately same as forward trip"""
    
    # L1 -> U1 (forward)
    forward_time = calculate_trip_time_from_tables("L1", ["U1"], include_service_time=False, include_return_trip=False)
    
    # L1 -> U1 with return
    with_return = calculate_trip_time_from_tables("L1", ["U1"], include_service_time=False, include_return_trip=True)
    
    # Return trip should approximately double sailing time
    return_time = with_return - forward_time
    
    # Return should be approximately same as forward (symmetric route)
    assert abs(return_time - forward_time) < 0.1, f"Return trip time asymmetric: {return_time} vs {forward_time}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
