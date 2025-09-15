#!/usr/bin/env python3
"""
Production Data Generator
Simulates real production data for testing and demonstration
"""

import sqlite3
import random
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

class ProductionDataGenerator:
    def __init__(self, db_path: str = "production.db"):
        self.db_path = db_path
        
        # Production configuration
        self.units = ["Unit-A", "Unit-B", "Unit-C", "Unit-D"]
        self.lines_per_unit = 4
        self.operations = ["Cutting", "Sewing", "Finishing", "Packing", "Quality"]
        self.styles = ["Style-001", "Style-002", "Style-003", "Style-004", "Style-005"]
        
        # Performance parameters
        self.base_efficiency = 88.0  # Base efficiency percentage
        self.efficiency_variance = 15.0  # Variance in efficiency
        self.target_pcs_range = (800, 1200)  # Target pieces per operation
    
    def generate_initial_data(self):
        """Generate initial production data for all units/lines/operations"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Clear existing data
            cursor.execute("DELETE FROM production_data")
            cursor.execute("DELETE FROM operators")
            
            # Generate operators data
            self.generate_operators_data(cursor)
            
            # Generate production data for last 24 hours
            end_time = datetime.now()
            start_time = end_time - timedelta(hours=24)
            
            current_time = start_time
            while current_time <= end_time:
                self.generate_production_snapshot(cursor, current_time)
                current_time += timedelta(minutes=10)
            
            conn.commit()
            conn.close()
            
            logger.info("Initial production data generated successfully")
            
        except Exception as e:
            logger.error(f"Initial data generation failed: {e}")
            raise
    
    def generate_operators_data(self, cursor):
        """Generate operators data for all units/lines/operations"""
        operator_id = 1
        
        for unit in self.units:
            for line_num in range(1, self.lines_per_unit + 1):
                line_id = f"Line-{line_num}"
                
                for operation in self.operations:
                    # Generate 2-5 operators per operation
                    operator_count = random.randint(2, 5)
                    
                    for i in range(operator_count):
                        cursor.execute("""
                            INSERT INTO operators (operator_id, name, unit_id, line_id, operation_id, status, efficiency_avg)
                            VALUES (?, ?, ?, ?, ?, ?, ?)
                        """, (
                            f"OP{operator_id:03d}",
                            f"Operator {operator_id}",
                            unit,
                            line_id,
                            operation,
                            random.choice(["ACTIVE", "ACTIVE", "ACTIVE", "ABSENT"]),  # 75% active
                            round(random.uniform(75, 98), 2)
                        ))
                        operator_id += 1
    
    def generate_production_snapshot(self, cursor, timestamp: datetime):
        """Generate production data snapshot for a specific time"""
        for unit in self.units:
            for line_num in range(1, self.lines_per_unit + 1):
                line_id = f"Line-{line_num}"
                
                for operation in self.operations:
                    # Get operator count for this operation
                    cursor.execute("""
                        SELECT COUNT(*) FROM operators 
                        WHERE unit_id = ? AND line_id = ? AND operation_id = ? AND status = 'ACTIVE'
                    """, (unit, line_id, operation))
                    
                    operator_count = cursor.fetchone()[0]
                    
                    if operator_count > 0:
                        # Generate production data
                        style = random.choice(self.styles)
                        target_pcs = random.randint(*self.target_pcs_range)
                        
                        # Calculate efficiency with some variance
                        base_eff = self.base_efficiency
                        
                        # Add time-based factors (lower efficiency at night)
                        hour = timestamp.hour
                        if 22 <= hour or hour <= 6:  # Night shift
                            base_eff -= 5
                        elif 14 <= hour <= 16:  # Post-lunch dip
                            base_eff -= 2
                        
                        # Add random variance
                        efficiency = base_eff + random.uniform(-self.efficiency_variance, self.efficiency_variance)
                        efficiency = max(30, min(100, efficiency))  # Clamp between 30-100%
                        
                        # Calculate actual pieces based on efficiency
                        actual_pcs = int(target_pcs * efficiency / 100)
                        
                        # Occasionally create problematic scenarios
                        if random.random() < 0.05:  # 5% chance of issues
                            issue_type = random.choice(["low_efficiency", "machine_breakdown", "material_shortage"])
                            
                            if issue_type == "low_efficiency":
                                efficiency = random.uniform(40, 70)
                                actual_pcs = int(target_pcs * efficiency / 100)
                            elif issue_type == "machine_breakdown":
                                efficiency = random.uniform(10, 40)
                                actual_pcs = int(target_pcs * efficiency / 100)
                            elif issue_type == "material_shortage":
                                efficiency = random.uniform(20, 60)
                                actual_pcs = int(target_pcs * efficiency / 100)
                        
                        # Insert production record
                        cursor.execute("""
                            INSERT INTO production_data 
                            (unit_id, line_id, operation_id, style, operator_count, target_pcs, actual_pcs, efficiency, timestamp)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """, (
                            unit, line_id, operation, style, operator_count,
                            target_pcs, actual_pcs, round(efficiency, 2), timestamp
                        ))
    
    def generate_batch_data(self):
        """Generate new batch of production data (called every 10 minutes)"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Generate data for current time
            current_time = datetime.now()
            self.generate_production_snapshot(cursor, current_time)
            
            conn.commit()
            conn.close()
            
            logger.info(f"Batch data generated for {current_time}")
            
        except Exception as e:
            logger.error(f"Batch data generation failed: {e}")
    
    def simulate_production_issues(self):
        """Simulate various production issues for testing alerts"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            current_time = datetime.now()
            
            # Simulate critical efficiency drop in Unit-A, Line-1
            cursor.execute("""
                INSERT INTO production_data 
                (unit_id, line_id, operation_id, style, operator_count, target_pcs, actual_pcs, efficiency, timestamp)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                "Unit-A", "Line-1", "Sewing", "Style-001", 3,
                1000, 450, 45.0, current_time  # 45% efficiency - should trigger alert
            ))
            
            # Simulate operator absenteeism in Unit-B, Line-2
            cursor.execute("""
                INSERT INTO production_data 
                (unit_id, line_id, operation_id, style, operator_count, target_pcs, actual_pcs, efficiency, timestamp)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                "Unit-B", "Line-2", "Cutting", "Style-002", 0,
                800, 0, 0.0, current_time  # No operators - should trigger alert
            ))
            
            # Simulate low efficiency in Unit-C, Line-3
            cursor.execute("""
                INSERT INTO production_data 
                (unit_id, line_id, operation_id, style, operator_count, target_pcs, actual_pcs, efficiency, timestamp)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                "Unit-C", "Line-3", "Finishing", "Style-003", 4,
                900, 650, 72.2, current_time  # 72% efficiency - should trigger alert
            ))
            
            conn.commit()
            conn.close()
            
            logger.info("Production issues simulated for testing")
            
        except Exception as e:
            logger.error(f"Issue simulation failed: {e}")
    
    def get_production_summary(self) -> dict:
        """Get current production summary"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Get latest production stats
            cursor.execute("""
                SELECT 
                    COUNT(DISTINCT unit_id) as units,
                    COUNT(DISTINCT line_id) as lines,
                    COUNT(DISTINCT operation_id) as operations,
                    AVG(efficiency) as avg_efficiency,
                    SUM(target_pcs) as total_target,
                    SUM(actual_pcs) as total_actual
                FROM production_data 
                WHERE timestamp >= datetime('now', '-10 minutes')
            """)
            
            stats = cursor.fetchone()
            conn.close()
            
            return {
                "active_units": stats[0] or 0,
                "active_lines": stats[1] or 0,
                "active_operations": stats[2] or 0,
                "avg_efficiency": round(stats[3], 2) if stats[3] else 0,
                "total_target": stats[4] or 0,
                "total_actual": stats[5] or 0,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Summary generation failed: {e}")
            return {}

if __name__ == "__main__":
    # Test data generation
    generator = ProductionDataGenerator()
    generator.generate_initial_data()
    
    # Simulate some issues for testing
    generator.simulate_production_issues()
    
    # Print summary
    summary = generator.get_production_summary()
    print("Production Summary:", summary)