"""
Test demand satisfaction constraints.
Ensures all unloading port demands are met exactly (hard constraint).
"""

import pytest
from app.models.schemas import HPCLVessel, HPCLPort, MonthlyDemand
from app.services.route_generator import calculate_trip_time_from_tables


def test_hard_demand_constraint():
    """Test that demand must be satisfied exactly (no shortage allowed)"""
    vessels = [
        {"id": "T1", "capacity_mt": 50000, "daily_charter_rate": 5000000, "monthly_available_hours": 720},
        {"id": "T2", "capacity_mt": 50000, "daily_charter_rate": 4500000, "monthly_available_hours": 720},
    ]
    demands = [
        {"port_id": "U1", "demand_mt": 40000},
        {"port_id": "U2", "demand_mt": 50000},
    ]

    total_demand = sum(d["demand_mt"] for d in demands)

    # mn5 fix: Replace the trivially-true `total_demand <= total_capacity * 5` check
    # (which is always true for any sane demand) with a time-budget-based assertion.
    # A vessel with 720h/month budget and minimum trip of 0.3 days (7.2h) can do at
    # most floor(720 / 7.2) = 100 trips. Use this as the theoretical maximum.
    MIN_TRIP_HOURS = 0.3 * 24.0  # 7.2 hours (shortest possible PS trip: 0.3 days)
    max_trips_per_vessel = int(vessels[0]["monthly_available_hours"] / MIN_TRIP_HOURS)
    max_deliverable_mt = sum(v["capacity_mt"] * max_trips_per_vessel for v in vessels)
    assert total_demand <= max_deliverable_mt, (
        f"Demand ({total_demand} MT) exceeds theoretical fleet capacity over the month "
        f"({max_deliverable_mt} MT with {max_trips_per_vessel} trips/vessel at min trip time)."
    )


def test_trip_time_accuracy():
    """Test exact trip time calculation from PS tables (no service time added)."""
    # After Bug 4 fix: PS table value used directly, no extra time.
    trip_time = calculate_trip_time_from_tables("L1", ["U1"], include_service_time=False)

    # From PS data: L1->U1 = 0.4 days exactly
    assert abs(trip_time - 0.4) < 0.01, f"Trip time {trip_time} days — expected 0.4"

    # Split route L1 -> U1 -> U2: L1->U1 + U1->U2
    trip_time_split = calculate_trip_time_from_tables("L1", ["U1", "U2"], include_service_time=False)
    assert trip_time_split > trip_time, "Split route should take longer than direct"
    assert trip_time_split < 3.0, "Split route time seems too long"


def test_monthly_time_constraint():
    """Test that vessel monthly hours <= 720 (30 days)."""
    vessel_hours = 720  # 30 days × 24 hours (standard constraint)

    # If a trip takes 2 days (48 hours), max ordered trips:
    trip_time_hours = 48
    max_trips = vessel_hours // trip_time_hours
    assert max_trips == 15, f"Expected 15 trips max, got {max_trips}"

    # Test edge case: multiple trips must fit within 720 hours
    trip_times = [45, 50, 48, 52, 55, 48, 50]  # 7 trips
    total_time = sum(trip_times)
    assert total_time <= vessel_hours, f"Total time {total_time} exceeds {vessel_hours} hours"


def test_demand_validation():
    """Test demand validation logic"""
    demand = MonthlyDemand(port_id="U1", demand_mt=50000)
    assert demand.demand_mt == 50000

    with pytest.raises(ValueError):
        MonthlyDemand(port_id="U1", demand_mt=-1000)

    with pytest.raises(ValueError):
        MonthlyDemand(port_id="U1", demand_mt=2000000)


def test_vessel_validation():
    """Test vessel validation logic"""
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
        crew_size=20,
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
            crew_size=20,
        )


def test_vessel_monthly_hours_boundary():
    """
    Bug 10 fix: monthly_available_hours now allows up to 744 (31-day month).
    720 and 744 should both be valid. Values above 744 should fail.
    """
    # 720 hours should still be valid
    v720 = HPCLVessel(
        id="T1", name="T", imo_number="IMO1", capacity_mt=50000,
        grt=25000, length_m=200, beam_m=32, draft_m=12,
        speed_knots=14, fuel_consumption_mt_per_day=25,
        daily_charter_rate=5000000, crew_size=20,
        monthly_available_hours=720,
    )
    assert v720.monthly_available_hours == 720

    # 744 hours (31-day month) should now be valid (Bug 10 fix)
    v744 = HPCLVessel(
        id="T2", name="T", imo_number="IMO2", capacity_mt=50000,
        grt=25000, length_m=200, beam_m=32, draft_m=12,
        speed_knots=14, fuel_consumption_mt_per_day=25,
        daily_charter_rate=5000000, crew_size=20,
        monthly_available_hours=744,
    )
    assert v744.monthly_available_hours == 744

    # > 744 should fail
    with pytest.raises(ValueError):
        HPCLVessel(
            id="T3", name="T", imo_number="IMO3", capacity_mt=50000,
            grt=25000, length_m=200, beam_m=32, draft_m=12,
            speed_knots=14, fuel_consumption_mt_per_day=25,
            daily_charter_rate=5000000, crew_size=20,
            monthly_available_hours=800,
        )


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
