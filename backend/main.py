#!/usr/bin/env python3
"""
Production Monitoring AI Service
Real-time monitoring with WhatsApp alerts for garment production
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import sqlite3
import asyncio
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import json
from dataclasses import dataclass
import uvicorn

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Production Monitoring AI Service", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@dataclass
class ProductionData:
    unit_id: str
    line_id: str
    operation_id: str
    style: str
    operator_count: int
    target_pcs: int
    actual_pcs: int
    efficiency: float
    timestamp: datetime

class ProductionMonitor:
    def __init__(self, db_path: str = "production.db"):
        self.db_path = db_path
        self.alert_threshold = 85.0  # 85% efficiency threshold
        self.init_database()
        
    def init_database(self):
        """Initialize SQLite database with production tables"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Create production_data table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS production_data (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    unit_id TEXT NOT NULL,
                    line_id TEXT NOT NULL,
                    operation_id TEXT NOT NULL,
                    style TEXT NOT NULL,
                    operator_count INTEGER NOT NULL,
                    target_pcs INTEGER NOT NULL,
                    actual_pcs INTEGER NOT NULL,
                    efficiency REAL NOT NULL,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Create alerts table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS alerts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    unit_id TEXT NOT NULL,
                    line_id TEXT NOT NULL,
                    operation_id TEXT NOT NULL,
                    alert_type TEXT NOT NULL,
                    message TEXT NOT NULL,
                    efficiency REAL,
                    status TEXT DEFAULT 'PENDING',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Create operators table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS operators (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    operator_id TEXT UNIQUE NOT NULL,
                    name TEXT NOT NULL,
                    unit_id TEXT NOT NULL,
                    line_id TEXT NOT NULL,
                    operation_id TEXT NOT NULL,
                    status TEXT DEFAULT 'ACTIVE',
                    efficiency_avg REAL DEFAULT 100.0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            conn.commit()
            conn.close()
            logger.info("Database initialized successfully")
            
        except Exception as e:
            logger.error(f"Database initialization failed: {e}")
            raise
    
    def analyze_production_efficiency(self) -> List[Dict]:
        """AI-powered analysis of production efficiency"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Get latest production data (last 10 minutes)
            cursor.execute("""
                SELECT unit_id, line_id, operation_id, style, 
                       SUM(target_pcs) as total_target,
                       SUM(actual_pcs) as total_actual,
                       AVG(efficiency) as avg_efficiency,
                       COUNT(*) as operator_count,
                       MAX(timestamp) as last_update
                FROM production_data 
                WHERE timestamp >= datetime('now', '-10 minutes')
                GROUP BY unit_id, line_id, operation_id, style
            """)
            
            results = cursor.fetchall()
            alerts = []
            
            for row in results:
                unit_id, line_id, operation_id, style, target, actual, efficiency, op_count, last_update = row
                
                # AI Logic: Detect efficiency issues
                if efficiency < self.alert_threshold:
                    alert_type = self.classify_alert_type(efficiency, op_count, target, actual)
                    
                    alert = {
                        "unit_id": unit_id,
                        "line_id": line_id,
                        "operation_id": operation_id,
                        "style": style,
                        "efficiency": efficiency,
                        "alert_type": alert_type,
                        "message": self.generate_alert_message(alert_type, efficiency, unit_id, line_id),
                        "severity": self.calculate_severity(efficiency),
                        "timestamp": datetime.now().isoformat()
                    }
                    alerts.append(alert)
                    
                    # Save alert to database
                    self.save_alert(alert)
            
            conn.close()
            return alerts
            
        except Exception as e:
            logger.error(f"Production analysis failed: {e}")
            return []
    
    def classify_alert_type(self, efficiency: float, operator_count: int, target: int, actual: int) -> str:
        """AI classification of alert types based on production metrics"""
        if efficiency < 50:
            return "CRITICAL_UNDERPERFORMANCE"
        elif efficiency < 70:
            return "LOW_EFFICIENCY"
        elif operator_count == 0:
            return "OPERATOR_ABSENTEEISM"
        elif actual == 0 and target > 0:
            return "PRODUCTION_HALT"
        else:
            return "BELOW_TARGET"
    
    def calculate_severity(self, efficiency: float) -> str:
        """Calculate alert severity based on efficiency"""
        if efficiency < 50:
            return "CRITICAL"
        elif efficiency < 70:
            return "HIGH"
        else:
            return "MEDIUM"
    
    def generate_alert_message(self, alert_type: str, efficiency: float, unit_id: str, line_id: str) -> str:
        """Generate contextual alert messages"""
        messages = {
            "CRITICAL_UNDERPERFORMANCE": f"🚨 CRITICAL: Production efficiency at {efficiency:.1f}% in Unit {unit_id}, Line {line_id}. Immediate action required!",
            "LOW_EFFICIENCY": f"⚠️ LOW EFFICIENCY: Unit {unit_id}, Line {line_id} running at {efficiency:.1f}%. Target is 85%+",
            "OPERATOR_ABSENTEEISM": f"👥 STAFFING ALERT: No operators detected in Unit {unit_id}, Line {line_id}",
            "PRODUCTION_HALT": f"🛑 PRODUCTION HALT: Zero output detected in Unit {unit_id}, Line {line_id}",
            "BELOW_TARGET": f"📉 BELOW TARGET: Unit {unit_id}, Line {line_id} at {efficiency:.1f}% efficiency"
        }
        return messages.get(alert_type, f"Production issue detected: {efficiency:.1f}% efficiency")
    
    def save_alert(self, alert: Dict):
        """Save alert to database"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                INSERT INTO alerts (unit_id, line_id, operation_id, alert_type, message, efficiency)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                alert["unit_id"], alert["line_id"], alert["operation_id"],
                alert["alert_type"], alert["message"], alert["efficiency"]
            ))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Failed to save alert: {e}")

# Global monitor instance
monitor = ProductionMonitor()

@app.get("/")
async def root():
    return {"message": "Production Monitoring AI Service", "status": "running"}

@app.get("/api/analyze")
async def analyze_production():
    """Analyze current production and return alerts"""
    try:
        alerts = monitor.analyze_production_efficiency()
        return {
            "status": "success",
            "timestamp": datetime.now().isoformat(),
            "alerts": alerts,
            "alert_count": len(alerts)
        }
    except Exception as e:
        logger.error(f"Analysis failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/status")
async def get_system_status():
    """Get system status and recent alerts"""
    try:
        conn = sqlite3.connect(monitor.db_path)
        cursor = conn.cursor()
        
        # Get recent alerts
        cursor.execute("""
            SELECT COUNT(*) as total_alerts,
                   SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as pending_alerts
            FROM alerts 
            WHERE created_at >= datetime('now', '-1 hour')
        """)
        alert_stats = cursor.fetchone()
        
        # Get production summary
        cursor.execute("""
            SELECT COUNT(DISTINCT unit_id) as active_units,
                   COUNT(DISTINCT line_id) as active_lines,
                   AVG(efficiency) as avg_efficiency
            FROM production_data 
            WHERE timestamp >= datetime('now', '-10 minutes')
        """)
        production_stats = cursor.fetchone()
        
        conn.close()
        
        return {
            "status": "operational",
            "timestamp": datetime.now().isoformat(),
            "alerts": {
                "total": alert_stats[0] if alert_stats[0] else 0,
                "pending": alert_stats[1] if alert_stats[1] else 0
            },
            "production": {
                "active_units": production_stats[0] if production_stats[0] else 0,
                "active_lines": production_stats[1] if production_stats[1] else 0,
                "avg_efficiency": round(production_stats[2], 2) if production_stats[2] else 0
            }
        }
    except Exception as e:
        logger.error(f"Status check failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)