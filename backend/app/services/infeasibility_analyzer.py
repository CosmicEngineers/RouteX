"""
Infeasibility Analysis Engine
Analyzes optimization failures and provides actionable suggestions
"""
from typing import List, Dict, Any, Tuple
import logging

logger = logging.getLogger(__name__)


class InfeasibilitySuggestion:
    """Represents a suggestion to fix infeasibility"""
    def __init__(self, action: str, impact: str, cost_estimate: float = 0, priority: int = 1):
        self.action = action
        self.impact = impact
        self.cost_estimate = cost_estimate  # In Rs
        self.priority = priority  # 1=high, 2=medium, 3=low


class InfeasibilityAnalyzer:
    """Analyzes infeasible optimization problems and suggests fixes"""
    
    def __init__(self, vessels: List[Dict], demands: Dict[str, int], fuel_price: float):
        self.vessels = vessels
        self.demands = demands
        self.fuel_price = fuel_price
        
    def analyze_capacity_shortage(self) -> List[InfeasibilitySuggestion]:
        """Check if total fleet capacity is insufficient"""
        suggestions = []
        
        total_capacity = sum(v.get('capacity_mt', 0) for v in self.vessels)
        total_demand = sum(self.demands.values())
        
        if total_demand > total_capacity * 2:  # Assuming max 2 trips/month
            shortage = total_demand - (total_capacity * 2)
            vessels_needed = (shortage // 25000) + 1  # Assume 25k MT average vessel
            
            suggestions.append(InfeasibilitySuggestion(
                action=f"Add {vessels_needed} vessel(s) with ~25,000 MT capacity each",
                impact=f"Covers {shortage:,} MT demand shortage",
                cost_estimate=vessels_needed * 500000 * 30,  # Est. ₹5L/day * 30 days
                priority=1
            ))
            
        return suggestions
    
    def analyze_time_constraints(self, max_trip_days: float = 10) -> List[InfeasibilitySuggestion]:
        """Check if time constraints are too tight"""
        suggestions = []
        
        # Estimate if vessels can complete required trips in time
        total_demand = sum(self.demands.values())
        total_capacity = sum(v.get('capacity_mt', 0) for v in self.vessels)
        
        trips_required = total_demand / total_capacity if total_capacity > 0 else float('inf')
        
        # If more than 2 trips needed per vessel, time constraints may be issue
        if trips_required > 2.5:
            suggestions.append(InfeasibilitySuggestion(
                action="Extend planning horizon from 30 to 45 days",
                impact="Allows more time for vessels to complete required trips",
                cost_estimate=0,  # No cost, just time extension
                priority=2
            ))
            
        return suggestions
    
    def analyze_port_coverage(self, port_distances: Dict[str, Dict[str, float]]) -> List[InfeasibilitySuggestion]:
        """Check if certain ports are unreachable or inefficient"""
        suggestions = []
        
        # Check for high-demand ports that are far from loading ports
        high_demand_ports = {k: v for k, v in self.demands.items() if v > 35000}
        
        for port, demand in high_demand_ports.items():
            # Estimate if this port is hard to serve
            # This is simplified - in production, use actual distance matrix
            suggestions.append(InfeasibilitySuggestion(
                action=f"Consider adding a loading port closer to {port}",
                impact=f"Reduces transit time for {demand:,} MT demand",
                cost_estimate=0,  # Operational change
                priority=3
            ))
            
        return suggestions
    
    def analyze_vessel_constraints(self) -> List[InfeasibilitySuggestion]:
        """Check if vessel constraints are too restrictive"""
        suggestions = []
        
        # Check if too few vessels are available
        if len(self.vessels) < 5:
            suggestions.append(InfeasibilitySuggestion(
                action=f"Include more vessels in optimization (currently {len(self.vessels)})",
                impact="Increases routing flexibility and coverage",
                cost_estimate=0,
                priority=2
            ))
            
        # Check for imbalanced vessel capacities
        capacities = [v.get('capacity_mt', 0) for v in self.vessels]
        if capacities:
            avg_capacity = sum(capacities) / len(capacities)
            small_vessels = [c for c in capacities if c < avg_capacity * 0.7]
            
            if len(small_vessels) > len(capacities) / 2:
                suggestions.append(InfeasibilitySuggestion(
                    action=f"Replace {len(small_vessels)} small vessels with larger capacity vessels",
                    impact="Better matches vessel capacity to demand requirements",
                    cost_estimate=len(small_vessels) * 300000 * 30,  # Incremental cost
                    priority=2
                ))
                
        return suggestions
    
    def analyze_demand_distribution(self) -> List[InfeasibilitySuggestion]:
        """Check if demand distribution is causing issues"""
        suggestions = []
        
        # Check for extremely high demand at single port
        max_demand_port = max(self.demands.items(), key=lambda x: x[1])
        port_name, demand = max_demand_port
        total_demand = sum(self.demands.values())
        
        if demand > total_demand * 0.3:  # Single port > 30% of total
            reduction = demand - int(total_demand * 0.25)
            suggestions.append(InfeasibilitySuggestion(
                action=f"Reduce demand at {port_name} by {reduction:,} MT",
                impact="Balances demand distribution across ports",
                cost_estimate=0,
                priority=3
            ))
            
        return suggestions
    
    def analyze_solver_settings(self, solve_time: int, num_workers: int) -> List[InfeasibilitySuggestion]:
        """Check if solver settings are limiting solution"""
        suggestions = []
        
        if solve_time < 120:
            suggestions.append(InfeasibilitySuggestion(
                action=f"Increase max solve time from {solve_time}s to 300s or more",
                impact="Allows solver more time to find feasible solution",
                cost_estimate=0,
                priority=1
            ))
            
        if num_workers < 4:
            suggestions.append(InfeasibilitySuggestion(
                action=f"Increase worker threads from {num_workers} to 8",
                impact="Enables parallel search for solutions",
                cost_estimate=0,
                priority=2
            ))
            
        return suggestions
    
    def generate_all_suggestions(
        self, 
        solve_time: int = 120, 
        num_workers: int = 4,
        port_distances: Dict[str, Dict[str, float]] = None
    ) -> List[InfeasibilitySuggestion]:
        """
        Generate comprehensive list of suggestions for infeasible problem
        
        Args:
            solve_time: Max solver time in seconds
            num_workers: Number of solver worker threads
            port_distances: Distance matrix between ports (optional)
            
        Returns:
            List of suggestions sorted by priority
        """
        all_suggestions = []
        
        # Run all analysis methods
        all_suggestions.extend(self.analyze_capacity_shortage())
        all_suggestions.extend(self.analyze_time_constraints())
        all_suggestions.extend(self.analyze_vessel_constraints())
        all_suggestions.extend(self.analyze_demand_distribution())
        all_suggestions.extend(self.analyze_solver_settings(solve_time, num_workers))
        
        if port_distances:
            all_suggestions.extend(self.analyze_port_coverage(port_distances))
        
        # Sort by priority (1=highest)
        all_suggestions.sort(key=lambda s: (s.priority, -s.cost_estimate))
        
        logger.info(f"Generated {len(all_suggestions)} infeasibility suggestions")
        
        return all_suggestions
    
    @staticmethod
    def format_suggestions(suggestions: List[InfeasibilitySuggestion]) -> Dict[str, Any]:
        """Format suggestions for API response"""
        return {
            "total_suggestions": len(suggestions),
            "suggestions": [
                {
                    "action": s.action,
                    "impact": s.impact,
                    "cost_estimate_rs": s.cost_estimate,
                    "cost_estimate_display": f"₹{s.cost_estimate / 10000000:.2f} Cr" if s.cost_estimate > 0 else "No additional cost",
                    "priority": "High" if s.priority == 1 else "Medium" if s.priority == 2 else "Low"
                }
                for s in suggestions[:5]  # Return top 5 suggestions
            ]
        }


def analyze_infeasibility(
    vessels: List[Dict],
    demands: Dict[str, int],
    fuel_price: float,
    solve_time: int = 120,
    num_workers: int = 4
) -> Dict[str, Any]:
    """
    Main function to analyze infeasible optimization and suggest fixes
    
    Usage:
        from app.services.infeasibility_analyzer import analyze_infeasibility
        
        suggestions = analyze_infeasibility(
            vessels=vessels_list,
            demands=demand_dict,
            fuel_price=45000,
            solve_time=120,
            num_workers=4
        )
    """
    analyzer = InfeasibilityAnalyzer(vessels, demands, fuel_price)
    suggestions = analyzer.generate_all_suggestions(solve_time, num_workers)
    
    return InfeasibilityAnalyzer.format_suggestions(suggestions)
