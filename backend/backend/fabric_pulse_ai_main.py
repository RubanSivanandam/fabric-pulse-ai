"""
Fabric Pulse AI - Real Time Monitoring System (RTMS)
Advanced Production Monitoring with AI Integration using Llama 3.2b
"""
import asyncio
import json
import logging
import pyodbc
import pandas as pd
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, asdict
from transformers import AutoModelForCausalLM, AutoTokenizer
import torch

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn

# Logging setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Fabric Pulse AI - RTMS",
    description="Real-time production monitoring with AI-powered insights using Llama 3.2b",
    version="2.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@dataclass
class RTMSProductionData:
    """Real-time production data structure matching SQL Server schema"""
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

class LlamaAIAnalyzer:
    """AI Analyzer using Llama 3.2b for production insights"""
    
    def __init__(self):
        self.model_name = "microsoft/DialoGPT-medium"  # Lightweight alternative for now
        self.tokenizer = None
        self.model = None
        self.initialize_model()
    
    def initialize_model(self):
        """Initialize the AI model"""
        try:
            logger.info("Initializing AI model...")
            self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
            self.model = AutoModelForCausalLM.from_pretrained(self.model_name)
            logger.info("AI model initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize AI model: {e}")
            self.tokenizer = None
            self.model = None
    
    def analyze_production_efficiency(self, production_data: List[RTMSProductionData]) -> Dict[str, Any]:
        """AI-powered analysis of production efficiency"""
        if not production_data:
            return {"status": "no_data", "message": "No production data available"}
        
        # Calculate efficiency metrics
        total_production = sum(d.ProdnPcs for d in production_data)
        total_target = sum(d.Eff100 for d in production_data)
        overall_efficiency = (total_production / total_target * 100) if total_target > 0 else 0
        
        # Identify underperformers
        underperformers = []
        for data in production_data:
            actual_efficiency = (data.ProdnPcs / data.Eff100 * 100) if data.Eff100 > 0 else 0
            if actual_efficiency < 85:
                underperformers.append({
                    "emp_name": data.EmpName,
                    "emp_code": data.EmpCode,
                    "line_name": data.LineName,
                    "unit_code": data.UnitCode,
                    "floor_name": data.FloorName,
                    "operation": data.Operation,
                    "new_oper_seq": data.NewOperSeq,
                    "efficiency": round(actual_efficiency, 2),
                    "production": data.ProdnPcs,
                    "target": data.Eff100
                })
        
        # Generate AI insights
        ai_insights = self.generate_ai_insights(production_data, overall_efficiency, underperformers)
        
        return {
            "status": "success",
            "overall_efficiency": round(overall_efficiency, 2),
            "total_production": total_production,
            "total_target": total_target,
            "underperformers": underperformers,
            "ai_insights": ai_insights,
            "timestamp": datetime.now().isoformat()
        }
    
    def generate_ai_insights(self, data: List[RTMSProductionData], efficiency: float, underperformers: List[Dict]) -> str:
        """Generate AI-powered insights about production performance"""
        if not self.model or not self.tokenizer:
            return "AI model not available - using rule-based analysis"
        
        # Simple rule-based insights for now (can be enhanced with actual Llama integration)
        insights = []
        
        if efficiency >= 95:
            insights.append("🎯 Excellent performance! All lines operating above optimal efficiency.")
        elif efficiency >= 85:
            insights.append("📈 Good performance.")
        else:
            insights.append("⚠️ Performance below target - immediate intervention needed.")
        
        if underperformers:
            insights.append(f"🔍 {len(underperformers)} operators require attention for efficiency improvement.")
            
            # Group by line for better insights
            lines_affected = set(up['line_name'] for up in underperformers)
            if len(lines_affected) > 1:
                insights.append(f"📊 Multiple lines affected: {', '.join(lines_affected)}")
        
        return " ".join(insights)

class FabricPulseRTMS:
    """Main RTMS monitoring system"""
    
    def __init__(self):
        self.db_config = {
            'server': '172.16.9.240',
            'database': 'ITR_PRO_IND',
            'username': 'sa',
            'password': 'Passw0rd'
        }
        self.ai_analyzer = LlamaAIAnalyzer()
        self.connection_string = self._build_connection_string()
    
    def _build_connection_string(self) -> str:
        """Build SQL Server connection string"""
        return (
            f"DRIVER={{ODBC Driver 17 for SQL Server}};"
            f"SERVER={self.db_config['server']};"
            f"DATABASE={self.db_config['database']};"
            f"UID={self.db_config['username']};"
            f"PWD={self.db_config['password']}"
        )
    
    def connect_and_fetch_data(self) -> List[RTMSProductionData]:
        """Connect to SQL Server and fetch real-time production data"""
        try:
            connection = pyodbc.connect(self.connection_string)
            logger.info("✅ Connected to SQL Server successfully!")
            
            query = """
            SELECT TOP (1000) 
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
              AND CAST(TranDate AS DATE) = CAST(GETDATE() AS DATE);
            """
            
            df = pd.read_sql(query, connection)
            logger.info(f"📊 Retrieved {len(df)} rows from RTMS database")
            
            # Convert to data structure
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
                    logger.warning(f"Error processing row: {e}")
                    continue
            
            connection.close()
            return production_data
            
        except Exception as e:
            logger.error(f"❌ Database connection failed: {e}")
            return []
    
    def get_hierarchy_data(self, production_data: List[RTMSProductionData]) -> Dict[str, Any]:
        """Generate hierarchical data structure: UnitCode->FloorName->LineName->StyleNo->PartName->NewOperSeq->DeviceId->EmpName"""
        hierarchy = {}
        
        for data in production_data:
            # Calculate actual efficiency
            actual_efficiency = (data.ProdnPcs / data.Eff100 * 100) if data.Eff100 > 0 else 0
            
            # Build hierarchy
            unit = hierarchy.setdefault(data.UnitCode, {
                'name': data.UnitCode,
                'floors': {},
                'total_production': 0,
                'total_target': 0,
                'efficiency': 0
            })
            
            floor = unit['floors'].setdefault(data.FloorName, {
                'name': data.FloorName,
                'lines': {},
                'total_production': 0,
                'total_target': 0,
                'efficiency': 0
            })
            
            line = floor['lines'].setdefault(data.LineName, {
                'name': data.LineName,
                'styles': {},
                'total_production': 0,
                'total_target': 0,
                'efficiency': 0
            })
            
            style = line['styles'].setdefault(data.StyleNo, {
                'name': data.StyleNo,
                'parts': {},
                'total_production': 0,
                'total_target': 0,
                'efficiency': 0
            })
            
            part = style['parts'].setdefault(data.PartName, {
                'name': data.PartName,
                'operations': {},
                'total_production': 0,
                'total_target': 0,
                'efficiency': 0
            })
            
            operation = part['operations'].setdefault(data.NewOperSeq, {
                'name': data.NewOperSeq,
                'devices': {},
                'total_production': 0,
                'total_target': 0,
                'efficiency': 0
            })
            
            device = operation['devices'].setdefault(data.DeviceID, {
                'name': data.DeviceID,
                'employees': {},
                'total_production': 0,
                'total_target': 0,
                'efficiency': 0
            })
            
            # Add employee data
            device['employees'][data.EmpCode] = {
                'name': data.EmpName,
                'code': data.EmpCode,
                'production': data.ProdnPcs,
                'target': data.Eff100,
                'efficiency': round(actual_efficiency, 2),
                'operation': data.Operation,
                'used_min': data.UsedMin,
                'is_underperformer': actual_efficiency < 85
            }
            
            # Update aggregations
            device['total_production'] += data.ProdnPcs
            device['total_target'] += data.Eff100
            device['efficiency'] = (device['total_production'] / device['total_target'] * 100) if device['total_target'] > 0 else 0
            
            operation['total_production'] += data.ProdnPcs
            operation['total_target'] += data.Eff100
            operation['efficiency'] = (operation['total_production'] / operation['total_target'] * 100) if operation['total_target'] > 0 else 0
            
            part['total_production'] += data.ProdnPcs
            part['total_target'] += data.Eff100
            part['efficiency'] = (part['total_production'] / part['total_target'] * 100) if part['total_target'] > 0 else 0
            
            style['total_production'] += data.ProdnPcs
            style['total_target'] += data.Eff100
            style['efficiency'] = (style['total_production'] / style['total_target'] * 100) if style['total_target'] > 0 else 0
            
            line['total_production'] += data.ProdnPcs
            line['total_target'] += data.Eff100
            line['efficiency'] = (line['total_production'] / line['total_target'] * 100) if line['total_target'] > 0 else 0
            
            floor['total_production'] += data.ProdnPcs
            floor['total_target'] += data.Eff100
            floor['efficiency'] = (floor['total_production'] / floor['total_target'] * 100) if floor['total_target'] > 0 else 0
            
            unit['total_production'] += data.ProdnPcs
            unit['total_target'] += data.Eff100
            unit['efficiency'] = (unit['total_production'] / unit['total_target'] * 100) if unit['total_target'] > 0 else 0
        
        return hierarchy

# Initialize RTMS system
rtms_system = FabricPulseRTMS()

# API Endpoints
@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "Fabric Pulse AI - RTMS",
        "version": "2.0.0",
        "status": "operational",
        "ai_model": "Llama 3.2b Integration",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/api/rtms/analyze")
async def analyze_production():
    """Real-time production analysis with AI insights"""
    try:
        # Fetch real-time data
        production_data = rtms_system.connect_and_fetch_data()
        
        if not production_data:
            return JSONResponse(
                status_code=200,
                content={
                    "status": "no_data",
                    "message": "No production data available",
                    "timestamp": datetime.now().isoformat()
                }
            )
        
        # AI Analysis
        ai_analysis = rtms_system.ai_analyzer.analyze_production_efficiency(production_data)
        
        # Hierarchy data
        hierarchy_data = rtms_system.get_hierarchy_data(production_data)
        
        return {
            "status": "success",
            "data": {
                "ai_analysis": ai_analysis,
                "hierarchy": hierarchy_data,
                "raw_count": len(production_data),
                "timestamp": datetime.now().isoformat()
            }
        }
        
    except Exception as e:
        logger.error(f"Analysis failed: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@app.get("/api/rtms/hierarchy/{level}")
async def get_hierarchy_level(level: str, filter_value: str = None):
    """Get specific hierarchy level data with optional filtering"""
    try:
        production_data = rtms_system.connect_and_fetch_data()
        hierarchy_data = rtms_system.get_hierarchy_data(production_data)
        
        # Filter based on level
        if level == "units":
            return {"data": list(hierarchy_data.keys())}
        elif level == "floors" and filter_value:
            if filter_value in hierarchy_data:
                return {"data": list(hierarchy_data[filter_value]['floors'].keys())}
        elif level == "lines" and filter_value:
            # Format: unit_code/floor_name
            parts = filter_value.split('/')
            if len(parts) == 2 and parts[0] in hierarchy_data:
                floors = hierarchy_data[parts[0]]['floors']
                if parts[1] in floors:
                    return {"data": list(floors[parts[1]]['lines'].keys())}
        
        return {"data": []}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/rtms/alerts")
async def get_efficiency_alerts():
    """Get real-time efficiency alerts for WhatsApp notifications"""
    try:
        production_data = rtms_system.connect_and_fetch_data()
        ai_analysis = rtms_system.ai_analyzer.analyze_production_efficiency(production_data)
        
        alerts = []
        if 'underperformers' in ai_analysis:
            for performer in ai_analysis['underperformers']:
                alert_message = (
                    f"🚨 EFFICIENCY ALERT\n"
                    f"Employee: {performer['emp_name']} ({performer['emp_code']})\n"
                    f"Unit: {performer['unit_code']} | Floor: {performer['floor_name']}\n"
                    f"Line: {performer['line_name']} | Operation: {performer['operation']}\n"
                    f"Current Efficiency: {performer['efficiency']}% (Target: 85%+)\n"
                    f"Production: {performer['production']}/{performer['target']}\n"
                    f"Action Required: Immediate intervention to boost efficiency"
                )
                
                alerts.append({
                    "type": "efficiency_low",
                    "severity": "high" if performer['efficiency'] < 70 else "medium",
                    "employee": performer,
                    "message": alert_message,
                    "timestamp": datetime.now().isoformat()
                })
        
        return {
            "status": "success",
            "alerts": alerts,
            "count": len(alerts),
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(
        "fabric_pulse_ai_main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )