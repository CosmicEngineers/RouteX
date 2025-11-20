"""
HPCL Coastal Tanker Optimization - Celery Configuration
Background task processing for fleet optimization and analytics
"""

import os
from celery import Celery
from celery.schedules import crontab
from kombu import Queue, Exchange
from ..core.config import get_settings

settings = get_settings()


# Configure Celery
app = Celery(
    'hpcl_optimizer',
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=[
        'backend.app.tasks.optimization_tasks',
        'backend.app.tasks.analytics_tasks',
        'backend.app.tasks.monitoring_tasks'
    ]
)

# Celery Configuration
app.conf.update(
    # Task routing
    task_routes={
        'backend.app.tasks.optimization_tasks.*': {'queue': 'optimization'},
        'backend.app.tasks.analytics_tasks.*': {'queue': 'analytics'},
        'backend.app.tasks.monitoring_tasks.*': {'queue': 'monitoring'}
    },
    
    # Task queues
    task_queues=(
        Queue('optimization', Exchange('optimization'), routing_key='optimization',
              queue_arguments={'x-max-priority': 10}),
        Queue('analytics', Exchange('analytics'), routing_key='analytics',
              queue_arguments={'x-max-priority': 5}),
        Queue('monitoring', Exchange('monitoring'), routing_key='monitoring',
              queue_arguments={'x-max-priority': 2}),
    ),
    
    # Task execution settings
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='Asia/Kolkata',
    enable_utc=True,
    
    # Worker settings
    worker_max_tasks_per_child=100,
    worker_disable_rate_limits=False,
    worker_log_format='[%(asctime)s: %(levelname)s/%(processName)s] HPCL: %(message)s',
    worker_task_log_format='[%(asctime)s: %(levelname)s/%(processName)s][%(task_name)s(%(task_id)s)] %(message)s',
    
    # Task results
    result_expires=3600,
    result_persistent=True,
    task_track_started=True,
    task_ignore_result=False,
    
    # Task execution limits
    task_soft_time_limit=600,  # 10 minutes
    task_time_limit=900,       # 15 minutes hard limit
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    
    # Beat scheduler settings (for periodic tasks)
    beat_schedule={
        # Fleet monitoring every 15 minutes
        'hpcl-fleet-monitoring': {
            'task': 'backend.app.tasks.monitoring_tasks.monitor_fleet_status',
            'schedule': crontab(minute='*/15'),
            'options': {'queue': 'monitoring', 'priority': 3}
        },
        
        # Daily analytics aggregation
        'hpcl-daily-analytics': {
            'task': 'backend.app.tasks.analytics_tasks.generate_daily_kpis',
            'schedule': crontab(hour=1, minute=0),  # 1:00 AM IST daily
            'options': {'queue': 'analytics', 'priority': 7}
        },
        
        # Weekly performance report
        'hpcl-weekly-report': {
            'task': 'backend.app.tasks.analytics_tasks.generate_weekly_report',
            'schedule': crontab(hour=2, minute=0, day_of_week=1),  # Monday 2:00 AM IST
            'options': {'queue': 'analytics', 'priority': 5}
        },
        
        # Database cleanup - monthly
        'hpcl-cleanup-old-data': {
            'task': 'backend.app.tasks.monitoring_tasks.cleanup_old_optimization_results',
            'schedule': crontab(hour=3, minute=0, day_of_month=1),  # 1st of month, 3:00 AM IST
            'options': {'queue': 'monitoring', 'priority': 1}
        }
    },
    
    # Error handling
    task_reject_on_worker_lost=True,
    task_default_retry_delay=60,
    task_max_retries=3,
)

# Custom task base class for HPCL-specific tasks
class HPCLBaseTask(app.Task):
    """
    Base task class for HPCL optimization tasks
    """
    
    def on_failure(self, exc, task_id, args, kwargs, einfo):
        """
        Error handler for HPCL tasks
        """
        print(f'HPCL Task {self.name}[{task_id}] failed: {exc}')
        # Here you could add logging to database or send alerts
    
    def on_retry(self, exc, task_id, args, kwargs, einfo):
        """
        Retry handler for HPCL tasks
        """
        print(f'HPCL Task {self.name}[{task_id}] retry: {exc}')
    
    def on_success(self, retval, task_id, args, kwargs):
        """
        Success handler for HPCL tasks
        """
        print(f'HPCL Task {self.name}[{task_id}] succeeded')


# Set default task base
app.Task = HPCLBaseTask


# Task priority constants for HPCL operations
class HPCLTaskPriority:
    """
    Task priority levels for HPCL operations
    """
    CRITICAL = 10     # Emergency fleet optimization
    HIGH = 8          # Regular optimization requests
    MEDIUM = 5        # Analytics and reporting
    LOW = 3           # Monitoring and health checks
    BACKGROUND = 1    # Cleanup and maintenance


# Task routing helpers
def get_optimization_queue():
    """Get optimization task queue name"""
    return 'optimization'

def get_analytics_queue():
    """Get analytics task queue name"""
    return 'analytics'

def get_monitoring_queue():
    """Get monitoring task queue name"""
    return 'monitoring'


# Health check for Celery workers
@app.task(bind=True, name='hpcl.health.celery_ping')
def celery_health_check(self):
    """
    Health check task for HPCL Celery workers
    """
    return {
        'status': 'healthy',
        'worker_id': self.request.hostname,
        'timestamp': self.request.utc,
        'service': 'HPCL Fleet Optimizer - Celery Worker'
    }


if __name__ == '__main__':
    app.start()
