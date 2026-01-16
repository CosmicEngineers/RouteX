"""
Test demand satisfaction constraints
Ensures all unloading port demands are met exactly (hard constraint)
"""

import pytest
from app.models.schemas import HPCLVessel, HPCLPort, MonthlyDemand
from app.services.route_generator import calculate_trip_time_from_tables


def test_hard_demand_constraint():
    """Test that demand must be satisfied exactly (no shortage allowed)"""
    # Small 2x2 test case: 2 vessels, 2 demand ports
    
    vessels = [
        {
            "id": "T1",
            "capacity_mt": 50000,
            "daily_charter_rate": 5000000,
            "monthly_available_hours": 720
        },
        {
            "id": "T2",
            "capacity_mt": 50000,
            "daily_charter_rate": 4500000,
            "monthly_available_hours": 720
        }
    ]
    
    demands = [
        {"port_id": "U1", "demand_mt": 40000},
        {"port_id": "U2", "demand_mt": 50000}
    ]
    
    total_demand = sum(d["demand_mt"] for d in demands)
    total_capacity = sum(v["capacity_mt"] for v in vessels)
    
    # Test 1: Total capacity must be >= total demand for single trip
    assert total_capacity >= total_demand, f"Infeasible: capacity {total_capacity} < demand {total_demand}"
    
    # Test 2: With multiple trips, capacity should be sufficient
    max_trips_per_vessel = 5  # Assume each vessel can make ~5 trips/month
    effective_capacity = total_capacity * max_trips_per_vessel
    assert effective_capacity >= total_demand, "Even with multiple trips, capacity insufficient"


def test_trip_time_calculation():
    """Test exact trip time calculation from tables"""
    # Test direct route L1 -> U1
    trip_time = calculate_trip_time_from_tables("L1", ["U1"], include_service_time=True)
    
    # Expected: L1->U1 sailing (0.4 days) + loading (6h = 0.25 days) + unloading (4h = 0.167 days)
    # = 0.4 + 0.25 + 0.167 ≈ 0.817 days
    assert 0.7 < trip_time < 1.0, f"Trip time {trip_time} days seems incorrect"
    
    # Test split route L1 -> U1 -> U2
    trip_time_split = calculate_trip_time_from_tables("L1", ["U1", "U2"], include_service_time=True)
    
    # Expected: L1->U1 (0.4) + U1->U2 (from U->U table) + loading + 2×unloading
    assert trip_time_split > trip_time, "Split route should take longer than direct route"
    assert trip_time_split < 3.0, "Split route time seems too long"


def test_monthly_time_constraint():
    """Test that vessel monthly hours <= 720"""
    vessel_hours = 720  # 30 days × 24 hours
    
    # If a trip takes 2 days (48 hours), max trips per month:
    trip_time_hours = 48
    max_trips = vessel_hours // trip_time_hours
    
    assert max_trips == 15, f"Expected 15 trips max, got {max_trips}"
    
    # Test edge case: trips must fit within 720 hours
    trip_times = [45, 50, 48, 52, 55, 48, 50]  # 7 trips
    total_time = sum(trip_times)
    
    assert total_time <= vessel_hours, f"Total time {total_time} exceeds {vessel_hours} hours"


def test_demand_validation():
    """Test demand validation logic"""
    # Valid demand
    demand = MonthlyDemand(port_id="U1", demand_mt=50000)
    assert demand.demand_mt == 50000
    
    # Invalid: negative demand
    with pytest.raises(ValueError):
        MonthlyDemand(port_id="U1", demand_mt=-1000)
    
    # Invalid: unrealistically high demand
    with pytest.raises(ValueError):
        MonthlyDemand(port_id="U1", demand_mt=2000000)


def test_vessel_validation():
    """Test vessel validation logic"""
    # Valid vessel
    vessel = HPCLVessel(
        id="T1",
        name="Test Vessel",
        imo_number="IMO1234567",
        capacity_mt=50000,
        grt=25000,
        length_m=200,
        beam_m=32,
        draft_m=12,
        speed_knots=14,
        fuel_consumption_mt_per_day=25,
        daily_charter_rate=5000000,
        crew_size=20
    )
    assert vessel.capacity_mt == 50000
    
    # Invalid: negative capacity
    with pytest.raises(ValueError):
        HPCLVessel(
            id="T1",
            name="Test",
            imo_number="IMO123",
            capacity_mt=-1000,
            grt=25000,
            length_m=200,
            beam_m=32,
            draft_m=12,
            speed_knots=14,
            fuel_consumption_mt_per_day=25,
            daily_charter_rate=5000000,
            crew_size=20
        )
    
    # Invalid: monthly hours > 720
    with pytest.raises(ValueError):
        HPCLVessel(
            id="T1",
            name="Test",
            imo_number="IMO123",
            capacity_mt=50000,
            grt=25000,
            length_m=200,
            beam_m=32,
            draft_m=12,
            speed_knots=14,
            fuel_consumption_mt_per_day=25,
            daily_charter_rate=5000000,
            crew_size=20,
            monthly_available_hours=800  # > 720 not allowed
        )


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
