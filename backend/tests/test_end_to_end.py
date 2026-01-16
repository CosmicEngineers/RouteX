"""
End-to-end integration test with small 2×2 instance
Tests complete optimization flow: 2 vessels, 2 loading ports, 2 unloading ports
"""

import pytest
import asyncio
from app.models.schemas import HPCLVessel, HPCLPort, MonthlyDemand
from app.services.cp_sat_optimizer import HPCLCPSATOptimizer


@pytest.mark.asyncio
async def test_small_2x2_optimization():
    """
    Small test case: 2 vessels, 2 demands
    Verifies demand is met, cost is calculated, solution is feasible
    """
    
    # Define 2 vessels
    vessels = [
        HPCLVessel(
            id="T1",
            name="Test Vessel 1",
            imo_number="IMO1000001",
            capacity_mt=50000,
            grt=25000,
            length_m=200,
            beam_m=32,
            draft_m=12,
            speed_knots=14,
            fuel_consumption_mt_per_day=25,
            daily_charter_rate=5000000,  # ₹50 lakh/day
            crew_size=20,
            monthly_available_hours=720
        ),
        HPCLVessel(
            id="T2",
            name="Test Vessel 2",
            imo_number="IMO1000002",
            capacity_mt=25000,
            grt=12500,
            length_m=150,
            beam_m=24,
            draft_m=10,
            speed_knots=13,
            fuel_consumption_mt_per_day=15,
            daily_charter_rate=3500000,  # ₹35 lakh/day
            crew_size=18,
            monthly_available_hours=720
        )
    ]
    
    # Define 1 loading port
    loading_ports = [
        HPCLPort(
            id="L1",
            name="Loading Port L1",
            type="loading",
            latitude=19.0,
            longitude=72.8,
            state="Maharashtra",
            port_charges_per_visit=100000,
            loading_rate=2000.0
        )
    ]
    
    # Define 2 unloading ports
    unloading_ports = [
        HPCLPort(
            id="U1",
            name="Unloading Port U1",
            type="unloading",
            latitude=18.5,
            longitude=73.0,
            state="Maharashtra",
            port_charges_per_visit=80000,
            unloading_rate=1500.0
        ),
        HPCLPort(
            id="U2",
            name="Unloading Port U2",
            type="unloading",
            latitude=15.5,
            longitude=73.8,
            state="Goa",
            port_charges_per_visit=80000,
            unloading_rate=1500.0
        )
    ]
    
    # Define demands (feasible with 2 vessels)
    monthly_demands = [
        MonthlyDemand(port_id="U1", demand_mt=40000),
        MonthlyDemand(port_id="U2", demand_mt=25000)
    ]
    
    # Verify feasibility
    total_demand = sum(d.demand_mt for d in monthly_demands)
    total_capacity = sum(v.capacity_mt for v in vessels)
    
    assert total_demand == 65000, "Expected total demand of 65,000 MT"
    assert total_capacity == 75000, "Expected total capacity of 75,000 MT"
    assert total_capacity >= total_demand, "Must be feasible (capacity >= demand)"
    
    # Run optimization
    optimizer = HPCLCPSATOptimizer()
    
    result = await optimizer.optimize_hpcl_fleet(
        vessels=vessels,
        loading_ports=loading_ports,
        unloading_ports=unloading_ports,
        monthly_demands=monthly_demands,
        fuel_price_per_mt=45000.0,
        optimization_objective="cost",
        max_solve_time_seconds=60
    )
    
    # Assertions
    assert result is not None, "Optimization should return a result"
    assert result.optimization_status in ["optimal", "feasible"], f"Should find solution, got {result.optimization_status}"
    
    # Check demand satisfaction (hard constraint)
    assert result.demand_satisfaction_rate >= 99.0, f"Demand satisfaction should be ~100%, got {result.demand_satisfaction_rate}%"
    
    # Check that all demands are met
    for port_id, demand_mt in [(d.port_id, d.demand_mt) for d in monthly_demands]:
        met = result.demands_met.get(port_id, 0)
        assert abs(met - demand_mt) < 100, f"Port {port_id}: demand {demand_mt} MT, met {met} MT"
    
    # Check cost is positive and reasonable
    assert result.total_cost > 0, "Total cost should be positive"
    assert result.total_cost < 100000000, "Total cost seems unreasonably high (> ₹10 Cr)"
    
    # Check fleet utilization
    assert 0 <= result.fleet_utilization <= 100, "Fleet utilization should be 0-100%"
    
    # Check that at least some routes were selected
    assert len(result.selected_routes) > 0, "Should select at least one route"
    
    print(f"\n✓ Test passed!")
    print(f"  Status: {result.optimization_status}")
    print(f"  Total cost: ₹{result.total_cost:,.0f}")
    print(f"  Demand satisfaction: {result.demand_satisfaction_rate:.1f}%")
    print(f"  Fleet utilization: {result.fleet_utilization:.1f}%")
    print(f"  Routes selected: {len(result.selected_routes)}")


@pytest.mark.asyncio
async def test_infeasible_case():
    """
    Test infeasibility detection: demand > capacity
    """
    
    # 1 small vessel
    vessels = [
        HPCLVessel(
            id="T1",
            name="Small Vessel",
            imo_number="IMO1000001",
            capacity_mt=10000,  # Only 10k MT
            grt=5000,
            length_m=100,
            beam_m=20,
            draft_m=8,
            speed_knots=12,
            fuel_consumption_mt_per_day=10,
            daily_charter_rate=2000000,
            crew_size=15,
            monthly_available_hours=720
        )
    ]
    
    loading_ports = [
        HPCLPort(id="L1", name="Loading Port", type="loading", latitude=19.0, longitude=72.8, state="Maharashtra")
    ]
    
    unloading_ports = [
        HPCLPort(id="U1", name="Unloading Port", type="unloading", latitude=18.5, longitude=73.0, state="Maharashtra")
    ]
    
    # Huge demand that cannot be met
    monthly_demands = [
        MonthlyDemand(port_id="U1", demand_mt=500000)  # 500k MT - impossible with 10k vessel
    ]
    
    optimizer = HPCLCPSATOptimizer()
    
    result = await optimizer.optimize_hpcl_fleet(
        vessels=vessels,
        loading_ports=loading_ports,
        unloading_ports=unloading_ports,
        monthly_demands=monthly_demands,
        fuel_price_per_mt=45000.0,
        optimization_objective="cost",
        max_solve_time_seconds=30
    )
    
    # Should detect infeasibility
    assert result.optimization_status == "infeasible", f"Should be infeasible, got {result.optimization_status}"
    assert len(result.recommendations) > 0, "Should provide recommendations for infeasible case"
    assert result.demand_satisfaction_rate == 0, "No demand should be satisfied if infeasible"
    
    print(f"\n✓ Infeasibility test passed!")
    print(f"  Status: {result.optimization_status}")
    print(f"  Recommendations: {result.recommendations[0]}")


if __name__ == "__main__":
    # Run tests
    asyncio.run(test_small_2x2_optimization())
    asyncio.run(test_infeasible_case())
    print("\n✓ All end-to-end tests passed!")
