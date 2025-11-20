"""
HPCL Coastal Tanker Optimization - Maritime Cost Calculator
Comprehensive cost model for HPCL coastal operations
"""

from typing import Dict, List, Any
import math
from datetime import datetime
from ..models.schemas import HPCLVessel, HPCLPort

class HPCLCostCalculator:
    """
    HPCL-Specific Maritime Cost Calculator
    Calculates comprehensive voyage costs for coastal tanker operations
    """
    
    def __init__(self):
        # HPCL-Specific Cost Parameters
        self.bunker_fuel_density = 0.95  # MT/m³
        self.carbon_factor_hfo = 3.114   # gCO2/gFuel for Heavy Fuel Oil
        self.carbon_factor_mdo = 3.206   # gCO2/gFuel for Marine Diesel Oil
        
        # Indian Coastal Specific Factors
        self.indian_port_efficiency_factor = 0.85  # Compared to international standards
        self.monsoon_season_factor = 1.15  # 15% cost increase during monsoon
        self.cabotage_compliance_cost = 2500  # Fixed cost per voyage for compliance
        
        # Demurrage risk factors
        self.base_demurrage_rate = 25000  # ₹ per day
        self.port_congestion_factors = {
            'mumbai': 1.2,
            'kandla': 1.0,
            'cochin': 1.1,
            'chennai': 1.3,
            'vishakhapatnam': 1.1,
            'haldia': 1.4,
            'paradip': 1.2
        }
    
    async def calculate_voyage_cost(
        self,
        vessel: HPCLVessel,
        loading_port: HPCLPort,
        discharge_ports: List[HPCLPort],
        total_distance_nm: float,
        total_time_hours: float,
        cargo_quantity: float,
        fuel_price_per_mt: float = 45000.0
    ) -> Dict[str, float]:
        """
        Calculate comprehensive voyage cost breakdown for HPCL operations
        """
        cost_breakdown = {}
        
        # 1. Bunker Fuel Costs
        fuel_costs = self._calculate_fuel_costs(
            vessel, total_distance_nm, total_time_hours, fuel_price_per_mt
        )
        cost_breakdown.update(fuel_costs)
        
        # 2. Port Charges (Indian coastal ports)
        port_costs = self._calculate_port_costs(
            vessel, loading_port, discharge_ports, cargo_quantity
        )
        cost_breakdown.update(port_costs)
        
        # 3. Vessel Charter/Operating Costs
        charter_costs = self._calculate_charter_costs(vessel, total_time_hours)
        cost_breakdown.update(charter_costs)
        
        # 4. Cargo Handling Costs
        handling_costs = self._calculate_cargo_handling_costs(
            loading_port, discharge_ports, cargo_quantity
        )
        cost_breakdown.update(handling_costs)
        
        # 5. Demurrage Risk Provisioning
        demurrage_costs = self._calculate_demurrage_risk(
            vessel, loading_port, discharge_ports, total_time_hours
        )
        cost_breakdown.update(demurrage_costs)
        
        # 6. HPCL-Specific Costs (PSU compliance, etc.)
        hpcl_costs = self._calculate_hpcl_specific_costs(vessel, cargo_quantity)
        cost_breakdown.update(hpcl_costs)
        
        # 7. Calculate totals
        total_cost = sum(cost_breakdown.values())
        cost_breakdown['total_cost'] = total_cost
        
        return cost_breakdown
    
    def _calculate_fuel_costs(
        self,
        vessel: HPCLVessel,
        total_distance_nm: float,
        total_time_hours: float,
        fuel_price_per_mt: float
    ) -> Dict[str, float]:
        """
        Calculate bunker fuel costs with speed optimization
        """
        # Basic fuel consumption calculation
        sailing_days = total_time_hours / 24.0
        base_fuel_consumption = vessel.fuel_consumption_mt_per_day * sailing_days
        
        # Speed factor (fuel consumption increases cubically with speed)
        actual_speed = total_distance_nm / (total_time_hours) if total_time_hours > 0 else vessel.speed_knots
        speed_factor = (actual_speed / vessel.speed_knots) ** 3
        
        # Adjusted fuel consumption
        adjusted_fuel_consumption = base_fuel_consumption * speed_factor
        
        # Weather and seasonal factors
        current_month = datetime.now().month
        monsoon_factor = self.monsoon_season_factor if 6 <= current_month <= 9 else 1.0
        
        final_fuel_consumption = adjusted_fuel_consumption * monsoon_factor
        
        # Cost calculation
        fuel_cost = final_fuel_consumption * fuel_price_per_mt
        
        return {
            'fuel_cost': fuel_cost,
            'fuel_consumption_mt': final_fuel_consumption,
            'fuel_price_used': fuel_price_per_mt,
            'speed_factor': speed_factor,
            'weather_factor': monsoon_factor
        }
    
    def _calculate_port_costs(
        self,
        vessel: HPCLVessel,
        loading_port: HPCLPort,
        discharge_ports: List[HPCLPort],
        cargo_quantity: float
    ) -> Dict[str, float]:
        """
        Calculate Indian coastal port charges
        """
        total_port_charges = 0.0
        port_breakdown = {}
        
        # Loading port charges
        loading_charges = (
            loading_port.port_charges_per_visit +
            (vessel.grt * loading_port.grt_charge)
        )
        total_port_charges += loading_charges
        port_breakdown[f'loading_port_{loading_port.id}'] = loading_charges
        
        # Discharge port charges
        for i, discharge_port in enumerate(discharge_ports):
            discharge_charges = (
                discharge_port.port_charges_per_visit +
                (vessel.grt * discharge_port.grt_charge)
            )
            total_port_charges += discharge_charges
            port_breakdown[f'discharge_port_{i+1}_{discharge_port.id}'] = discharge_charges
        
        # Pilotage and navigation charges (Indian coastal specific)
        pilotage_charges = vessel.grt * 15  # ₹15 per GRT for coastal pilotage
        total_port_charges += pilotage_charges
        
        return {
            'port_charges_total': total_port_charges,
            'pilotage_charges': pilotage_charges,
            **port_breakdown
        }
    
    def _calculate_charter_costs(self, vessel: HPCLVessel, total_time_hours: float) -> Dict[str, float]:
        """
        Calculate vessel charter/operating costs
        """
        charter_days = total_time_hours / 24.0
        
        # Daily charter rate (includes crew, insurance, maintenance)
        charter_cost = charter_days * vessel.daily_charter_rate
        
        # Additional operational costs
        crew_overtime = 0.0
        if total_time_hours > 240:  # More than 10 days
            overtime_hours = total_time_hours - 240
            crew_overtime = overtime_hours * (vessel.crew_size * 500)  # ₹500 per crew per hour
        
        maintenance_provision = charter_days * 5000  # ₹5000 per day maintenance provision
        
        return {
            'charter_cost': charter_cost,
            'crew_overtime': crew_overtime,
            'maintenance_provision': maintenance_provision
        }
    
    def _calculate_cargo_handling_costs(
        self,
        loading_port: HPCLPort,
        discharge_ports: List[HPCLPort],
        cargo_quantity: float
    ) -> Dict[str, float]:
        """
        Calculate cargo loading and unloading costs
        """
        # Loading costs
        loading_cost = cargo_quantity * loading_port.cargo_handling_rate
        
        # Unloading costs (split cargo)
        total_unloading_cost = 0.0
        cargo_per_discharge_port = cargo_quantity / len(discharge_ports)
        
        for discharge_port in discharge_ports:
            port_unloading_cost = cargo_per_discharge_port * discharge_port.cargo_handling_rate
            total_unloading_cost += port_unloading_cost
        
        return {
            'cargo_loading_cost': loading_cost,
            'cargo_unloading_cost': total_unloading_cost,
            'total_cargo_handling': loading_cost + total_unloading_cost
        }
    
    def _calculate_demurrage_risk(
        self,
        vessel: HPCLVessel,
        loading_port: HPCLPort,
        discharge_ports: List[HPCLPort],
        total_time_hours: float
    ) -> Dict[str, float]:
        """
        Calculate demurrage risk provisioning based on port congestion
        """
        # Base demurrage risk
        base_risk_days = 0.5  # Half day provision per port call
        
        # Port-specific congestion factors
        loading_port_factor = self.port_congestion_factors.get(
            loading_port.name.lower(), 1.0
        )
        
        discharge_port_factors = []
        for port in discharge_ports:
            factor = self.port_congestion_factors.get(port.name.lower(), 1.0)
            discharge_port_factors.append(factor)
        
        # Calculate weighted risk
        total_risk_days = (
            base_risk_days * loading_port_factor +
            sum(base_risk_days * factor for factor in discharge_port_factors)
        )
        
        # Demurrage provision
        demurrage_provision = total_risk_days * self.base_demurrage_rate
        
        # Weather delay risk (monsoon season)
        current_month = datetime.now().month
        weather_risk = 0.0
        if 6 <= current_month <= 9:  # Monsoon season
            weather_risk = total_time_hours * 100  # ₹100 per hour weather risk
        
        return {
            'demurrage_provision': demurrage_provision,
            'weather_delay_risk': weather_risk,
            'total_demurrage_risk': demurrage_provision + weather_risk,
            'risk_days_provision': total_risk_days
        }
    
    def _calculate_hpcl_specific_costs(self, vessel: HPCLVessel, cargo_quantity: float) -> Dict[str, float]:
        """
        Calculate HPCL and PSU-specific costs
        """
        # Cabotage compliance costs
        cabotage_cost = self.cabotage_compliance_cost
        
        # PSU documentation and reporting costs
        psu_reporting_cost = 1500  # Fixed cost per voyage
        
        # Quality assurance and testing costs
        qa_cost = cargo_quantity * 25  # ₹25 per MT for quality checks
        
        # Insurance premium (PSU rates)
        insurance_premium = cargo_quantity * 50  # ₹50 per MT insurance
        
        # Government taxes and fees
        government_fees = cargo_quantity * 75  # ₹75 per MT various fees
        
        return {
            'cabotage_compliance': cabotage_cost,
            'psu_reporting': psu_reporting_cost,
            'quality_assurance': qa_cost,
            'insurance_premium': insurance_premium,
            'government_fees': government_fees,
            'total_hpcl_specific': (
                cabotage_cost + psu_reporting_cost + qa_cost +
                insurance_premium + government_fees
            )
        }
    
    def calculate_cost_efficiency_metrics(self, cost_breakdown: Dict[str, float], 
                                        distance_nm: float, cargo_mt: float, 
                                        time_hours: float) -> Dict[str, float]:
        """
        Calculate cost efficiency metrics for route comparison
        """
        total_cost = cost_breakdown.get('total_cost', 0)
        
        return {
            'cost_per_nm': total_cost / distance_nm if distance_nm > 0 else 0,
            'cost_per_mt': total_cost / cargo_mt if cargo_mt > 0 else 0,
            'cost_per_hour': total_cost / time_hours if time_hours > 0 else 0,
            'fuel_cost_percentage': (cost_breakdown.get('fuel_cost', 0) / total_cost * 100) if total_cost > 0 else 0,
            'port_cost_percentage': (cost_breakdown.get('port_charges_total', 0) / total_cost * 100) if total_cost > 0 else 0,
            'charter_cost_percentage': (cost_breakdown.get('charter_cost', 0) / total_cost * 100) if total_cost > 0 else 0
        }
    
    def estimate_cost_savings_vs_manual(self, optimized_cost: float, manual_benchmark: float = None) -> Dict[str, float]:
        """
        Estimate cost savings compared to manual planning
        """
        if manual_benchmark is None:
            # Estimate manual planning cost (typically 15-25% higher due to inefficiencies)
            manual_benchmark = optimized_cost * 1.20
        
        absolute_savings = manual_benchmark - optimized_cost
        percentage_savings = (absolute_savings / manual_benchmark * 100) if manual_benchmark > 0 else 0
        
        return {
            'manual_planning_cost': manual_benchmark,
            'optimized_cost': optimized_cost,
            'absolute_savings': absolute_savings,
            'percentage_savings': percentage_savings,
            'monthly_savings_projection': absolute_savings * 4,  # Assuming weekly optimization
            'annual_savings_projection': absolute_savings * 52
        }


class HPCLBenchmarkCalculator:
    """
    Calculate benchmarks and KPIs for HPCL operations
    """
    
    @staticmethod
    def calculate_industry_benchmarks(vessel_capacity: float, route_distance: float) -> Dict[str, float]:
        """
        Calculate industry benchmark costs for comparison
        """
        # Industry standard costs (global averages converted to INR)
        industry_fuel_cost_per_nm = 850  # ₹ per nautical mile
        industry_port_cost_per_call = 125000  # ₹ per port call
        industry_charter_rate_factor = 1.15  # 15% higher than HPCL rates
        
        benchmark_fuel_cost = route_distance * industry_fuel_cost_per_nm
        benchmark_port_cost = 3 * industry_port_cost_per_call  # Avg 3 port calls
        benchmark_total = benchmark_fuel_cost + benchmark_port_cost
        
        return {
            'industry_benchmark_total': benchmark_total,
            'industry_fuel_cost': benchmark_fuel_cost,
            'industry_port_cost': benchmark_port_cost,
            'cost_per_mt_benchmark': benchmark_total / vessel_capacity if vessel_capacity > 0 else 0
        }
    
    @staticmethod
    def calculate_hpcl_kpis(voyage_costs: List[Dict[str, float]], 
                           voyage_metrics: List[Dict[str, float]]) -> Dict[str, float]:
        """
        Calculate HPCL fleet-level KPIs
        """
        if not voyage_costs or not voyage_metrics:
            return {}
        
        total_costs = [cost.get('total_cost', 0) for cost in voyage_costs]
        total_distances = [metric.get('total_distance_nm', 0) for metric in voyage_metrics]
        total_cargo = [metric.get('cargo_quantity', 0) for metric in voyage_metrics]
        
        return {
            'average_voyage_cost': sum(total_costs) / len(total_costs) if total_costs else 0,
            'average_cost_per_nm': sum(total_costs) / sum(total_distances) if sum(total_distances) > 0 else 0,
            'average_cost_per_mt': sum(total_costs) / sum(total_cargo) if sum(total_cargo) > 0 else 0,
            'total_fleet_cost': sum(total_costs),
            'cost_variance': max(total_costs) - min(total_costs) if total_costs else 0,
            'fuel_cost_ratio': sum(cost.get('fuel_cost', 0) for cost in voyage_costs) / sum(total_costs) if sum(total_costs) > 0 else 0
        }
