#!/usr/bin/env python3
"""
Production Monitoring Scheduler
Runs AI analysis every 10 minutes and sends alerts
"""

import asyncio
import schedule
import time
import logging
from datetime import datetime
from main import ProductionMonitor
from whatsapp_service import create_whatsapp_service
from data_generator import ProductionDataGenerator

logger = logging.getLogger(__name__)

class ProductionScheduler:
    def __init__(self):
        self.monitor = ProductionMonitor()
        self.whatsapp_service = create_whatsapp_service("twilio")
        self.data_generator = ProductionDataGenerator()  # For demo data
        self.is_running = False
    
    def start_monitoring(self):
        """Start the production monitoring scheduler"""
        logger.info("Starting Production Monitoring Scheduler...")
        
        # Schedule tasks
        schedule.every(10).minutes.do(self.run_analysis)
        schedule.every().hour.do(self.hourly_check)
        schedule.every().day.at("08:00").do(self.daily_summary)
        
        # Generate initial demo data
        self.generate_demo_data()
        
        self.is_running = True
        
        # Run scheduler
        while self.is_running:
            schedule.run_pending()
            time.sleep(1)
    
    def run_analysis(self):
        """Run AI analysis and send alerts if needed"""
        try:
            logger.info("Running production analysis...")
            
            # Generate new demo data (simulate real-time updates)
            self.data_generator.generate_batch_data()
            
            # Analyze production efficiency
            alerts = self.monitor.analyze_production_efficiency()
            
            if alerts:
                logger.info(f"Generated {len(alerts)} alerts")
                
                # Send WhatsApp alerts for critical issues
                critical_alerts = [a for a in alerts if a.get('severity') == 'CRITICAL']
                
                for alert in critical_alerts:
                    success = self.whatsapp_service.send_alert(alert)
                    if success:
                        logger.info(f"WhatsApp alert sent for {alert['unit_id']}-{alert['line_id']}")
                    else:
                        logger.error(f"Failed to send WhatsApp alert")
            else:
                logger.info("No alerts generated - production within targets")
                
        except Exception as e:
            logger.error(f"Analysis run failed: {e}")
    
    def hourly_check(self):
        """Perform hourly system health check"""
        try:
            logger.info("Performing hourly system check...")
            
            # Check database connectivity
            alerts = self.monitor.analyze_production_efficiency()
            
            # Log system status
            logger.info(f"System operational - {len(alerts)} current alerts")
            
        except Exception as e:
            logger.error(f"Hourly check failed: {e}")
    
    def daily_summary(self):
        """Send daily production summary"""
        try:
            logger.info("Generating daily summary...")
            
            summary = self.generate_daily_summary()
            success = self.whatsapp_service.send_daily_summary(summary)
            
            if success:
                logger.info("Daily summary sent to management")
            else:
                logger.error("Failed to send daily summary")
                
        except Exception as e:
            logger.error(f"Daily summary failed: {e}")
    
    def generate_daily_summary(self) -> dict:
        """Generate daily production summary"""
        try:
            import sqlite3
            conn = sqlite3.connect(self.monitor.db_path)
            cursor = conn.cursor()
            
            # Get daily stats
            cursor.execute("""
                SELECT 
                    AVG(efficiency) as avg_efficiency,
                    COUNT(*) as total_records,
                    COUNT(CASE WHEN efficiency < 85 THEN 1 END) as below_target
                FROM production_data 
                WHERE DATE(timestamp) = DATE('now')
            """)
            
            stats = cursor.fetchone()
            
            # Get alerts count
            cursor.execute("""
                SELECT 
                    COUNT(*) as total_alerts,
                    COUNT(CASE WHEN alert_type = 'CRITICAL_UNDERPERFORMANCE' THEN 1 END) as critical_alerts
                FROM alerts 
                WHERE DATE(created_at) = DATE('now')
            """)
            
            alerts_stats = cursor.fetchone()
            
            conn.close()
            
            return {
                "avg_efficiency": stats[0] if stats[0] else 0,
                "total_alerts": alerts_stats[0] if alerts_stats[0] else 0,
                "critical_alerts": alerts_stats[1] if alerts_stats[1] else 0,
                "total_targets": stats[1] if stats[1] else 0,
                "targets_met": (stats[1] - stats[2]) if stats[1] and stats[2] else 0,
                "top_units": "Unit A, Unit B",  # Simplified for demo
                "attention_units": "Unit C needs monitoring"
            }
            
        except Exception as e:
            logger.error(f"Summary generation failed: {e}")
            return {}
    
    def generate_demo_data(self):
        """Generate initial demo data for testing"""
        try:
            logger.info("Generating demo data...")
            self.data_generator.generate_initial_data()
            logger.info("Demo data generated successfully")
        except Exception as e:
            logger.error(f"Demo data generation failed: {e}")
    
    def stop_monitoring(self):
        """Stop the monitoring scheduler"""
        self.is_running = False
        logger.info("Production monitoring scheduler stopped")

def main():
    """Main entry point for scheduler"""
    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    scheduler = ProductionScheduler()
    
    try:
        scheduler.start_monitoring()
    except KeyboardInterrupt:
        logger.info("Scheduler interrupted by user")
        scheduler.stop_monitoring()
    except Exception as e:
        logger.error(f"Scheduler failed: {e}")
        scheduler.stop_monitoring()

if __name__ == "__main__":
    main()