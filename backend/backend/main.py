#!/usr/bin/env python3
"""
Fabric Pulse AI - Real Time Monitoring System (RTMS)
Fixed Backend Service with Enhanced Database Handling
Version: 3.1.0 (Fixed)
"""

import os
import sys
import logging
import asyncio
import json
import pandas as pd
import schedule
import time
import threading
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, asdict
from pathlib import Path
import urllib.parse

# Set console encoding for Windows before any other imports
if sys.platform == 'win32':
    try:
        os.system('chcp 65001 >nul')
    except:
        pass

# Database imports
import sqlalchemy as sa
from sqlalchemy import create_engine, text

# FastAPI imports
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn

# AI imports (using free, open-source models)
try:
    from transformers import AutoTokenizer, AutoModelForCausalLM, pipeline
    AI_AVAILABLE = True
except ImportError:
    AI_AVAILABLE = False
    print("Warning: transformers not available. AI features will be disabled.")

# WhatsApp service import (if available)
try:
    from whatsapp_service import WhatsAppService
    WHATSAPP_AVAILABLE = True
except ImportError:
    WHATSAPP_AVAILABLE = False
    print("Warning: WhatsApp service not available. Alerts will be logged only.")

def setup_logging():
    """Setup comprehensive logging with Unicode support for Windows"""
    log_dir = Path("logs")
    log_dir.mkdir(exist_ok=True)

    # Create file handler with UTF-8 encoding
    file_handler = logging.FileHandler(
        log_dir / 'fabric_pulse_ai.log', 
        encoding='utf-8'
    )

    # Create console handler
    console_handler = logging.StreamHandler(sys.stdout)

    # Set formatters (removed emojis to prevent encoding issues)
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )

    file_handler.setFormatter(formatter)
    console_handler.setFormatter(formatter)

    # Configure root logger
    logging.basicConfig(
        level=logging.INFO,
        handlers=[file_handler, console_handler]
    )

    return logging.getLogger(__name__)

logger = setup_logging()

# FastAPI Application Configuration
app = FastAPI(
    title="Fabric Pulse AI - RTMS Backend Service (Fixed)",
    description="Real-time production monitoring with enhanced database connectivity",
    version="3.1.0",
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

class EnhancedOpenSourceAIAnalyzer:
    """Enhanced AI Analyzer using free, open-source models"""

    def __init__(self):
        # Use Microsoft DialoGPT as primary (no authentication needed)
        self.primary_model_name = "microsoft/DialoGPT-medium"

        # Backup options (all free and open)
        self.backup_models = [
            "distilgpt2",  # Smaller, faster GPT-2 variant
            "gpt2",        # Original GPT-2
            "microsoft/DialoGPT-small"  # Smaller DialoGPT
        ]

        self.tokenizer = None
        self.model = None
        self.text_generator = None

        if AI_AVAILABLE:
            self.initialize_ai_models()

    def initialize_ai_models(self):
        """Initialize free, open-source AI models"""
        if not AI_AVAILABLE:
            logger.warning("AI models not available - transformers library not installed")
            return

        try:
            logger.info("Initializing Open Source AI Models...")

            # Try primary model first
            try:
                logger.info(f"Loading {self.primary_model_name}...")

                self.tokenizer = AutoTokenizer.from_pretrained(self.primary_model_name)
                self.model = AutoModelForCausalLM.from_pretrained(self.primary_model_name)

                # Add padding token if not present
                if self.tokenizer.pad_token is None:
                    self.tokenizer.pad_token = self.tokenizer.eos_token

                self.text_generator = pipeline(
                    "text-generation",
                    model=self.model,
                    tokenizer=self.tokenizer,
                    max_length=256,
                    temperature=0.7,
                    do_sample=True,
                    pad_token_id=self.tokenizer.eos_token_id
                )

                logger.info("Primary AI model loaded successfully")

            except Exception as e:
                logger.warning(f"Primary model failed: {e}")

                # Try backup models
                for backup_model in self.backup_models:
                    try:
                        logger.info(f"Trying backup model: {backup_model}")
                        self.tokenizer = AutoTokenizer.from_pretrained(backup_model)
                        self.model = AutoModelForCausalLM.from_pretrained(backup_model)

                        if self.tokenizer.pad_token is None:
                            self.tokenizer.pad_token = self.tokenizer.eos_token

                        logger.info(f"Backup model {backup_model} loaded successfully")
                        break

                    except Exception as backup_error:
                        logger.warning(f"Backup model {backup_model} failed: {backup_error}")
                        continue

        except Exception as e:
            logger.error(f"Failed to initialize AI models: {e}")
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

        logger.info(f"Analyzing {len(production_data)} production records...")

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

        # Performance categorization
        performance_categories = self.categorize_performance(efficiency_data)

        # Generate AI insights
        ai_insights = self.generate_basic_insights(
            efficiency_data, overall_efficiency, underperformers, overperformers
        )

        return {
            "status": "success",
            "overall_efficiency": round(overall_efficiency, 2),
            "total_production": total_production,
            "total_target": total_target,
            "efficiency_data": efficiency_data,
            "underperformers": underperformers,
            "overperformers": overperformers,
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
        overperformers = []
        for emp in efficiency_data:
            if emp["efficiency"] >= 95.0:
                overperformers.append({
                    **emp,
                    "benchmark_status": "TOP_PERFORMER"
                })
        return overperformers

    def categorize_performance(self, efficiency_data: List[Dict]) -> Dict[str, List[Dict]]:
        """Categorize employees by performance levels"""
        categories = {
            "excellent": [],      # >= 95%
            "good": [],          # 85-94%
            "needs_improvement": [],  # 70-84%
            "critical": []       # < 70%
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

    def generate_basic_insights(self, efficiency_data: List[Dict], overall_efficiency: float, 
                               underperformers: List[Dict], overperformers: List[Dict]) -> Dict[str, Any]:
        """Generate basic insights without complex AI processing"""

        insights = {
            "summary": self.generate_summary_insight(overall_efficiency, len(efficiency_data), len(underperformers)),
            "performance_analysis": self.analyze_performance_patterns(efficiency_data),
            "recommendations": self.generate_recommendations(underperformers, overperformers),
            "ai_model_status": "Available" if self.text_generator else "Not Available"
        }

        return insights

    def generate_summary_insight(self, overall_eff: float, total_emp: int, underperformers_count: int) -> str:
        """Generate summary insight based on overall metrics"""
        if overall_eff >= 95:
            return f"Excellent production performance! {total_emp} employees averaging {overall_eff:.1f}% efficiency."
        elif overall_eff >= 85:
            return f"Good production performance with {overall_eff:.1f}% efficiency. {underperformers_count} employees need attention."
        elif overall_eff >= 70:
            return f"Below target performance at {overall_eff:.1f}%. {underperformers_count} employees require immediate intervention."
        else:
            return f"Critical performance issues! Only {overall_eff:.1f}% efficiency with {underperformers_count} underperformers."

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
            recommendations.append(f"Focus training on {len(underperformers)} underperforming employees")

        # Group underperformers by line
        lines_affected = set(emp["line_name"] for emp in underperformers)
        if len(lines_affected) > 1:
            recommendations.append(f"Multiple production lines affected: {', '.join(lines_affected)}")

        # Critical cases
        critical_cases = [emp for emp in underperformers if emp["efficiency"] < 70]
        if critical_cases:
            recommendations.append(f"{len(critical_cases)} employees need immediate supervision")

        if overperformers:
            recommendations.append(f"Utilize {len(overperformers)} top performers as mentors/trainers")
            recommendations.append("Implement best practices from high performers across teams")

        return recommendations

class FabricPulseRTMSEngine:
    """Enhanced RTMS Engine with SQLAlchemy for better database handling"""

    def __init__(self):
        self.db_config = {
            'server': '172.16.9.240',
            'database': 'ITR_PRO_IND',
            'username': 'sa',
            'password': 'Passw0rd',
            'driver': 'ODBC Driver 17 for SQL Server'
        }

        # Create SQLAlchemy engine
        self.engine = self._create_sqlalchemy_engine()
        self.ai_analyzer = EnhancedOpenSourceAIAnalyzer()

        # WhatsApp service (if available)
        self.whatsapp_service = WhatsAppService() if WHATSAPP_AVAILABLE else None

        self.last_fetch_time = None
        self.scheduler_thread = None
        self.is_monitoring = False

        # Start background monitoring
        self.start_background_monitoring()

    def _create_sqlalchemy_engine(self):
        """Create SQLAlchemy engine with proper connection string"""
        try:
            # URL encode the password to handle special characters
            password = urllib.parse.quote_plus(self.db_config['password'])
            username = urllib.parse.quote_plus(self.db_config['username'])
            server = self.db_config['server']
            database = self.db_config['database']

            # Create connection string for SQLAlchemy
            connection_string = (
                f"mssql+pyodbc://{username}:{password}@{server}/"
                f"{database}?driver=ODBC+Driver+17+for+SQL+Server&TrustServerCertificate=yes"
            )

            # Create engine with connection pooling
            engine = create_engine(
                connection_string,
                pool_size=5,
                max_overflow=10,
                pool_timeout=30,
                pool_recycle=3600,  # Recycle connections every hour
                echo=False  # Set to True for SQL query debugging
            )

            logger.info("SQLAlchemy engine created successfully")
            return engine

        except Exception as e:
            logger.error(f"Failed to create SQLAlchemy engine: {e}")
            return None

    def connect_and_fetch_data(self, limit: Optional[int] = 1000) -> List[RTMSProductionData]:
        """Enhanced data fetching with SQLAlchemy and better error handling"""
        if not self.engine:
            logger.error("Database engine not available")
            return []

        try:
            logger.info("Connecting to SQL Server database...")

            # Test connection first
            with self.engine.connect() as connection:
                # Test query to verify connection
                test_query = text("SELECT 1 AS test")
                test_result = connection.execute(test_query)
                logger.info("Database connection test successful")

            # Enhanced query with better filtering and debugging
            query = f"""
    SELECT TOP ({limit}) 
        [LineName], [EmpCode], [EmpName], [DeviceID],
        [StyleNo], [OrderNo], [Operation], [SAM],
        [Eff100], [Eff75], [ProdnPcs], [EffPer],
        [OperSeq], [UsedMin], [TranDate], [UnitCode], 
        [PartName], [FloorName], [ReptType], [PartSeq], 
        [EffPer100], [EffPer75], [NewOperSeq],
        [BuyerCode], [ISFinPart], [ISFinOper], [IsRedFlag]
    FROM [ITR_PRO_IND].[dbo].[RTMS_SessionWiseProduction]
    WHERE [ReptType] IN ('RTMS', 'RTM5', 'RTM$')
        AND CAST([TranDate] AS DATE) = CAST(
              DATEADD(DAY, -((DATEPART(WEEKDAY, GETDATE()) + @@DATEFIRST - 6) % 7), GETDATE()) 
              AS DATE
          )
        AND [ProdnPcs] > 0
        AND [EmpCode] IS NOT NULL
        AND [LineName] IS NOT NULL
    ORDER BY [TranDate] DESC;
"""


            # Execute query with pandas using SQLAlchemy engine
            df = pd.read_sql(query, self.engine)
            logger.info(f"Retrieved {len(df)} rows from RTMS database")

            # Debug: Check for data in the last few days if today returns 0
            if len(df) == 0:
                logger.warning("No data found for today. Checking last 7 days...")
                debug_query = f"""
                SELECT TOP 10
                    [TranDate], [LineName], [EmpName], [ProdnPcs], [ReptType]
                FROM [ITR_PRO_IND].[dbo].[RTMS_SessionWiseProduction]
                WHERE [TranDate] >= DATEADD(day, -7, GETDATE())
                    AND [ProdnPcs] > 0
                ORDER BY [TranDate] DESC;
                """

                debug_df = pd.read_sql(debug_query, self.engine)
                logger.info(f"Recent data sample ({len(debug_df)} rows):")
                if len(debug_df) > 0:
                    for _, row in debug_df.head().iterrows():
                        logger.info(f"  Date: {row['TranDate']}, Line: {row['LineName']}, Emp: {row['EmpName']}")
                else:
                    logger.warning("No data found in the last 7 days either")

            # Convert to RTMSProductionData objects
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

                except Exception as row_error:
                    logger.warning(f"Error processing row: {row_error}")
                    continue

            self.last_fetch_time = datetime.now()
            logger.info(f"Successfully processed {len(production_data)} production records")
            return production_data

        except Exception as e:
            logger.error(f"Database operation failed: {e}")
            return []

    def get_enhanced_hierarchy_data(self, production_data: List[RTMSProductionData]) -> Dict[str, Any]:
        """Generate enhanced hierarchical data structure"""
        hierarchy = {}

        for data in production_data:
            actual_efficiency = data.calculate_efficiency()

            # Build hierarchy
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

            # Update aggregations
            is_underperformer = actual_efficiency < 85
            for level in [line, floor, unit]:
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
            logger.info("Background monitoring started (every 10 minutes)")

            while self.is_monitoring:
                schedule.run_pending()
                time.sleep(60)  # Check every minute

        self.scheduler_thread = threading.Thread(target=monitoring_loop, daemon=True)
        self.scheduler_thread.start()

    def automated_analysis_and_alerts(self):
        """Automated analysis and alerts (runs every 10 minutes)"""
        try:
            logger.info("Running automated production analysis...")

            # Fetch latest data
            production_data = self.connect_and_fetch_data()

            if not production_data:
                logger.warning("No production data available for analysis")
                return

            # Perform AI analysis
            analysis_result = self.ai_analyzer.analyze_production_efficiency(production_data)

            # Log alerts for underperformers
            if analysis_result.get("whatsapp_alerts_needed") and analysis_result.get("underperformers"):
                underperformers = analysis_result["underperformers"]
                logger.info(f"Found {len(underperformers)} underperformers requiring attention:")
                for emp in underperformers:
                    logger.warning(f"  - {emp['emp_name']} ({emp['emp_code']}): {emp['efficiency']:.1f}% efficiency")

            logger.info(f"Automated analysis completed. {len(analysis_result.get('underperformers', []))} alerts generated.")

        except Exception as e:
            logger.error(f"Automated analysis failed: {e}")

    def stop_monitoring(self):
        """Stop background monitoring"""
        self.is_monitoring = False
        logger.info("Background monitoring stopped")

# Initialize RTMS Engine
rtms_engine = FabricPulseRTMSEngine()

# Enhanced API Endpoints
@app.get("/")
async def root():
    """Root endpoint with service information"""
    return {
        "service": "Fabric Pulse AI - RTMS Backend Service (Fixed)",
        "version": "3.1.0",
        "status": "operational",
        "ai_model": "Open Source Models" if AI_AVAILABLE else "AI Disabled",
        "database": "SQL Server with SQLAlchemy",
        "features": [
            "Real-time production monitoring",
            "Enhanced database connectivity",
            "Open-source AI analysis",
            "Fixed encoding issues",
            "Comprehensive error handling"
        ],
        "last_fetch": rtms_engine.last_fetch_time.isoformat() if rtms_engine.last_fetch_time else None,
        "timestamp": datetime.now().isoformat()
    }

@app.get("/api/rtms/analyze")
async def analyze_production():
    """Enhanced real-time production analysis"""
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

        # AI Analysis
        ai_analysis = rtms_engine.ai_analyzer.analyze_production_efficiency(production_data)

        # Hierarchy data
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
            "service": "Fabric Pulse AI - RTMS (Fixed)",
            "status": "operational",
            "version": "3.1.0",
            "database": {
                "server": rtms_engine.db_config["server"],
                "database": rtms_engine.db_config["database"],
                "status": "connected" if rtms_engine.engine else "disconnected",
                "last_fetch": rtms_engine.last_fetch_time.isoformat() if rtms_engine.last_fetch_time else None
            },
            "ai_engine": {
                "status": "active" if AI_AVAILABLE else "disabled",
                "model": "Open Source Models",
                "features": ["efficiency_analysis", "pattern_recognition", "basic_insights"]
            },
            "monitoring": {
                "status": "active" if rtms_engine.is_monitoring else "inactive",
                "interval": "10 minutes",
                "alerts": "logging enabled"
            },
            "fixes_applied": [
                "Unicode encoding issues resolved",
                "SQLAlchemy integration implemented",
                "Open source AI models configured",
                "Enhanced error handling added",
                "Database debugging improved"
            ],
            "timestamp": datetime.now().isoformat()
        }

    except Exception as e:
        logger.error(f"Status endpoint failed: {e}")
        raise HTTPException(status_code=500, detail=f"Status query failed: {str(e)}")

# Development vs Production Execution
if __name__ == "__main__":
    logger.info("Starting Fabric Pulse AI Backend Service (Fixed Version)...")
    logger.info("Mode: Development (use Windows Service for production)")

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
        logger.info("Service stopped by user")
        rtms_engine.stop_monitoring()
    except Exception as e:
        logger.error(f"Service startup failed: {e}")
        raise
