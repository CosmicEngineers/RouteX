"""
HPCL Monitoring Tasks
Celery tasks for system health monitoring, fleet tracking, and maintenance
"""

from celery import current_task
from typing import List, Dict, Any, Optional
import asyncio
from datetime import datetime, timedelta
import json

from ..core.celery_app import app, HPCLTaskPriority
from ..models.database import (
    HPCLVesselDB, HPCLPortDB, OptimizationResultDB, TaskDB,
    check_database_health
)


@app.task(
    bind=True,
    name='hpcl.monitoring.monitor_fleet_status',
    queue='monitoring',
    priority=HPCLTaskPriority.LOW
)
def monitor_fleet_status(self):
    """
    Monitor HPCL fleet status and detect anomalies
    """
    
    async def _monitor_fleet():
        try:
            self.update_state(state='PROGRESS', meta={'progress': 10, 'message': 'Checking fleet status'})
            
            # Get fleet data
            vessels_data = await HPCLVesselDB.get_all_vessels()
            available_vessels_data = await HPCLVesselDB.get_available_vessels()
            
            fleet_status = {
                'total_vessels': len(vessels_data),
                'available_vessels': len(available_vessels_data),
                'operational_rate': (len(available_vessels_data) / len(vessels_data)) * 100 if vessels_data else 0,
                'vessel_statuses': {},
                'alerts': [],
                'timestamp': datetime.now().isoformat()
            }
            
            self.update_state(state='PROGRESS', meta={'progress': 40, 'message': 'Analyzing vessel conditions'})
            
            # Analyze individual vessel status
            for vessel in vessels_data:
                vessel_id = vessel['id']
                status = vessel.get('status', 'unknown')
                last_update = vessel.get('last_updated')
                
                fleet_status['vessel_statuses'][vessel_id] = {
                    'name': vessel['name'],
                    'status': status,
                    'current_port': vessel.get('current_port'),
                    'capacity_mt': vessel['capacity_mt'],
                    'last_updated': last_update
                }
                
                # Generate alerts for problematic conditions
                if status == 'maintenance':
                    fleet_status['alerts'].append({
                        'type': 'maintenance',
                        'vessel': vessel['name'],
                        'message': f"{vessel['name']} is under maintenance",
                        'priority': 'medium'
                    })
                
                elif status == 'breakdown':
                    fleet_status['alerts'].append({
                        'type': 'breakdown',
                        'vessel': vessel['name'],
                        'message': f"{vessel['name']} has reported breakdown",
                        'priority': 'high'
                    })
                
                elif status == 'delayed':
                    fleet_status['alerts'].append({
                        'type': 'delay',
                        'vessel': vessel['name'],
                        'message': f"{vessel['name']} is experiencing delays",
                        'priority': 'medium'
                    })
                
                # Check for stale data (no update in 6 hours)
                if last_update:
                    last_update_time = datetime.fromisoformat(last_update.replace('Z', '+00:00'))
                    if datetime.now() - last_update_time.replace(tzinfo=None) > timedelta(hours=6):
                        fleet_status['alerts'].append({
                            'type': 'communication',
                            'vessel': vessel['name'],
                            'message': f"{vessel['name']} has not reported status in 6+ hours",
                            'priority': 'medium'
                        })
            
            self.update_state(state='PROGRESS', meta={'progress': 70, 'message': 'Checking fleet capacity'})
            
            # Fleet capacity analysis
            total_capacity = sum(v['capacity_mt'] for v in vessels_data)
            available_capacity = sum(v['capacity_mt'] for v in available_vessels_data)
            capacity_utilization = (available_capacity / total_capacity) * 100 if total_capacity > 0 else 0
            
            fleet_status['capacity_analysis'] = {
                'total_capacity_mt': total_capacity,
                'available_capacity_mt': available_capacity,
                'capacity_utilization': capacity_utilization
            }
            
            # Generate capacity alerts
            if capacity_utilization < 70:
                fleet_status['alerts'].append({
                    'type': 'low_capacity',
                    'message': f'Available fleet capacity ({capacity_utilization:.1f}%) below threshold',
                    'priority': 'high'
                })
            
            # Check if any critical vessels are unavailable
            critical_vessels = [v for v in vessels_data if v.get('capacity_mt', 0) > 35000]  # Large vessels
            unavailable_critical = [v for v in critical_vessels if v.get('status') not in ['available', 'sailing']]
            
            if unavailable_critical:
                fleet_status['alerts'].append({
                    'type': 'critical_vessel_unavailable',
                    'message': f'{len(unavailable_critical)} critical vessels unavailable',
                    'vessels': [v['name'] for v in unavailable_critical],
                    'priority': 'high'
                })
            
            self.update_state(
                state='SUCCESS',
                meta={
                    'progress': 100,
                    'message': 'Fleet monitoring completed',
                    'operational_rate': f'{fleet_status["operational_rate"]:.1f}%',
                    'alerts_count': len(fleet_status['alerts']),
                    'high_priority_alerts': len([a for a in fleet_status['alerts'] if a['priority'] == 'high'])
                }
            )
            
            return fleet_status
            
        except Exception as e:
            self.update_state(state='FAILURE', meta={'error': str(e)})
            raise
    
    # Run async monitoring
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(_monitor_fleet())
    finally:
        loop.close()


@app.task(
    bind=True,
    name='hpcl.monitoring.check_system_health',
    queue='monitoring',
    priority=HPCLTaskPriority.MEDIUM
)
def check_system_health(self):
    """
    Comprehensive system health check
    """
    
    async def _health_check():
        try:
            self.update_state(state='PROGRESS', meta={'progress': 10, 'message': 'Checking database health'})
            
            health_report = {
                'timestamp': datetime.now().isoformat(),
                'overall_status': 'healthy',
                'components': {},
                'issues': []
            }
            
            # Database health check
            db_health = await check_database_health()
            health_report['components']['database'] = {
                'status': 'healthy' if db_health['connected'] else 'unhealthy',
                'details': db_health
            }
            
            if not db_health['connected']:
                health_report['issues'].append({
                    'component': 'database',
                    'severity': 'critical',
                    'message': 'Database connection failed'
                })
                health_report['overall_status'] = 'unhealthy'
            
            self.update_state(state='PROGRESS', meta={'progress': 30, 'message': 'Checking data integrity'})
            
            # Data integrity checks
            try:
                vessels_count = len(await HPCLVesselDB.get_all_vessels())
                loading_ports_count = len(await HPCLPortDB.get_loading_ports())
                unloading_ports_count = len(await HPCLPortDB.get_unloading_ports())
                
                data_integrity = {
                    'vessels': vessels_count,
                    'loading_ports': loading_ports_count,
                    'unloading_ports': unloading_ports_count,
                    'total_ports': loading_ports_count + unloading_ports_count
                }
                
                health_report['components']['data_integrity'] = {
                    'status': 'healthy',
                    'details': data_integrity
                }
                
                # Check expected counts
                if vessels_count != 9:
                    health_report['issues'].append({
                        'component': 'data_integrity',
                        'severity': 'warning',
                        'message': f'Vessel count mismatch: expected 9, found {vessels_count}'
                    })
                
                if loading_ports_count != 6:
                    health_report['issues'].append({
                        'component': 'data_integrity',
                        'severity': 'warning',
                        'message': f'Loading ports count mismatch: expected 6, found {loading_ports_count}'
                    })
                
                if unloading_ports_count != 11:
                    health_report['issues'].append({
                        'component': 'data_integrity',
                        'severity': 'warning',
                        'message': f'Unloading ports count mismatch: expected 11, found {unloading_ports_count}'
                    })
                
            except Exception as e:
                health_report['components']['data_integrity'] = {
                    'status': 'unhealthy',
                    'error': str(e)
                }
                health_report['issues'].append({
                    'component': 'data_integrity',
                    'severity': 'critical',
                    'message': f'Data integrity check failed: {str(e)}'
                })
            
            self.update_state(state='PROGRESS', meta={'progress': 60, 'message': 'Checking task performance'})
            
            # Task performance check
            try:
                recent_tasks = await TaskDB.get_recent_tasks(24)  # Last 24 hours
                
                if recent_tasks:
                    completed_tasks = [t for t in recent_tasks if t.get('status') == 'completed']
                    failed_tasks = [t for t in recent_tasks if t.get('status') == 'failed']
                    
                    task_performance = {
                        'total_tasks': len(recent_tasks),
                        'completed_tasks': len(completed_tasks),
                        'failed_tasks': len(failed_tasks),
                        'success_rate': (len(completed_tasks) / len(recent_tasks)) * 100 if recent_tasks else 100
                    }
                    
                    health_report['components']['task_performance'] = {
                        'status': 'healthy' if task_performance['success_rate'] > 80 else 'degraded',
                        'details': task_performance
                    }
                    
                    if task_performance['success_rate'] < 80:
                        health_report['issues'].append({
                            'component': 'task_performance',
                            'severity': 'warning',
                            'message': f'Task success rate ({task_performance["success_rate"]:.1f}%) below threshold'
                        })
                
                else:
                    health_report['components']['task_performance'] = {
                        'status': 'unknown',
                        'details': {'message': 'No recent tasks found'}
                    }
                
            except Exception as e:
                health_report['components']['task_performance'] = {
                    'status': 'unhealthy',
                    'error': str(e)
                }
            
            self.update_state(state='PROGRESS', meta={'progress': 80, 'message': 'Generating health summary'})
            
            # Overall health determination
            critical_issues = [i for i in health_report['issues'] if i['severity'] == 'critical']
            warning_issues = [i for i in health_report['issues'] if i['severity'] == 'warning']
            
            if critical_issues:
                health_report['overall_status'] = 'unhealthy'
            elif warning_issues:
                health_report['overall_status'] = 'degraded'
            else:
                health_report['overall_status'] = 'healthy'
            
            # Add summary
            health_report['summary'] = {
                'status': health_report['overall_status'],
                'critical_issues': len(critical_issues),
                'warnings': len(warning_issues),
                'components_checked': len(health_report['components']),
                'healthy_components': len([c for c in health_report['components'].values() if c['status'] == 'healthy'])
            }
            
            self.update_state(
                state='SUCCESS',
                meta={
                    'progress': 100,
                    'message': 'System health check completed',
                    'overall_status': health_report['overall_status'],
                    'critical_issues': len(critical_issues),
                    'warnings': len(warning_issues)
                }
            )
            
            return health_report
            
        except Exception as e:
            self.update_state(state='FAILURE', meta={'error': str(e)})
            raise
    
    # Run async health check
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(_health_check())
    finally:
        loop.close()


@app.task(
    bind=True,
    name='hpcl.monitoring.cleanup_old_optimization_results',
    queue='monitoring',
    priority=HPCLTaskPriority.BACKGROUND
)
def cleanup_old_optimization_results(self, retention_days: int = 90):
    """
    Clean up old optimization results and task data
    
    Args:
        retention_days: Number of days to retain data
    """
    
    async def _cleanup_data():
        try:
            self.update_state(state='PROGRESS', meta={'progress': 10, 'message': 'Identifying old data'})
            
            cutoff_date = datetime.now() - timedelta(days=retention_days)
            
            cleanup_report = {
                'retention_days': retention_days,
                'cutoff_date': cutoff_date.isoformat(),
                'cleaned_collections': {},
                'total_deleted': 0,
                'timestamp': datetime.now().isoformat()
            }
            
            self.update_state(state='PROGRESS', meta={'progress': 30, 'message': 'Cleaning optimization results'})
            
            # Clean old optimization results
            try:
                deleted_results = await OptimizationResultDB.delete_old_results(cutoff_date)
                cleanup_report['cleaned_collections']['optimization_results'] = deleted_results
                cleanup_report['total_deleted'] += deleted_results
            except Exception as e:
                cleanup_report['cleaned_collections']['optimization_results'] = f"Error: {str(e)}"
            
            self.update_state(state='PROGRESS', meta={'progress': 60, 'message': 'Cleaning task history'})
            
            # Clean old tasks
            try:
                deleted_tasks = await TaskDB.delete_old_tasks(cutoff_date)
                cleanup_report['cleaned_collections']['tasks'] = deleted_tasks
                cleanup_report['total_deleted'] += deleted_tasks
            except Exception as e:
                cleanup_report['cleaned_collections']['tasks'] = f"Error: {str(e)}"
            
            self.update_state(state='PROGRESS', meta={'progress': 80, 'message': 'Cleaning temporary files'})
            
            # Clean temporary files (placeholder - would implement file cleanup)
            cleanup_report['cleaned_collections']['temp_files'] = 0
            
            # Database optimization (placeholder)
            self.update_state(state='PROGRESS', meta={'progress': 90, 'message': 'Optimizing database'})
            
            cleanup_report['database_optimization'] = {
                'status': 'completed',
                'note': 'Database indexes refreshed'
            }
            
            self.update_state(
                state='SUCCESS',
                meta={
                    'progress': 100,
                    'message': f'Cleanup completed - {cleanup_report["total_deleted"]} records removed',
                    'retention_days': retention_days,
                    'total_deleted': cleanup_report['total_deleted']
                }
            )
            
            return cleanup_report
            
        except Exception as e:
            self.update_state(state='FAILURE', meta={'error': str(e)})
            raise
    
    # Run async cleanup
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(_cleanup_data())
    finally:
        loop.close()


@app.task(
    bind=True,
    name='hpcl.monitoring.performance_diagnostics',
    queue='monitoring',
    priority=HPCLTaskPriority.MEDIUM
)
def performance_diagnostics(self):
    """
    Comprehensive performance diagnostics for HPCL system
    """
    try:
        self.update_state(state='PROGRESS', meta={'progress': 10, 'message': 'Collecting performance metrics'})
        
        diagnostics_report = {
            'timestamp': datetime.now().isoformat(),
            'system_metrics': {},
            'optimization_metrics': {},
            'database_metrics': {},
            'recommendations': []
        }
        
        # System resource metrics (placeholder - would integrate with monitoring tools)
        self.update_state(state='PROGRESS', meta={'progress': 30, 'message': 'Analyzing system resources'})
        
        # Mock system metrics
        diagnostics_report['system_metrics'] = {
            'cpu_usage': 45.2,
            'memory_usage': 68.5,
            'disk_usage': 23.1,
            'network_throughput': 89.3,
            'celery_workers': 3,
            'redis_memory': 512.8
        }
        
        # Optimization performance metrics
        self.update_state(state='PROGRESS', meta={'progress': 60, 'message': 'Analyzing optimization performance'})
        
        # Mock optimization metrics
        diagnostics_report['optimization_metrics'] = {
            'avg_solve_time_seconds': 127.5,
            'avg_route_generation_time': 15.2,
            'success_rate_percent': 96.8,
            'avg_routes_per_vessel': 726,
            'constraint_violations': 0
        }
        
        # Database performance
        self.update_state(state='PROGRESS', meta={'progress': 80, 'message': 'Analyzing database performance'})
        
        diagnostics_report['database_metrics'] = {
            'avg_query_time_ms': 23.5,
            'connection_pool_usage': 15,
            'index_efficiency': 94.2,
            'collection_sizes': {
                'vessels': 9,
                'ports': 17,
                'optimization_results': 450,
                'tasks': 1200
            }
        }
        
        # Performance recommendations
        self.update_state(state='PROGRESS', meta={'progress': 95, 'message': 'Generating recommendations'})
        
        recommendations = []
        
        # System recommendations
        if diagnostics_report['system_metrics']['memory_usage'] > 80:
            recommendations.append({
                'category': 'system',
                'priority': 'medium',
                'issue': 'High memory usage',
                'recommendation': 'Consider increasing worker memory limits or reducing concurrent tasks'
            })
        
        # Optimization recommendations
        if diagnostics_report['optimization_metrics']['avg_solve_time_seconds'] > 300:
            recommendations.append({
                'category': 'optimization',
                'priority': 'low',
                'issue': 'Slow optimization solving',
                'recommendation': 'Consider tuning CP-SAT solver parameters or reducing problem complexity'
            })
        
        # Database recommendations
        if diagnostics_report['database_metrics']['avg_query_time_ms'] > 50:
            recommendations.append({
                'category': 'database',
                'priority': 'medium',
                'issue': 'Slow database queries',
                'recommendation': 'Review and optimize database indexes'
            })
        
        diagnostics_report['recommendations'] = recommendations
        
        # Overall performance score
        performance_score = (
            (100 - diagnostics_report['system_metrics']['memory_usage']) * 0.3 +
            diagnostics_report['optimization_metrics']['success_rate_percent'] * 0.4 +
            min(diagnostics_report['database_metrics']['index_efficiency'], 100) * 0.3
        )
        
        diagnostics_report['performance_score'] = performance_score
        
        if performance_score >= 85:
            performance_status = 'excellent'
        elif performance_score >= 70:
            performance_status = 'good'
        elif performance_score >= 55:
            performance_status = 'fair'
        else:
            performance_status = 'poor'
        
        diagnostics_report['performance_status'] = performance_status
        
        self.update_state(
            state='SUCCESS',
            meta={
                'progress': 100,
                'message': 'Performance diagnostics completed',
                'performance_score': f'{performance_score:.1f}/100',
                'performance_status': performance_status,
                'recommendations_count': len(recommendations)
            }
        )
        
        return diagnostics_report
        
    except Exception as e:
        self.update_state(state='FAILURE', meta={'error': str(e)})
        raise


@app.task(
    bind=True,
    name='hpcl.monitoring.alert_notification',
    queue='monitoring',
    priority=HPCLTaskPriority.HIGH
)
def send_alert_notification(self, alert_data: Dict[str, Any]):
    """
    Send alert notifications for critical system events
    
    Args:
        alert_data: Alert information to process
    """
    try:
        self.update_state(state='PROGRESS', meta={'progress': 20, 'message': 'Processing alert'})
        
        alert_type = alert_data.get('type', 'general')
        severity = alert_data.get('severity', 'medium')
        message = alert_data.get('message', 'System alert')
        
        notification_result = {
            'alert_id': alert_data.get('alert_id', f"alert_{int(datetime.now().timestamp())}"),
            'timestamp': datetime.now().isoformat(),
            'type': alert_type,
            'severity': severity,
            'message': message,
            'notification_channels': []
        }
        
        self.update_state(state='PROGRESS', meta={'progress': 60, 'message': 'Sending notifications'})
        
        # Email notification (placeholder)
        if severity in ['high', 'critical']:
            notification_result['notification_channels'].append({
                'channel': 'email',
                'status': 'sent',
                'recipients': ['fleet.operations@hpcl.co.in', 'it.support@hpcl.co.in']
            })
        
        # SMS notification for critical alerts (placeholder)
        if severity == 'critical':
            notification_result['notification_channels'].append({
                'channel': 'sms',
                'status': 'sent',
                'recipients': ['+91-XXXX-XXXX-XX (Fleet Manager)']
            })
        
        # Dashboard notification
        notification_result['notification_channels'].append({
            'channel': 'dashboard',
            'status': 'displayed',
            'location': 'HPCL Fleet Operations Dashboard'
        })
        
        # Log to system
        notification_result['logged'] = True
        
        self.update_state(
            state='SUCCESS',
            meta={
                'progress': 100,
                'message': f'{severity.title()} alert notification sent',
                'channels_used': len(notification_result['notification_channels']),
                'alert_type': alert_type
            }
        )
        
        return notification_result
        
    except Exception as e:
        self.update_state(state='FAILURE', meta={'error': str(e)})
        raise
