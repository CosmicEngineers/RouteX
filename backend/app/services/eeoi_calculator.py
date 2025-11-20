"""
HPCL Coastal Tanker Optimization - EEOI Emission Tracker
IMO-compliant Energy Efficiency Operational Indicator (EEOI) calculation system
"""

from typing import Dict, List, Any, Optional
import math
from datetime import datetime
from ..models.schemas import HPCLVessel, OptimizationResult

class HPCLEEOICalculator:
    """
    HPCL EEOI (Energy Efficiency Operational Indicator) Calculator
    Implements IMO guidelines for maritime emission tracking
    """
    
    def __init__(self):
        # IMO Carbon Factors (gCO2/gFuel)
        self.carbon_factors = {
            'hfo': 3.114,      # Heavy Fuel Oil
            'mdo': 3.206,      # Marine Diesel Oil
            'mgo': 3.206,      # Marine Gas Oil
            'lng': 2.750       # Liquefied Natural Gas
        }
        
        # HPCL Fleet typically uses HFO for main engines
        self.default_fuel_type = 'hfo'
        
        # IMO emission benchmarks for coastal tankers
        self.imo_benchmarks = {
            'excellent': 8.0,    # gCO2/tonne-nm
            'good': 12.0,
            'average': 16.0,
            'poor': 20.0
        }
        
        # Carbon pricing for green optimization
        self.carbon_price_per_tonne = 2000.0  # ₹2000 per tonne CO2
    
    def calculate_voyage_eeoi(
        self,
        vessel: HPCLVessel,
        fuel_consumption_mt: float,
        cargo_quantity_mt: float,
        distance_nm: float,
        fuel_type: str = None
    ) -> Dict[str, float]:
        """
        Calculate EEOI for a single voyage
        Formula: EEOI = (FC × CF) / (m_cargo × D)
        Where:
        - FC = Fuel Consumption (MT)
        - CF = Carbon Factor (gCO2/gFuel)
        - m_cargo = Cargo mass (MT)
        - D = Distance (nautical miles)
        """
        if not fuel_type:
            fuel_type = self.default_fuel_type
        
        if cargo_quantity_mt <= 0 or distance_nm <= 0:
            return self._create_zero_eeoi_result()
        
        # Get carbon factor
        carbon_factor = self.carbon_factors.get(fuel_type, self.carbon_factors['hfo'])
        
        # Convert fuel consumption to grams
        fuel_consumption_g = fuel_consumption_mt * 1_000_000  # MT to grams
        
        # Calculate total CO2 emissions (grams)
        total_co2_g = fuel_consumption_g * carbon_factor
        
        # Calculate EEOI (gCO2/tonne-nm)
        eeoi = total_co2_g / (cargo_quantity_mt * distance_nm)
        
        # Convert CO2 to metric tonnes for reporting
        total_co2_mt = total_co2_g / 1_000_000
        
        # Calculate efficiency rating
        efficiency_rating = self._get_efficiency_rating(eeoi)
        
        return {
            'eeoi_g_co2_per_tonne_nm': round(eeoi, 2),
            'total_co2_emissions_mt': round(total_co2_mt, 3),
            'total_co2_emissions_kg': round(total_co2_mt * 1000, 1),
            'fuel_consumption_mt': fuel_consumption_mt,
            'cargo_quantity_mt': cargo_quantity_mt,
            'distance_nm': distance_nm,
            'fuel_type': fuel_type,
            'carbon_factor': carbon_factor,
            'efficiency_rating': efficiency_rating,
            'carbon_cost_estimate': round(total_co2_mt * self.carbon_price_per_tonne, 2),
            'calculation_timestamp': datetime.now().isoformat()
        }
    
    def calculate_fleet_eeoi(
        self,
        optimization_result: OptimizationResult,
        vessels: List[HPCLVessel]
    ) -> Dict[str, Any]:
        """
        Calculate fleet-level EEOI metrics from optimization results
        """
        if not optimization_result.selected_routes:
            return self._create_zero_fleet_eeoi()
        
        total_co2_mt = 0.0
        total_cargo_mt = 0.0
        total_distance_nm = 0.0
        total_fuel_mt = 0.0
        voyage_eeois = []
        vessel_emissions = {}
        
        # Process each selected route
        for route in optimization_result.selected_routes:
            execution_count = route.get('execution_count', 1)
            
            # Get fuel consumption from route data
            fuel_consumption = route.get('fuel_consumption_mt', 0) * execution_count
            cargo_quantity = route.get('cargo_quantity', 0) * execution_count
            distance = route.get('total_distance_nm', 0) * execution_count
            vessel_id = route.get('vessel_id')
            
            # Find vessel details
            vessel = next((v for v in vessels if v.id == vessel_id), None)
            if not vessel:
                continue
            
            # Calculate voyage EEOI
            if cargo_quantity > 0 and distance > 0:
                voyage_eeoi = self.calculate_voyage_eeoi(
                    vessel=vessel,
                    fuel_consumption_mt=fuel_consumption / execution_count,  # Per voyage
                    cargo_quantity_mt=cargo_quantity / execution_count,
                    distance_nm=distance / execution_count
                )
                
                voyage_eeois.append(voyage_eeoi)
                
                # Accumulate totals
                total_co2_mt += voyage_eeoi['total_co2_emissions_mt'] * execution_count
                total_cargo_mt += cargo_quantity
                total_distance_nm += distance
                total_fuel_mt += fuel_consumption
                
                # Track vessel-specific emissions
                if vessel_id not in vessel_emissions:
                    vessel_emissions[vessel_id] = {
                        'vessel_name': vessel.name,
                        'co2_emissions_mt': 0.0,
                        'cargo_carried_mt': 0.0,
                        'distance_sailed_nm': 0.0,
                        'voyages_count': 0
                    }
                
                vessel_emissions[vessel_id]['co2_emissions_mt'] += voyage_eeoi['total_co2_emissions_mt'] * execution_count
                vessel_emissions[vessel_id]['cargo_carried_mt'] += cargo_quantity
                vessel_emissions[vessel_id]['distance_sailed_nm'] += distance
                vessel_emissions[vessel_id]['voyages_count'] += execution_count
        
        # Calculate fleet-wide EEOI
        fleet_eeoi = (total_co2_mt * 1_000_000) / (total_cargo_mt * total_distance_nm) if total_cargo_mt > 0 and total_distance_nm > 0 else 0
        
        # Calculate additional metrics
        average_voyage_eeoi = sum(v['eeoi_g_co2_per_tonne_nm'] for v in voyage_eeois) / len(voyage_eeois) if voyage_eeois else 0
        fleet_efficiency_rating = self._get_efficiency_rating(fleet_eeoi)
        
        # Carbon cost calculations
        total_carbon_cost = total_co2_mt * self.carbon_price_per_tonne
        
        # Benchmark comparisons
        benchmark_comparison = self._compare_to_benchmarks(fleet_eeoi)
        
        return {
            'fleet_eeoi_g_co2_per_tonne_nm': round(fleet_eeoi, 2),
            'average_voyage_eeoi': round(average_voyage_eeoi, 2),
            'total_co2_emissions_mt': round(total_co2_mt, 3),
            'total_fuel_consumption_mt': round(total_fuel_mt, 2),
            'total_cargo_transported_mt': round(total_cargo_mt, 2),
            'total_distance_sailed_nm': round(total_distance_nm, 2),
            'fleet_efficiency_rating': fleet_efficiency_rating,
            'total_carbon_cost_estimate': round(total_carbon_cost, 2),
            'vessel_emissions': vessel_emissions,
            'voyage_count': len(voyage_eeois),
            'benchmark_comparison': benchmark_comparison,
            'carbon_intensity_kg_per_mt': round((total_co2_mt * 1000) / total_cargo_mt, 2) if total_cargo_mt > 0 else 0,
            'fuel_efficiency_mt_per_nm': round(total_fuel_mt / total_distance_nm, 4) if total_distance_nm > 0 else 0,
            'calculation_timestamp': datetime.now().isoformat()
        }
    
    def calculate_green_optimization_savings(
        self,
        baseline_eeoi: Dict[str, Any],
        optimized_eeoi: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Calculate environmental benefits of optimization
        """
        baseline_co2 = baseline_eeoi.get('total_co2_emissions_mt', 0)
        optimized_co2 = optimized_eeoi.get('total_co2_emissions_mt', 0)
        
        co2_reduction_mt = baseline_co2 - optimized_co2
        co2_reduction_percentage = (co2_reduction_mt / baseline_co2 * 100) if baseline_co2 > 0 else 0
        
        carbon_cost_savings = co2_reduction_mt * self.carbon_price_per_tonne
        
        # Calculate equivalent environmental benefits
        trees_equivalent = co2_reduction_mt * 45  # 1 MT CO2 = 45 trees per year
        cars_off_road_equivalent = co2_reduction_mt / 4.6  # Average car emits 4.6 MT CO2/year
        
        return {
            'co2_reduction_mt': round(co2_reduction_mt, 3),
            'co2_reduction_percentage': round(co2_reduction_percentage, 2),
            'carbon_cost_savings': round(carbon_cost_savings, 2),
            'baseline_eeoi': baseline_eeoi.get('fleet_eeoi_g_co2_per_tonne_nm', 0),
            'optimized_eeoi': optimized_eeoi.get('fleet_eeoi_g_co2_per_tonne_nm', 0),
            'eeoi_improvement_percentage': round(
                ((baseline_eeoi.get('fleet_eeoi_g_co2_per_tonne_nm', 0) - 
                  optimized_eeoi.get('fleet_eeoi_g_co2_per_tonne_nm', 0)) / 
                 baseline_eeoi.get('fleet_eeoi_g_co2_per_tonne_nm', 1) * 100), 2
            ) if baseline_eeoi.get('fleet_eeoi_g_co2_per_tonne_nm', 0) > 0 else 0,
            'environmental_equivalents': {
                'trees_planted_equivalent': round(trees_equivalent, 0),
                'cars_off_road_equivalent': round(cars_off_road_equivalent, 1),
            },
            'annual_projection': {
                'co2_reduction_mt': round(co2_reduction_mt * 12, 2),  # Monthly to annual
                'carbon_cost_savings': round(carbon_cost_savings * 12, 2)
            }
        }
    
    def generate_eeoi_compliance_report(
        self,
        fleet_eeoi: Dict[str, Any],
        month: str = "2025-11"
    ) -> Dict[str, Any]:
        """
        Generate IMO compliance report for HPCL
        """
        fleet_eeoi_value = fleet_eeoi.get('fleet_eeoi_g_co2_per_tonne_nm', 0)
        
        # IMO compliance status
        compliance_status = "compliant" if fleet_eeoi_value <= self.imo_benchmarks['average'] else "attention_needed"
        
        # Improvement recommendations
        recommendations = []
        if fleet_eeoi_value > self.imo_benchmarks['good']:
            recommendations.extend([
                "Consider slow steaming to reduce fuel consumption",
                "Optimize cargo loading to maximize vessel utilization",
                "Review route planning for shorter distances",
                "Implement fuel-efficient sailing practices"
            ])
        
        if fleet_eeoi_value > self.imo_benchmarks['poor']:
            recommendations.extend([
                "URGENT: EEOI exceeds industry standards",
                "Consider vessel efficiency upgrades",
                "Mandatory fuel consumption monitoring",
                "Alternative fuel evaluation recommended"
            ])
        
        return {
            'report_month': month,
            'fleet_eeoi': fleet_eeoi_value,
            'compliance_status': compliance_status,
            'imo_benchmark_comparison': {
                'excellent_threshold': self.imo_benchmarks['excellent'],
                'good_threshold': self.imo_benchmarks['good'],
                'average_threshold': self.imo_benchmarks['average'],
                'poor_threshold': self.imo_benchmarks['poor'],
                'fleet_performance': fleet_eeoi.get('fleet_efficiency_rating', 'unknown')
            },
            'regulatory_requirements': {
                'imo_data_collection_system': "Required for vessels >5000 GT",
                'annual_reporting': "Submit to flag state by March 31",
                'verification': "Third-party verification recommended"
            },
            'recommendations': recommendations,
            'next_steps': [
                "Monitor monthly EEOI trends",
                "Implement recommended efficiency measures",
                "Prepare annual IMO DCS report",
                "Consider MRV compliance if applicable"
            ],
            'report_generated': datetime.now().isoformat(),
            'total_vessels': len(fleet_eeoi.get('vessel_emissions', {})),
            'total_voyages': fleet_eeoi.get('voyage_count', 0)
        }
    
    def _get_efficiency_rating(self, eeoi_value: float) -> str:
        """
        Get efficiency rating based on EEOI value
        """
        if eeoi_value <= self.imo_benchmarks['excellent']:
            return 'excellent'
        elif eeoi_value <= self.imo_benchmarks['good']:
            return 'good'
        elif eeoi_value <= self.imo_benchmarks['average']:
            return 'average'
        else:
            return 'poor'
    
    def _compare_to_benchmarks(self, eeoi_value: float) -> Dict[str, Any]:
        """
        Compare EEOI to industry benchmarks
        """
        rating = self._get_efficiency_rating(eeoi_value)
        
        # Calculate percentile position
        if eeoi_value <= self.imo_benchmarks['excellent']:
            percentile = 95
        elif eeoi_value <= self.imo_benchmarks['good']:
            percentile = 75
        elif eeoi_value <= self.imo_benchmarks['average']:
            percentile = 50
        else:
            percentile = 25
        
        return {
            'efficiency_rating': rating,
            'industry_percentile': percentile,
            'vs_excellent': round(eeoi_value - self.imo_benchmarks['excellent'], 2),
            'vs_good': round(eeoi_value - self.imo_benchmarks['good'], 2),
            'vs_average': round(eeoi_value - self.imo_benchmarks['average'], 2),
            'improvement_needed': eeoi_value > self.imo_benchmarks['good'],
            'regulatory_compliance': eeoi_value <= self.imo_benchmarks['poor']
        }
    
    def _create_zero_eeoi_result(self) -> Dict[str, float]:
        """
        Create zero EEOI result for invalid inputs
        """
        return {
            'eeoi_g_co2_per_tonne_nm': 0.0,
            'total_co2_emissions_mt': 0.0,
            'total_co2_emissions_kg': 0.0,
            'fuel_consumption_mt': 0.0,
            'cargo_quantity_mt': 0.0,
            'distance_nm': 0.0,
            'fuel_type': self.default_fuel_type,
            'carbon_factor': self.carbon_factors[self.default_fuel_type],
            'efficiency_rating': 'unknown',
            'carbon_cost_estimate': 0.0,
            'calculation_timestamp': datetime.now().isoformat()
        }
    
    def _create_zero_fleet_eeoi(self) -> Dict[str, Any]:
        """
        Create zero fleet EEOI result
        """
        return {
            'fleet_eeoi_g_co2_per_tonne_nm': 0.0,
            'average_voyage_eeoi': 0.0,
            'total_co2_emissions_mt': 0.0,
            'total_fuel_consumption_mt': 0.0,
            'total_cargo_transported_mt': 0.0,
            'total_distance_sailed_nm': 0.0,
            'fleet_efficiency_rating': 'unknown',
            'total_carbon_cost_estimate': 0.0,
            'vessel_emissions': {},
            'voyage_count': 0,
            'benchmark_comparison': self._compare_to_benchmarks(0.0),
            'carbon_intensity_kg_per_mt': 0.0,
            'fuel_efficiency_mt_per_nm': 0.0,
            'calculation_timestamp': datetime.now().isoformat()
        }


class HPCLGreenOptimizer:
    """
    Green optimization module for minimizing emissions instead of cost
    """
    
    def __init__(self):
        self.eeoi_calculator = HPCLEEOICalculator()
    
    def calculate_green_objective_value(
        self,
        route_data: Dict[str, Any],
        vessel: HPCLVessel
    ) -> float:
        """
        Calculate green objective value for route (minimizing emissions)
        """
        fuel_consumption = route_data.get('fuel_consumption_mt', 0)
        cargo_quantity = route_data.get('cargo_quantity', 0)
        distance = route_data.get('total_distance_nm', 0)
        
        if cargo_quantity <= 0 or distance <= 0:
            return float('inf')  # Invalid route
        
        # Calculate EEOI for this route
        eeoi_result = self.eeoi_calculator.calculate_voyage_eeoi(
            vessel=vessel,
            fuel_consumption_mt=fuel_consumption,
            cargo_quantity_mt=cargo_quantity,
            distance_nm=distance
        )
        
        # Return EEOI value for minimization (lower is better)
        return eeoi_result['eeoi_g_co2_per_tonne_nm']
    
    def suggest_green_improvements(
        self,
        fleet_eeoi: Dict[str, Any]
    ) -> List[str]:
        """
        Suggest specific improvements for green optimization
        """
        suggestions = []
        
        fleet_eeoi_value = fleet_eeoi.get('fleet_eeoi_g_co2_per_tonne_nm', 0)
        
        if fleet_eeoi_value > 15:
            suggestions.append("Implement slow steaming: Reduce speed by 10-15% to decrease fuel consumption by 20-30%")
        
        if fleet_eeoi_value > 12:
            suggestions.append("Optimize cargo loading: Ensure vessels sail with maximum allowable cargo")
        
        if fleet_eeoi_value > 10:
            suggestions.append("Route optimization: Use weather routing to minimize fuel consumption")
        
        vessel_emissions = fleet_eeoi.get('vessel_emissions', {})
        if vessel_emissions:
            # Identify least efficient vessels
            worst_performers = sorted(
                vessel_emissions.items(),
                key=lambda x: x[1].get('co2_emissions_mt', 0) / max(x[1].get('cargo_carried_mt', 1), 1),
                reverse=True
            )[:2]
            
            for vessel_id, data in worst_performers:
                suggestions.append(f"Focus on {data.get('vessel_name', vessel_id)}: Consider maintenance or efficiency upgrades")
        
        suggestions.append("Monitor fuel quality: Ensure optimal fuel specifications for efficiency")
        suggestions.append("Crew training: Implement eco-navigation practices")
        
        return suggestions[:5]  # Limit to top 5 suggestions


# Initialize global EEOI calculator
hpcl_eeoi_calculator = HPCLEEOICalculator()
hpcl_green_optimizer = HPCLGreenOptimizer()
