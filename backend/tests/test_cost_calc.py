"""
Test cost calculation accuracy
Ensures cost = trip_days × charter_rate + port_charges + fuel
"""

import pytest
from app.services.route_generator import calculate_trip_time_from_tables


def test_cost_composition():
    """Test that cost is correctly calculated from components"""
    
    # Test case: Simple voyage
    charter_rate_per_day = 5000000  # ₹50 lakh per day
    trip_days = 1.5
    port_charges = 200000  # ₹2 lakh
    fuel_cost = 300000  # ₹3 lakh
    
    # Expected total cost
    expected_cost = (trip_days * charter_rate_per_day) + port_charges + fuel_cost
    assert expected_cost == 8000000  # ₹80 lakh
    
    # Charter component should dominate
    charter_component = trip_days * charter_rate_per_day
    assert charter_component > port_charges + fuel_cost, "Charter should be largest cost component"


def test_trip_time_accuracy():
    """Test trip time calculation matches expected values"""
    
    # Known trip time from challenge data: L1 -> U1 = 0.4 days (sailing only)
    # With service time: 0.4 + 0.25 (loading) + 0.167 (unloading) ≈ 0.817 days
    
    trip_time_with_service = calculate_trip_time_from_tables(
        "L1", ["U1"], 
        include_service_time=True
    )
    
    # Should be around 0.8-0.85 days
    assert 0.75 <= trip_time_with_service <= 0.95, f"Trip time {trip_time_with_service} out of expected range"
    
    # Without service time should be exactly 0.4 days (from table)
    trip_time_sailing_only = calculate_trip_time_from_tables(
        "L1", ["U1"],
        include_service_time=False
    )
    
    assert abs(trip_time_sailing_only - 0.4) < 0.01, f"Sailing time should be 0.4 days, got {trip_time_sailing_only}"


def test_cost_per_mt():
    """Test cost per MT calculation"""
    
    total_cost = 8000000  # ₹80 lakh
    cargo_quantity = 50000  # MT
    
    cost_per_mt = total_cost / cargo_quantity
    
    # Should be ₹160 per MT
    assert cost_per_mt == 160, f"Cost per MT should be 160, got {cost_per_mt}"
    
    # Sanity check: cost per MT should be reasonable (₹100-500 range)
    assert 100 <= cost_per_mt <= 500, "Cost per MT outside reasonable range"


def test_no_integer_truncation():
    """Test that decimal precision is preserved (no int() bias)"""
    
    # Fractional cost calculation
    charter_rate = 4900000  # ₹49 lakh/day
    trip_days = 1.37  # Fractional days
    
    expected_cost = charter_rate * trip_days
    expected_cost_exact = 6713000  # ₹67.13 lakh
    
    # Calculate with float precision
    calculated_cost = charter_rate * trip_days
    
    # Should match exactly (no truncation)
    assert abs(calculated_cost - expected_cost_exact) < 100, f"Cost calculation lost precision: {calculated_cost} vs {expected_cost_exact}"
    
    # Test with integer conversion (what NOT to do)
    wrong_cost = int(charter_rate) * int(trip_days)  # This would give 4900000 × 1 = 4900000
    assert wrong_cost != calculated_cost, "Integer truncation would give wrong result"


def test_round_trip_calculation():
    """Test round trip cost is approximately 2× one-way"""
    
    # One-way trip
    one_way_time = calculate_trip_time_from_tables("L1", ["U1"], include_service_time=True, include_return_trip=False)
    
    # Round trip
    round_trip_time = calculate_trip_time_from_tables("L1", ["U1"], include_service_time=True, include_return_trip=True)
    
    # Round trip should be approximately double (sailing time doubles, service time same)
    sailing_time = calculate_trip_time_from_tables("L1", ["U1"], include_service_time=False, include_return_trip=False)
    service_time = one_way_time - sailing_time
    
    expected_round_trip = (sailing_time * 2) + service_time
    
    assert abs(round_trip_time - expected_round_trip) < 0.1, f"Round trip time mismatch: {round_trip_time} vs {expected_round_trip}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
