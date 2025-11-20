"""
HPCL Analytics Tasks
Celery tasks for KPI calculation, reporting, and performance analysis
"""

from celery import current_task
from typing import List, Dict, Any, Optional
import asyncio
from datetime import datetime, timedelta
import json

from ..core.celery_app import app, HPCLTaskPriority
from ..models.database import OptimizationResultDB, HPCLVesselDB, HPCLPortDB
from ..services.eeoi_calculator import hpcl_eeoi_calculator


@app.task(
    bind=True,
    name='hpcl.analytics.generate_daily_kpis',
    queue='analytics',
    priority=HPCLTaskPriority.MEDIUM
)
def generate_daily_kpis(self, target_date: Optional[str] = None):
    """
    Generate daily KPIs for HPCL fleet performance
    
    Args:
        target_date: Date in YYYY-MM-DD format, defaults to yesterday
    """
    
    async def _generate_kpis():
        try:
            self.update_state(state='PROGRESS', meta={'progress': 10, 'message': 'Collecting daily data'})
            
            # Determine target date
            if target_date:
                date_obj = datetime.strptime(target_date, '%Y-%m-%d')
            else:
                date_obj = datetime.now() - timedelta(days=1)
            
            date_str = date_obj.strftime('%Y-%m-%d')
            
            # Get optimization results for the day
            results = await OptimizationResultDB.get_results_by_date(date_str)
            
            if not results:
                return {
                    'date': date_str,
                    'status': 'no_data',
                    'message': f'No optimization results found for {date_str}'
                }
            
            self.update_state(state='PROGRESS', meta={'progress': 30, 'message': 'Calculating KPIs'})
            
            # Calculate daily KPIs
            daily_kpis = {
                'date': date_str,
                'optimization_runs': len(results),
                'total_cost': sum(r.get('total_cost', 0) for r in results),
                'total_cargo_mt': sum(r.get('total_cargo_mt', 0) for r in results),
                'avg_fleet_utilization': sum(r.get('fleet_utilization', 0) for r in results) / len(results),
                'avg_demand_satisfaction': sum(r.get('demand_satisfaction_rate', 0) for r in results) / len(results),
                'total_routes': sum(len(r.get('selected_routes', [])) for r in results),
                'avg_solve_time': sum(r.get('solve_time_seconds', 0) for r in results) / len(results)
            }
            
            # Calculate cost efficiency
            if daily_kpis['total_cargo_mt'] > 0:
                daily_kpis['cost_per_mt'] = daily_kpis['total_cost'] / daily_kpis['total_cargo_mt']
            else:
                daily_kpis['cost_per_mt'] = 0
            
            self.update_state(state='PROGRESS', meta={'progress': 60, 'message': 'Analyzing performance trends'})
            
            # Performance categorization
            utilization = daily_kpis['avg_fleet_utilization']
            demand_satisfaction = daily_kpis['avg_demand_satisfaction']
            
            if utilization >= 85 and demand_satisfaction >= 95:
                performance_grade = 'Excellent'
            elif utilization >= 75 and demand_satisfaction >= 90:
                performance_grade = 'Good'
            elif utilization >= 65 and demand_satisfaction >= 85:
                performance_grade = 'Fair'
            else:
                performance_grade = 'Needs Improvement'
            
            daily_kpis['performance_grade'] = performance_grade
            
            # Add operational insights
            daily_kpis['insights'] = []
            
            if utilization < 70:
                daily_kpis['insights'].append({
                    'type': 'low_utilization',
                    'message': f'Fleet utilization ({utilization:.1f}%) below optimal threshold',
                    'recommendation': 'Review vessel allocation and consider fleet right-sizing'
                })
            
            if demand_satisfaction < 90:
                daily_kpis['insights'].append({
                    'type': 'demand_shortfall',
                    'message': f'Demand satisfaction ({demand_satisfaction:.1f}%) below target',
                    'recommendation': 'Analyze capacity constraints and optimize route planning'
                })
            
            if daily_kpis['avg_solve_time'] > 300:  # 5 minutes
                daily_kpis['insights'].append({
                    'type': 'slow_optimization',
                    'message': f'Average solve time ({daily_kpis["avg_solve_time"]:.1f}s) exceeds threshold',
                    'recommendation': 'Consider reducing problem complexity or increasing solver time limits'
                })
            
            self.update_state(state='PROGRESS', meta={'progress': 90, 'message': 'Finalizing KPI report'})
            
            daily_kpis['generated_at'] = datetime.now().isoformat()
            daily_kpis['status'] = 'completed'
            
            # Save to database (would implement KPI storage)
            # await KPIResultDB.save_daily_kpis(daily_kpis)
            
            self.update_state(
                state='SUCCESS',
                meta={
                    'progress': 100,
                    'message': f'Daily KPIs generated for {date_str}',
                    'performance_grade': performance_grade,
                    'key_metrics': {
                        'fleet_utilization': f"{utilization:.1f}%",
                        'demand_satisfaction': f"{demand_satisfaction:.1f}%",
                        'cost_per_mt': f"₹{daily_kpis['cost_per_mt']:.2f}"
                    }
                }
            )
            
            return daily_kpis
            
        except Exception as e:
            self.update_state(state='FAILURE', meta={'error': str(e)})
            raise
    
    # Run async KPI generation
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(_generate_kpis())
    finally:
        loop.close()


@app.task(
    bind=True,
    name='hpcl.analytics.generate_weekly_report',
    queue='analytics',
    priority=HPCLTaskPriority.MEDIUM
)
def generate_weekly_report(self, week_ending_date: Optional[str] = None):
    """
    Generate comprehensive weekly performance report
    
    Args:
        week_ending_date: Week ending date in YYYY-MM-DD format
    """
    
    async def _generate_weekly_report():
        try:
            self.update_state(state='PROGRESS', meta={'progress': 5, 'message': 'Collecting weekly data'})
            
            # Determine week dates
            if week_ending_date:
                end_date = datetime.strptime(week_ending_date, '%Y-%m-%d')
            else:
                end_date = datetime.now()
                # Find last Sunday
                end_date = end_date - timedelta(days=end_date.weekday() + 1)
            
            start_date = end_date - timedelta(days=6)
            
            # Get weekly optimization results
            weekly_results = await OptimizationResultDB.get_results_by_date_range(
                start_date.strftime('%Y-%m-%d'),
                end_date.strftime('%Y-%m-%d')
            )
            
            if not weekly_results:
                return {
                    'week_ending': end_date.strftime('%Y-%m-%d'),
                    'status': 'no_data',
                    'message': 'No optimization data available for this week'
                }
            
            self.update_state(state='PROGRESS', meta={'progress': 20, 'message': 'Calculating weekly metrics'})
            
            # Weekly summary metrics
            weekly_report = {
                'week_ending': end_date.strftime('%Y-%m-%d'),
                'week_starting': start_date.strftime('%Y-%m-%d'),
                'optimization_runs': len(weekly_results),
                'total_shipments': sum(len(r.get('selected_routes', [])) for r in weekly_results),
                'total_cargo_mt': sum(r.get('total_cargo_mt', 0) for r in weekly_results),
                'total_cost': sum(r.get('total_cost', 0) for r in weekly_results),
                'avg_fleet_utilization': sum(r.get('fleet_utilization', 0) for r in weekly_results) / len(weekly_results),
                'avg_demand_satisfaction': sum(r.get('demand_satisfaction_rate', 0) for r in weekly_results) / len(weekly_results)
            }
            
            self.update_state(state='PROGRESS', meta={'progress': 40, 'message': 'Analyzing daily trends'})
            
            # Daily breakdown
            daily_breakdown = {}
            for result in weekly_results:
                date = result.get('created_at', '').split('T')[0]  # Extract date
                if date not in daily_breakdown:
                    daily_breakdown[date] = {
                        'runs': 0,
                        'cargo_mt': 0,
                        'cost': 0,
                        'utilization': 0,
                        'demand_satisfaction': 0
                    }
                
                daily_breakdown[date]['runs'] += 1
                daily_breakdown[date]['cargo_mt'] += result.get('total_cargo_mt', 0)
                daily_breakdown[date]['cost'] += result.get('total_cost', 0)
                daily_breakdown[date]['utilization'] += result.get('fleet_utilization', 0)
                daily_breakdown[date]['demand_satisfaction'] += result.get('demand_satisfaction_rate', 0)
            
            # Average daily values
            for date, data in daily_breakdown.items():
                if data['runs'] > 0:
                    data['utilization'] /= data['runs']
                    data['demand_satisfaction'] /= data['runs']
            
            weekly_report['daily_breakdown'] = daily_breakdown
            
            self.update_state(state='PROGRESS', meta={'progress': 60, 'message': 'Calculating cost analysis'})
            
            # Cost analysis
            if weekly_report['total_cargo_mt'] > 0:
                weekly_report['cost_per_mt'] = weekly_report['total_cost'] / weekly_report['total_cargo_mt']
                
                # Estimate cost savings vs manual planning (assume 18% efficiency gain)
                manual_cost_estimate = weekly_report['total_cost'] * 1.18
                weekly_report['estimated_savings'] = manual_cost_estimate - weekly_report['total_cost']
                weekly_report['savings_percentage'] = (weekly_report['estimated_savings'] / manual_cost_estimate) * 100
            
            self.update_state(state='PROGRESS', meta={'progress': 80, 'message': 'Generating insights'})
            
            # Weekly insights and recommendations
            insights = []
            
            # Fleet utilization trend
            utilizations = [data['utilization'] for data in daily_breakdown.values()]
            if len(utilizations) > 1:
                utilization_trend = utilizations[-1] - utilizations[0]
                if utilization_trend > 5:
                    insights.append({
                        'type': 'positive_trend',
                        'metric': 'fleet_utilization',
                        'message': f'Fleet utilization improved by {utilization_trend:.1f}% during the week'
                    })
                elif utilization_trend < -5:
                    insights.append({
                        'type': 'negative_trend',
                        'metric': 'fleet_utilization',
                        'message': f'Fleet utilization declined by {abs(utilization_trend):.1f}% during the week',
                        'recommendation': 'Review capacity planning and vessel allocation'
                    })
            
            # Cost efficiency
            if weekly_report.get('cost_per_mt', 0) > 3500:  # Threshold for high cost per MT
                insights.append({
                    'type': 'cost_concern',
                    'metric': 'cost_efficiency',
                    'message': f'Cost per MT (₹{weekly_report["cost_per_mt"]:.2f}) exceeds benchmark',
                    'recommendation': 'Analyze fuel efficiency and route optimization opportunities'
                })
            
            # Demand satisfaction consistency
            demand_satisfactions = [data['demand_satisfaction'] for data in daily_breakdown.values()]
            if min(demand_satisfactions) < 85:
                insights.append({
                    'type': 'service_risk',
                    'metric': 'demand_satisfaction',
                    'message': 'Demand satisfaction dropped below 85% on some days',
                    'recommendation': 'Review capacity allocation and emergency response procedures'
                })
            
            weekly_report['insights'] = insights
            weekly_report['generated_at'] = datetime.now().isoformat()
            
            # Executive summary
            performance_score = (weekly_report['avg_fleet_utilization'] + weekly_report['avg_demand_satisfaction']) / 2
            
            if performance_score >= 90:
                summary = "Excellent weekly performance with high efficiency and service levels"
            elif performance_score >= 80:
                summary = "Good weekly performance with room for minor improvements"
            elif performance_score >= 70:
                summary = "Satisfactory performance with opportunities for optimization"
            else:
                summary = "Performance below targets, requires immediate attention"
            
            weekly_report['executive_summary'] = summary
            weekly_report['performance_score'] = performance_score
            
            self.update_state(
                state='SUCCESS',
                meta={
                    'progress': 100,
                    'message': f'Weekly report generated for week ending {end_date.strftime("%Y-%m-%d")}',
                    'performance_score': f'{performance_score:.1f}/100',
                    'key_highlights': {
                        'total_cargo': f"{weekly_report['total_cargo_mt']:,.0f} MT",
                        'cost_savings': f"₹{weekly_report.get('estimated_savings', 0):,.0f}",
                        'fleet_utilization': f"{weekly_report['avg_fleet_utilization']:.1f}%"
                    }
                }
            )
            
            return weekly_report
            
        except Exception as e:
            self.update_state(state='FAILURE', meta={'error': str(e)})
            raise
    
    # Run async report generation
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(_generate_weekly_report())
    finally:
        loop.close()


@app.task(
    bind=True,
    name='hpcl.analytics.calculate_emission_metrics',
    queue='analytics',
    priority=HPCLTaskPriority.MEDIUM
)
def calculate_emission_metrics(self, optimization_result_id: str):
    """
    Calculate detailed emission metrics for optimization result
    
    Args:
        optimization_result_id: ID of optimization result to analyze
    """
    
    async def _calculate_emissions():
        try:
            self.update_state(state='PROGRESS', meta={'progress': 10, 'message': 'Loading optimization data'})
            
            # Get optimization result
            result_data = await OptimizationResultDB.get_result(optimization_result_id)
            
            if not result_data:
                raise ValueError(f"Optimization result {optimization_result_id} not found")
            
            # Get vessel data
            vessels_data = await HPCLVesselDB.get_all_vessels()
            vessels = [HPCLVessel(**vessel) for vessel in vessels_data]
            
            self.update_state(state='PROGRESS', meta={'progress': 30, 'message': 'Calculating voyage emissions'})
            
            # Create optimization result object
            from ..models.schemas import OptimizationResult
            result = OptimizationResult(**result_data)
            
            # Calculate fleet EEOI
            fleet_emissions = hpcl_eeoi_calculator.calculate_fleet_eeoi(result, vessels)
            
            self.update_state(state='PROGRESS', meta={'progress': 60, 'message': 'Generating compliance report'})
            
            # Generate compliance report
            compliance_report = hpcl_eeoi_calculator.generate_eeoi_compliance_report(fleet_emissions)
            
            self.update_state(state='PROGRESS', meta={'progress': 80, 'message': 'Analyzing emission trends'})
            
            # Emission analysis
            emission_analysis = {
                'optimization_id': optimization_result_id,
                'fleet_eeoi': fleet_emissions,
                'compliance_report': compliance_report,
                'emission_summary': {
                    'total_co2_mt': fleet_emissions.get('total_co2_emissions', 0),
                    'average_eeoi': fleet_emissions.get('fleet_average_eeoi', 0),
                    'imo_compliance': compliance_report.get('imo_compliant', False),
                    'green_shipping_score': compliance_report.get('green_shipping_score', 0)
                },
                'calculated_at': datetime.now().isoformat()
            }
            
            # Environmental insights
            insights = []
            
            avg_eeoi = fleet_emissions.get('fleet_average_eeoi', 0)
            if avg_eeoi > 12:  # IMO benchmark for tankers
                insights.append({
                    'type': 'emission_concern',
                    'message': f'Fleet EEOI ({avg_eeoi:.2f}) above IMO benchmark',
                    'recommendation': 'Consider speed optimization and route efficiency improvements'
                })
            elif avg_eeoi < 8:
                insights.append({
                    'type': 'emission_excellence',
                    'message': f'Fleet EEOI ({avg_eeoi:.2f}) significantly below IMO benchmark',
                    'note': 'Excellent environmental performance'
                })
            
            emission_analysis['environmental_insights'] = insights
            
            self.update_state(
                state='SUCCESS',
                meta={
                    'progress': 100,
                    'message': 'Emission metrics calculated successfully',
                    'emission_summary': {
                        'co2_emissions': f"{emission_analysis['emission_summary']['total_co2_mt']:.2f} MT",
                        'eeoi_score': f"{avg_eeoi:.2f}",
                        'imo_compliant': emission_analysis['emission_summary']['imo_compliance']
                    }
                }
            )
            
            return emission_analysis
            
        except Exception as e:
            self.update_state(state='FAILURE', meta={'error': str(e)})
            raise
    
    # Import vessel model
    from ..models.schemas import HPCLVessel
    
    # Run async emission calculation
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(_calculate_emissions())
    finally:
        loop.close()


@app.task(
    bind=True,
    name='hpcl.analytics.benchmark_performance',
    queue='analytics',
    priority=HPCLTaskPriority.LOW
)
def benchmark_performance_analysis(self, month: str):
    """
    Benchmark HPCL performance against industry standards
    
    Args:
        month: Month in YYYY-MM format for analysis
    """
    try:
        self.update_state(state='PROGRESS', meta={'progress': 20, 'message': 'Collecting performance data'})
        
        # Industry benchmarks for coastal tanker operations
        industry_benchmarks = {
            'fleet_utilization': {'excellent': 90, 'good': 80, 'fair': 70, 'poor': 60},
            'on_time_delivery': {'excellent': 95, 'good': 90, 'fair': 85, 'poor': 80},
            'fuel_efficiency': {'excellent': 20, 'good': 25, 'fair': 30, 'poor': 35},  # MT/day
            'cost_per_mt': {'excellent': 2800, 'good': 3200, 'fair': 3600, 'poor': 4000},  # INR
            'eeoi_score': {'excellent': 8, 'good': 10, 'fair': 12, 'poor': 15}  # g CO2/MT-nm
        }
        
        # Mock HPCL performance data (would come from analytics)
        hpcl_performance = {
            'fleet_utilization': 87.5,
            'on_time_delivery': 93.2,
            'fuel_efficiency': 23.8,
            'cost_per_mt': 2950,
            'eeoi_score': 9.2
        }
        
        self.update_state(state='PROGRESS', meta={'progress': 60, 'message': 'Performing benchmark analysis'})
        
        # Benchmark analysis
        benchmark_results = {}
        
        for metric, value in hpcl_performance.items():
            benchmark = industry_benchmarks[metric]
            
            if metric in ['cost_per_mt', 'fuel_efficiency', 'eeoi_score']:
                # Lower is better
                if value <= benchmark['excellent']:
                    grade = 'excellent'
                elif value <= benchmark['good']:
                    grade = 'good'
                elif value <= benchmark['fair']:
                    grade = 'fair'
                else:
                    grade = 'poor'
            else:
                # Higher is better
                if value >= benchmark['excellent']:
                    grade = 'excellent'
                elif value >= benchmark['good']:
                    grade = 'good'
                elif value >= benchmark['fair']:
                    grade = 'fair'
                else:
                    grade = 'poor'
            
            benchmark_results[metric] = {
                'value': value,
                'grade': grade,
                'benchmark_range': benchmark,
                'percentile': _calculate_percentile(value, benchmark, metric in ['cost_per_mt', 'fuel_efficiency', 'eeoi_score'])
            }
        
        # Overall performance score
        grade_scores = {'excellent': 100, 'good': 80, 'fair': 60, 'poor': 40}
        overall_score = sum(grade_scores[result['grade']] for result in benchmark_results.values()) / len(benchmark_results)
        
        analysis_report = {
            'month': month,
            'benchmark_results': benchmark_results,
            'overall_score': overall_score,
            'overall_grade': _score_to_grade(overall_score),
            'industry_position': 'Top Quartile' if overall_score >= 85 else 'Above Average' if overall_score >= 70 else 'Average',
            'generated_at': datetime.now().isoformat()
        }
        
        # Improvement recommendations
        recommendations = []
        
        for metric, result in benchmark_results.items():
            if result['grade'] in ['fair', 'poor']:
                if metric == 'fleet_utilization':
                    recommendations.append('Optimize vessel scheduling and reduce idle time')
                elif metric == 'fuel_efficiency':
                    recommendations.append('Implement speed optimization and weather routing')
                elif metric == 'cost_per_mt':
                    recommendations.append('Review fuel procurement and port efficiency')
                elif metric == 'eeoi_score':
                    recommendations.append('Focus on emission reduction and green shipping practices')
        
        analysis_report['recommendations'] = recommendations
        
        self.update_state(
            state='SUCCESS',
            meta={
                'progress': 100,
                'message': f'Benchmark analysis completed for {month}',
                'overall_grade': analysis_report['overall_grade'],
                'industry_position': analysis_report['industry_position']
            }
        )
        
        return analysis_report
        
    except Exception as e:
        self.update_state(state='FAILURE', meta={'error': str(e)})
        raise


def _calculate_percentile(value: float, benchmark: Dict[str, float], lower_is_better: bool) -> int:
    """Calculate percentile position based on benchmark"""
    if lower_is_better:
        if value <= benchmark['excellent']:
            return 95
        elif value <= benchmark['good']:
            return 80
        elif value <= benchmark['fair']:
            return 60
        else:
            return 30
    else:
        if value >= benchmark['excellent']:
            return 95
        elif value >= benchmark['good']:
            return 80
        elif value >= benchmark['fair']:
            return 60
        else:
            return 30


def _score_to_grade(score: float) -> str:
    """Convert numerical score to letter grade"""
    if score >= 90:
        return 'A+'
    elif score >= 85:
        return 'A'
    elif score >= 80:
        return 'B+'
    elif score >= 75:
        return 'B'
    elif score >= 70:
        return 'C+'
    elif score >= 65:
        return 'C'
    else:
        return 'D'
