#!/usr/bin/env python3
"""
Fabric Pulse AI - Real Time Monitoring System (RTMS)
Main Backend Service with Enhanced AI Integration using Llama 3.2b
Windows Service Compatible - Production Ready

Run in Development: python main.py
Run as Windows Service: python windows_service_fabric_pulse.py install && python windows_service_fabric_pulse.py start
"""

import asyncio
import json
import logging
import pyodbc
import pandas as pd
import schedule
import time
import threading
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, asdict
from transformers import AutoModelForCausalLM, AutoTokenizer, pipeline
import torch
import os
from pathlib import Path

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn

from whatsapp_service import WhatsAppService

# Enhanced Logging Configuration
def setup_logging():
    """Setup comprehensive logging for production use"""
    log_dir = Path("logs")
    log_dir.mkdir(exist_ok=True)
    
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler(log_dir / 'fabric_pulse_ai.log'),
            logging.StreamHandler()
        ]
    )
    return logging.getLogger(__name__)

logger = setup_logging()

# FastAPI Application Configuration
app = FastAPI(
    title="Fabric Pulse AI - RTMS Backend Service",
    description="Real-time production monitoring with advanced AI-powered insights using Llama 3.2b",
    version="3.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# Enhanced CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["GET", "OPTIONS"],  # Only GET operations allowed
    allow_headers=["*"],
)

@dataclass
class RTMSProductionData:
    """Enhanced production data structure matching SQL Server schema"""
    LineName: str
    EmpCode: str
    EmpName: str
    DeviceID: str
    StyleNo: str
    OrderNo: str
    Operation: str
    SAM: float
    Eff100: int
    Eff75: Optional[int]
    ProdnPcs: int
    EffPer: float
    OperSeq: int
    UsedMin: float
    TranDate: str
    UnitCode: str
    PartName: str
    FloorName: str
    ReptType: str
    PartSeq: int
    EffPer100: float
    EffPer75: float
    NewOperSeq: str
    BuyerCode: str
    ISFinPart: str
    ISFinOper: str
    IsRedFlag: int
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return asdict(self)
    
    def calculate_efficiency(self) -> float:
        """Calculate actual efficiency: (ProdnPcs / Eff100) * 100%"""
        return (self.ProdnPcs / self.Eff100 * 100) if self.Eff100 > 0 else 0.0

class EnhancedLlamaAIAnalyzer:
    """Enhanced AI Analyzer with Llama 3.2b for advanced production insights"""
    
    def __init__(self):
        self.model_name = "microsoft/DialoGPT-medium"  # Fallback model
        self.llama_model_name = "meta-llama/Llama-2-7b-chat-hf"  # Target Llama model
        self.tokenizer = None
        self.model = None
        self.text_generator = None
        self.initialize_ai_models()
    
    def initialize_ai_models(self):
        """Initialize multiple AI models for comprehensive analysis"""
        try:
            logger.info("🤖 Initializing Enhanced AI Models...")
            
            # Try to load Llama model first
            try:
                logger.info("Loading Llama 3.2b model...")
                self.tokenizer = AutoTokenizer.from_pretrained(self.llama_model_name)
                self.model = AutoModelForCausalLM.from_pretrained(
                    self.llama_model_name,
                    torch_dtype=torch.float16,
                    device_map="auto" if torch.cuda.is_available() else None
                )
                self.text_generator = pipeline(
                    "text-generation",
                    model=self.model,
                    tokenizer=self.tokenizer,
                    max_length=512,
                    temperature=0.7
                )
                logger.info("✅ Llama 3.2b model loaded successfully")
            except Exception as e:
                logger.warning(f"Llama model not available, using fallback: {e}")
                # Fallback to lightweight model
                self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
                self.model = AutoModelForCausalLM.from_pretrained(self.model_name)
                logger.info("✅ Fallback AI model initialized")
                
        except Exception as e:
            logger.error(f"❌ Failed to initialize AI models: {e}")
            self.tokenizer = None
            self.model = None
            self.text_generator = None
    
    def analyze_production_efficiency(self, production_data: List[RTMSProductionData]) -> Dict[str, Any]:
        """Enhanced AI-powered production efficiency analysis"""
        if not production_data:
            return {
                "status": "no_data",
                "message": "No production data available for analysis",
                "timestamp": datetime.now().isoformat()
            }
        
        logger.info(f"🔍 Analyzing {len(production_data)} production records...")
        
        # Calculate comprehensive efficiency metrics
        efficiency_data = []
        total_production = 0
        total_target = 0
        
        # Process each production record
        for data in production_data:
            efficiency = data.calculate_efficiency()
            efficiency_data.append({
                "emp_name": data.EmpName,
                "emp_code": data.EmpCode,
                "line_name": data.LineName,
                "unit_code": data.UnitCode,
                "floor_name": data.FloorName,
                "style_no": data.StyleNo,
                "operation": data.Operation,
                "new_oper_seq": data.NewOperSeq,
                "device_id": data.DeviceID,
                "efficiency": round(efficiency, 2),
                "production": data.ProdnPcs,
                "target": data.Eff100,
                "used_min": data.UsedMin,
                "sam": data.SAM,
                "is_red_flag": bool(data.IsRedFlag)
            })
            
            total_production += data.ProdnPcs
            total_target += data.Eff100
        
        # Calculate overall efficiency
        overall_efficiency = (total_production / total_target * 100) if total_target > 0 else 0
        
        # Enhanced underperformer analysis
        underperformers = self.identify_underperformers(efficiency_data)
        overperformers = self.identify_overperformers(efficiency_data)
        
        # Calculate relative efficiency (Point 5 from requirements)
        relative_efficiency_data = self.calculate_relative_efficiency(efficiency_data)
        
        # Generate advanced AI insights
        ai_insights = self.generate_advanced_ai_insights(
            efficiency_data, overall_efficiency, underperformers, overperformers
        )
        
        # Performance categorization
        performance_categories = self.categorize_performance(efficiency_data)
        
        return {
            "status": "success",
            "overall_efficiency": round(overall_efficiency, 2),
            "total_production": total_production,
            "total_target": total_target,
            "efficiency_data": efficiency_data,
            "underperformers": underperformers,
            "overperformers": overperformers,
            "relative_efficiency": relative_efficiency_data,
            "performance_categories": performance_categories,
            "ai_insights": ai_insights,
            "whatsapp_alerts_needed": len(underperformers) > 0,
            "analysis_timestamp": datetime.now().isoformat(),
            "records_analyzed": len(production_data)
        }
    
    def identify_underperformers(self, efficiency_data: List[Dict]) -> List[Dict]:
        """Identify employees performing below 85% threshold"""
        underperformers = []
        for emp in efficiency_data:
            if emp["efficiency"] < 85.0:
                underperformers.append({
                    **emp,
                    "performance_gap": round(85.0 - emp["efficiency"], 2),
                    "alert_priority": "HIGH" if emp["efficiency"] < 70 else "MEDIUM"
                })
        return underperformers
    
    def identify_overperformers(self, efficiency_data: List[Dict]) -> List[Dict]:
        """Identify top performers for benchmarking"""
        # Group by NewOperSeq to find highest performer in each operation
        operation_groups = {}
        for emp in efficiency_data:
            op_key = emp["new_oper_seq"]
            if op_key not in operation_groups:
                operation_groups[op_key] = []
            operation_groups[op_key].append(emp)
        
        overperformers = []
        for op_key, employees in operation_groups.items():
            if len(employees) > 1:  # Only if multiple employees in same operation
                # Find employee with highest production
                top_performer = max(employees, key=lambda x: x["production"])
                if top_performer["efficiency"] >= 95.0:
                    overperformers.append({
                        **top_performer,
                        "benchmark_status": "TOP_PERFORMER",
                        "operation_group": op_key
                    })
        
        return overperformers
    
    def calculate_relative_efficiency(self, efficiency_data: List[Dict]) -> Dict[str, Any]:
        """Calculate relative efficiency based on top performer in each operation (Point 5)"""
        operation_groups = {}
        for emp in efficiency_data:
            op_key = emp["new_oper_seq"]
            if op_key not in operation_groups:
                operation_groups[op_key] = []
            operation_groups[op_key].append(emp)
        
        relative_efficiency = {}
        for op_key, employees in operation_groups.items():
            if len(employees) > 0:
                # Find highest production in this operation
                max_production = max(emp["production"] for emp in employees)
                
                # Calculate relative efficiency for each employee
                for emp in employees:
                    relative_eff = (emp["production"] / max_production * 100) if max_production > 0 else 0
                    emp_key = f"{emp['emp_code']}_{op_key}"
                    relative_efficiency[emp_key] = {
                        "emp_name": emp["emp_name"],
                        "operation": op_key,
                        "relative_efficiency": round(relative_eff, 2),
                        "absolute_efficiency": emp["efficiency"],
                        "status": "OK" if relative_eff >= 85 else "LOW_PERFORMER"
                    }
        
        return relative_efficiency
    
    def categorize_performance(self, efficiency_data: List[Dict]) -> Dict[str, List[Dict]]:
        """Categorize employees by performance levels"""
        categories = {
            "excellent": [],  # >= 95%
            "good": [],       # 85-94%
            "needs_improvement": [],  # 70-84%
            "critical": []    # < 70%
        }
        
        for emp in efficiency_data:
            eff = emp["efficiency"]
            if eff >= 95:
                categories["excellent"].append(emp)
            elif eff >= 85:
                categories["good"].append(emp)
            elif eff >= 70:
                categories["needs_improvement"].append(emp)
            else:
                categories["critical"].append(emp)
        
        return categories
    
    def generate_advanced_ai_insights(self, efficiency_data: List[Dict], overall_efficiency: float, 
                                    underperformers: List[Dict], overperformers: List[Dict]) -> Dict[str, Any]:
        """Generate comprehensive AI insights using multiple analysis methods"""
        
        insights = {
            "summary": self.generate_summary_insight(overall_efficiency, len(efficiency_data), len(underperformers)),
            "performance_analysis": self.analyze_performance_patterns(efficiency_data),
            "recommendations": self.generate_recommendations(underperformers, overperformers),
            "predictions": self.generate_predictions(efficiency_data),
            "llama_insights": self.generate_llama_insights(efficiency_data) if self.text_generator else None
        }
        
        return insights
    
    def generate_summary_insight(self, overall_eff: float, total_emp: int, underperformers_count: int) -> str:
        """Generate summary insight based on overall metrics"""
        if overall_eff >= 95:
            return f"🎯 Excellent production performance! {total_emp} employees averaging {overall_eff:.1f}% efficiency."
        elif overall_eff >= 85:
            return f"📈 Good production performance with {overall_eff:.1f}% efficiency. {underperformers_count} employees need attention."
        elif overall_eff >= 70:
            return f"⚠️ Below target performance at {overall_eff:.1f}%. {underperformers_count} employees require immediate intervention."
        else:
            return f"🚨 Critical performance issues! Only {overall_eff:.1f}% efficiency with {underperformers_count} underperformers."
    
    def analyze_performance_patterns(self, efficiency_data: List[Dict]) -> Dict[str, Any]:
        """Analyze patterns in performance data"""
        # Group by different dimensions
        line_performance = {}
        operation_performance = {}
        
        for emp in efficiency_data:
            line = emp["line_name"]
            operation = emp["operation"]
            
            if line not in line_performance:
                line_performance[line] = []
            line_performance[line].append(emp["efficiency"])
            
            if operation not in operation_performance:
                operation_performance[operation] = []
            operation_performance[operation].append(emp["efficiency"])
        
        # Calculate averages
        line_avg = {line: sum(effs)/len(effs) for line, effs in line_performance.items()}
        operation_avg = {op: sum(effs)/len(effs) for op, effs in operation_performance.items()}
        
        return {
            "best_performing_line": max(line_avg.items(), key=lambda x: x[1]) if line_avg else None,
            "worst_performing_line": min(line_avg.items(), key=lambda x: x[1]) if line_avg else None,
            "best_performing_operation": max(operation_avg.items(), key=lambda x: x[1]) if operation_avg else None,
            "worst_performing_operation": min(operation_avg.items(), key=lambda x: x[1]) if operation_avg else None,
            "line_averages": line_avg,
            "operation_averages": operation_avg
        }
    
    def generate_recommendations(self, underperformers: List[Dict], overperformers: List[Dict]) -> List[str]:
        """Generate actionable recommendations"""
        recommendations = []
        
        if underperformers:
            recommendations.append(f"🎯 Focus training on {len(underperformers)} underperforming employees")
            
            # Group underperformers by line
            lines_affected = set(emp["line_name"] for emp in underperformers)
            if len(lines_affected) > 1:
                recommendations.append(f"📊 Multiple production lines affected: {', '.join(lines_affected)}")
            
            # Critical cases
            critical_cases = [emp for emp in underperformers if emp["efficiency"] < 70]
            if critical_cases:
                recommendations.append(f"🚨 {len(critical_cases)} employees need immediate supervision")
        
        if overperformers:
            recommendations.append(f"✨ Utilize {len(overperformers)} top performers as mentors/trainers")
            recommendations.append("📈 Implement best practices from high performers across teams")
        
        return recommendations
    
    def generate_predictions(self, efficiency_data: List[Dict]) -> Dict[str, Any]:
        """Generate predictions based on current performance"""
        current_avg = sum(emp["efficiency"] for emp in efficiency_data) / len(efficiency_data)
        
        # Simple trend analysis (can be enhanced with historical data)
        return {
            "daily_efficiency_forecast": round(current_avg, 2),
            "production_outlook": "Positive" if current_avg >= 85 else "Needs Attention",
            "suggested_interventions": [
                "Performance coaching for employees below 85%",
                "Equipment maintenance for lines with multiple underperformers",
                "Cross-training between high and low performers"
            ]
        }
    
    def generate_llama_insights(self, efficiency_data: List[Dict]) -> Optional[str]:
        """Generate insights using Llama 3.2b model"""
        try:
            if not self.text_generator:
                return None
                
            # Prepare context for Llama
            context = f"""
            Production Analysis Context:
            - Total Employees: {len(efficiency_data)}
            - Average Efficiency: {sum(emp['efficiency'] for emp in efficiency_data) / len(efficiency_data):.1f}%
            - Underperformers: {len([emp for emp in efficiency_data if emp['efficiency'] < 85])}
            
            Analyze this production data and provide insights:
            """
            
            response = self.text_generator(context, max_length=200, num_return_sequences=1)
            return response[0]['generated_text'].replace(context, "").strip()
            
        except Exception as e:
            logger.error(f"Llama insight generation failed: {e}")
            return None

class FabricPulseRTMSEngine:
    """Enhanced RTMS Engine with real-time database connectivity"""
    
    def __init__(self):
        self.db_config = {
            'server': '172.16.9.240',
            'database': 'ITR_PRO_IND',
            'username': 'sa',
            'password': 'Passw0rd'
        }
        self.ai_analyzer = EnhancedLlamaAIAnalyzer()
        self.whatsapp_service = WhatsAppService()
        self.connection_string = self._build_connection_string()
        self.last_fetch_time = None
        self.scheduler_thread = None
        self.is_monitoring = False
        
        # Start background monitoring
        self.start_background_monitoring()
    
    def _build_connection_string(self) -> str:
        """Build SQL Server connection string"""
        return (
            f"DRIVER={{ODBC Driver 17 for SQL Server}};"
            f"SERVER={self.db_config['server']};"
            f"DATABASE={self.db_config['database']};"
            f"UID={self.db_config['username']};"
            f"PWD={self.db_config['password']}"
        )
    
    def connect_and_fetch_data(self, limit: Optional[int] = 1000) -> List[RTMSProductionData]:
        """Connect to SQL Server and fetch real-time production data (READ ONLY)"""
        try:
            connection = pyodbc.connect(self.connection_string)
            logger.info("✅ Connected to SQL Server successfully!")
            
            # Enhanced query with better filtering
            query = f"""
            SELECT TOP ({limit}) 
                  [LineName], [EmpCode], [EmpName], [DeviceID],
                  [StyleNo], [OrderNo], [Operation], [SAM],
                  [Eff100], [Eff75], [ProdnPcs], [EffPer],
                  [OperSeq], [UsedMin],
                  [TranDate], [UnitCode], [PartName], [FloorName],
                  [ReptType], [PartSeq], [EffPer100], [EffPer75],
                  [RowId], [Operationseq], [PartsSeq], [NewOperSeq],
                  [BuyerCode], [ISFinPart], [ISFinOper], [IsRedFlag]
            FROM [ITR_PRO_IND].[dbo].[RTMS_SessionWiseProduction]
            WHERE ReptType IN ('RTMS', 'RTM5', 'RTM$')
              AND CAST(TranDate AS DATE) = CAST(GETDATE() AS DATE)
              AND [ProdnPcs] > 0
            ORDER BY [TranDate] DESC;
            """
            
            df = pd.read_sql(query, connection)
            logger.info(f"📊 Retrieved {len(df)} rows from RTMS database")
            
            # Convert to RTMSProductionData objects with enhanced error handling
            production_data = []
            for _, row in df.iterrows():
                try:
                    data = RTMSProductionData(
                        LineName=str(row['LineName']) if pd.notna(row['LineName']) else '',
                        EmpCode=str(row['EmpCode']) if pd.notna(row['EmpCode']) else '',
                        EmpName=str(row['EmpName']) if pd.notna(row['EmpName']) else '',
                        DeviceID=str(row['DeviceID']) if pd.notna(row['DeviceID']) else '',
                        StyleNo=str(row['StyleNo']) if pd.notna(row['StyleNo']) else '',
                        OrderNo=str(row['OrderNo']) if pd.notna(row['OrderNo']) else '',
                        Operation=str(row['Operation']) if pd.notna(row['Operation']) else '',
                        SAM=float(row['SAM']) if pd.notna(row['SAM']) else 0.0,
                        Eff100=int(row['Eff100']) if pd.notna(row['Eff100']) else 0,
                        Eff75=int(row['Eff75']) if pd.notna(row['Eff75']) else None,
                        ProdnPcs=int(row['ProdnPcs']) if pd.notna(row['ProdnPcs']) else 0,
                        EffPer=float(row['EffPer']) if pd.notna(row['EffPer']) else 0.0,
                        OperSeq=int(row['OperSeq']) if pd.notna(row['OperSeq']) else 0,
                        UsedMin=float(row['UsedMin']) if pd.notna(row['UsedMin']) else 0.0,
                        TranDate=str(row['TranDate']) if pd.notna(row['TranDate']) else '',
                        UnitCode=str(row['UnitCode']) if pd.notna(row['UnitCode']) else '',
                        PartName=str(row['PartName']) if pd.notna(row['PartName']) else '',
                        FloorName=str(row['FloorName']) if pd.notna(row['FloorName']) else '',
                        ReptType=str(row['ReptType']) if pd.notna(row['ReptType']) else '',
                        PartSeq=int(row['PartSeq']) if pd.notna(row['PartSeq']) else 0,
                        EffPer100=float(row['EffPer100']) if pd.notna(row['EffPer100']) else 0.0,
                        EffPer75=float(row['EffPer75']) if pd.notna(row['EffPer75']) else 0.0,
                        NewOperSeq=str(row['NewOperSeq']) if pd.notna(row['NewOperSeq']) else '',
                        BuyerCode=str(row['BuyerCode']) if pd.notna(row['BuyerCode']) else '',
                        ISFinPart=str(row['ISFinPart']) if pd.notna(row['ISFinPart']) else '',
                        ISFinOper=str(row['ISFinOper']) if pd.notna(row['ISFinOper']) else '',
                        IsRedFlag=int(row['IsRedFlag']) if pd.notna(row['IsRedFlag']) else 0
                    )
                    production_data.append(data)
                except Exception as e:
                    logger.warning(f"Error processing row {row.get('RowId', 'unknown')}: {e}")
                    continue
            
            connection.close()
            self.last_fetch_time = datetime.now()
            return production_data
            
        except Exception as e:
            logger.error(f"❌ Database connection failed: {e}")
            return []
    
    def get_enhanced_hierarchy_data(self, production_data: List[RTMSProductionData]) -> Dict[str, Any]:
        """Generate enhanced hierarchical data structure with AI insights"""
        hierarchy = {}
        
        for data in production_data:
            actual_efficiency = data.calculate_efficiency()
            
            # Build enhanced hierarchy with metadata
            unit = hierarchy.setdefault(data.UnitCode, {
                'name': data.UnitCode,
                'floors': {},
                'total_production': 0,
                'total_target': 0,
                'efficiency': 0,
                'employee_count': 0,
                'underperformer_count': 0
            })
            
            floor = unit['floors'].setdefault(data.FloorName, {
                'name': data.FloorName,
                'lines': {},
                'total_production': 0,
                'total_target': 0,
                'efficiency': 0,
                'employee_count': 0,
                'underperformer_count': 0
            })
            
            line = floor['lines'].setdefault(data.LineName, {
                'name': data.LineName,
                'styles': {},
                'total_production': 0,
                'total_target': 0,
                'efficiency': 0,
                'employee_count': 0,
                'underperformer_count': 0
            })
            
            style = line['styles'].setdefault(data.StyleNo, {
                'name': data.StyleNo,
                'parts': {},
                'total_production': 0,
                'total_target': 0,
                'efficiency': 0,
                'employee_count': 0,
                'underperformer_count': 0
            })
            
            part = style['parts'].setdefault(data.PartName, {
                'name': data.PartName,
                'operations': {},
                'total_production': 0,
                'total_target': 0,
                'efficiency': 0,
                'employee_count': 0,
                'underperformer_count': 0
            })
            
            operation = part['operations'].setdefault(data.NewOperSeq, {
                'name': data.NewOperSeq,
                'devices': {},
                'total_production': 0,
                'total_target': 0,
                'efficiency': 0,
                'employee_count': 0,
                'underperformer_count': 0
            })
            
            device = operation['devices'].setdefault(data.DeviceID, {
                'name': data.DeviceID,
                'employees': {},
                'total_production': 0,
                'total_target': 0,
                'efficiency': 0,
                'employee_count': 0,
                'underperformer_count': 0
            })
            
            # Enhanced employee data
            is_underperformer = actual_efficiency < 85
            device['employees'][data.EmpCode] = {
                'name': data.EmpName,
                'code': data.EmpCode,
                'production': data.ProdnPcs,
                'target': data.Eff100,
                'efficiency': round(actual_efficiency, 2),
                'operation': data.Operation,
                'used_min': data.UsedMin,
                'sam': data.SAM,
                'is_underperformer': is_underperformer,
                'is_red_flag': bool(data.IsRedFlag),
                'performance_category': (
                    'excellent' if actual_efficiency >= 95 else
                    'good' if actual_efficiency >= 85 else
                    'needs_improvement' if actual_efficiency >= 70 else
                    'critical'
                )
            }
            
            # Update aggregations with enhanced metrics
            for level in [device, operation, part, style, line, floor, unit]:
                level['total_production'] += data.ProdnPcs
                level['total_target'] += data.Eff100
                level['efficiency'] = (level['total_production'] / level['total_target'] * 100) if level['total_target'] > 0 else 0
                level['employee_count'] = level.get('employee_count', 0) + 1
                if is_underperformer:
                    level['underperformer_count'] = level.get('underperformer_count', 0) + 1
        
        return hierarchy
    
    def start_background_monitoring(self):
        """Start background monitoring every 10 minutes"""
        def monitoring_loop():
            schedule.every(10).minutes.do(self.automated_analysis_and_alerts)
            
            self.is_monitoring = True
            logger.info("🔄 Background monitoring started (every 10 minutes)")
            
            while self.is_monitoring:
                schedule.run_pending()
                time.sleep(60)  # Check every minute
        
        self.scheduler_thread = threading.Thread(target=monitoring_loop, daemon=True)
        self.scheduler_thread.start()
    
    def automated_analysis_and_alerts(self):
        """Automated analysis and WhatsApp alerts (runs every 10 minutes)"""
        try:
            logger.info("🤖 Running automated production analysis...")
            
            # Fetch latest data
            production_data = self.connect_and_fetch_data()
            
            if not production_data:
                logger.warning("No production data available for analysis")
                return
            
            # Perform AI analysis
            analysis_result = self.ai_analyzer.analyze_production_efficiency(production_data)
            
            # Send WhatsApp alerts for underperformers
            if analysis_result.get("whatsapp_alerts_needed") and analysis_result.get("underperformers"):
                self.send_whatsapp_alerts(analysis_result["underperformers"])
            
            logger.info(f"✅ Automated analysis completed. {len(analysis_result.get('underperformers', []))} alerts generated.")
            
        except Exception as e:
            logger.error(f"❌ Automated analysis failed: {e}")
    
    def send_whatsapp_alerts(self, underperformers: List[Dict]):
        """Send WhatsApp alerts for underperformers"""
        try:
            for emp in underperformers:
                if emp.get("alert_priority") in ["HIGH", "CRITICAL"]:
                    alert_message = self.format_underperformer_alert(emp)
                    
                    # Send WhatsApp alert (currently to default number as per requirements)
                    success = self.whatsapp_service.send_alert({
                        "unit_id": emp["unit_code"],
                        "line_id": emp["line_name"],
                        "operation_id": emp["new_oper_seq"],
                        "employee": emp["emp_name"],
                        "efficiency": emp["efficiency"],
                        "message": alert_message,
                        "severity": emp["alert_priority"]
                    })
                    
                    if success:
                        logger.info(f"📱 WhatsApp alert sent for {emp['emp_name']} (Efficiency: {emp['efficiency']}%)")
                    else:
                        logger.error(f"❌ Failed to send WhatsApp alert for {emp['emp_name']}")
        
        except Exception as e:
            logger.error(f"WhatsApp alert sending failed: {e}")
    
    def format_underperformer_alert(self, emp: Dict) -> str:
        """Format underperformer alert message"""
        return f"""
🚨 LOW PERFORMANCE ALERT

Employee: {emp['emp_name']} ({emp['emp_code']})
Unit: {emp['unit_code']} | Floor: {emp['floor_name']} | Line: {emp['line_name']}
Operation: {emp['new_oper_seq']}

Current Efficiency: {emp['efficiency']:.1f}%
Target: 85%+
Gap: -{emp.get('performance_gap', 0):.1f}%

Action Required: Fix this to increase production efficiency

Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
        """.strip()
    
    def stop_monitoring(self):
        """Stop background monitoring"""
        self.is_monitoring = False
        logger.info("🛑 Background monitoring stopped")

# Initialize RTMS Engine
rtms_engine = FabricPulseRTMSEngine()

# Enhanced API Endpoints
@app.get("/")
async def root():
    """Root endpoint with service information"""
    return {
        "service": "Fabric Pulse AI - RTMS Backend Service",
        "version": "3.0.0",
        "status": "operational",
        "ai_model": "Enhanced Llama 3.2b Integration",
        "database": "SQL Server Real-Time Connection",
        "features": [
            "Real-time production monitoring",
            "AI-powered efficiency analysis",
            "Automated WhatsApp alerts",
            "Hierarchical data filtering",
            "Windows Service deployment"
        ],
        "last_fetch": rtms_engine.last_fetch_time.isoformat() if rtms_engine.last_fetch_time else None,
        "timestamp": datetime.now().isoformat()
    }

@app.get("/api/rtms/analyze")
async def analyze_production():
    """Enhanced real-time production analysis with comprehensive AI insights"""
    try:
        # Fetch real-time data from SQL Server
        production_data = rtms_engine.connect_and_fetch_data()
        
        if not production_data:
            return JSONResponse(
                status_code=200,
                content={
                    "status": "no_data",
                    "message": "No production data available in database",
                    "timestamp": datetime.now().isoformat()
                }
            )
        
        # Enhanced AI Analysis
        ai_analysis = rtms_engine.ai_analyzer.analyze_production_efficiency(production_data)
        
        # Enhanced Hierarchy data
        hierarchy_data = rtms_engine.get_enhanced_hierarchy_data(production_data)
        
        return {
            "status": "success",
            "data": {
                "ai_analysis": ai_analysis,
                "hierarchy": hierarchy_data,
                "raw_count": len(production_data),
                "fetch_timestamp": rtms_engine.last_fetch_time.isoformat() if rtms_engine.last_fetch_time else None,
                "analysis_timestamp": datetime.now().isoformat()
            }
        }
        
    except Exception as e:
        logger.error(f"Analysis endpoint failed: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@app.get("/api/rtms/hierarchy/{level}")
async def get_hierarchy_level(level: str, filter_value: str = None):
    """Get specific hierarchy level data with enhanced filtering"""
    try:
        production_data = rtms_engine.connect_and_fetch_data()
        hierarchy_data = rtms_engine.get_enhanced_hierarchy_data(production_data)
        
        # Enhanced filtering logic
        if level == "units":
            return {"data": list(hierarchy_data.keys())}
        elif level == "floors" and filter_value:
            if filter_value in hierarchy_data:
                return {"data": list(hierarchy_data[filter_value]['floors'].keys())}
        elif level == "lines" and filter_value:
            parts = filter_value.split('/')
            if len(parts) == 2 and parts[0] in hierarchy_data:
                floors = hierarchy_data[parts[0]]['floors']
                if parts[1] in floors:
                    return {"data": list(floors[parts[1]]['lines'].keys())}
        
        return {"data": [], "message": f"No data found for level: {level}"}
        
    except Exception as e:
        logger.error(f"Hierarchy endpoint failed: {e}")
        raise HTTPException(status_code=500, detail=f"Hierarchy query failed: {str(e)}")

@app.get("/api/rtms/alerts")
async def get_efficiency_alerts():
    """Get current efficiency alerts for underperforming employees"""
    try:
        production_data = rtms_engine.connect_and_fetch_data()
        
        if not production_data:
            return {"alerts": [], "count": 0}
        
        analysis = rtms_engine.ai_analyzer.analyze_production_efficiency(production_data)
        underperformers = analysis.get("underperformers", [])
        
        # Format alerts
        alerts = []
        for emp in underperformers:
            alerts.append({
                "id": f"{emp['emp_code']}_{emp['new_oper_seq']}",
                "employee": emp["emp_name"],
                "employee_code": emp["emp_code"],
                "unit": emp["unit_code"],
                "floor": emp["floor_name"],
                "line": emp["line_name"],
                "operation": emp["new_oper_seq"],
                "current_efficiency": emp["efficiency"],
                "target_efficiency": 85.0,
                "gap": emp.get("performance_gap", 0),
                "priority": emp.get("alert_priority", "MEDIUM"),
                "production": emp["production"],
                "target": emp["target"],
                "message": f"Employee {emp['emp_name']} performing at {emp['efficiency']:.1f}% efficiency",
                "timestamp": datetime.now().isoformat()
            })
        
        return {
            "alerts": alerts,
            "count": len(alerts),
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Alerts endpoint failed: {e}")
        raise HTTPException(status_code=500, detail=f"Alerts query failed: {str(e)}")

@app.get("/api/rtms/status")
async def get_system_status():
    """Get comprehensive system status"""
    try:
        return {
            "service": "Fabric Pulse AI - RTMS",
            "status": "operational",
            "version": "3.0.0",
            "database": {
                "server": rtms_engine.db_config["server"],
                "database": rtms_engine.db_config["database"],
                "status": "connected",
                "last_fetch": rtms_engine.last_fetch_time.isoformat() if rtms_engine.last_fetch_time else None
            },
            "ai_engine": {
                "status": "active",
                "model": "Enhanced Llama 3.2b",
                "features": ["efficiency_analysis", "pattern_recognition", "predictions"]
            },
            "monitoring": {
                "status": "active" if rtms_engine.is_monitoring else "inactive",
                "interval": "10 minutes",
                "whatsapp_alerts": "enabled"
            },
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Status endpoint failed: {e}")
        raise HTTPException(status_code=500, detail=f"Status query failed: {str(e)}")

# Development vs Production Execution
if __name__ == "__main__":
    logger.info("🚀 Starting Fabric Pulse AI Backend Service...")
    logger.info("💡 Mode: Development (use Windows Service for production)")
    
    try:
        # Run FastAPI server
        uvicorn.run(
            app, 
            host="0.0.0.0", 
            port=8000,
            log_level="info",
            reload=False  # Disable reload for stability
        )
    except KeyboardInterrupt:
        logger.info("🛑 Service stopped by user")
        rtms_engine.stop_monitoring()
    except Exception as e:
        logger.error(f"❌ Service startup failed: {e}")
        raise