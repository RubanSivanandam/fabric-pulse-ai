"""
Fabric Pulse AI - Production Ready Backend
Complete RTMS integration with Ollama AI, WhatsApp alerts, and dependent filters
"""
import asyncio
import json
import logging
import pandas as pd
import subprocess
import re
from datetime import date, datetime, timedelta
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, asdict
from collections import defaultdict
import time
import threading
from fastapi import FastAPI, HTTPException, BackgroundTasks, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel
import uvicorn

# Local imports
from config import config
from whatsapp_service import whatsapp_service, AlertMessage
import sqlalchemy as sa
from sqlalchemy import create_engine, text
import urllib.parse

# Setup logging
logging.basicConfig(
    level=getattr(logging, config.service.log_level),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# FastAPI app
app = FastAPI(
    title="AI Powered - RTMS System",
    description="Real-time production monitoring with Ollama AI insights and WhatsApp alerts",
    version="4.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080", "http://127.0.0.1:8080"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# Pydantic models for AI endpoints
class AISummarizeRequest(BaseModel):
    # Keep old text field optional (for free-text summarization)
    text: Optional[str] = None  
    length: str = "short"

    # ✅ Add fields for efficiency filters
    unit_code: Optional[str] = None
    floor_name: Optional[str] = None
    line_name: Optional[str] = None
    operation: Optional[str] = None
    limit: int = 1000

class AISuggestOperationsRequest(BaseModel):
    context: str
    query: str

class AICompletionRequest(BaseModel):
    prompt: str
    maxTokens: Optional[int] = 200
    stream: Optional[bool] = False

# Rate limiting
request_counts = defaultdict(list)
RATE_LIMIT = 30  # requests per minute

def check_rate_limit(ip: str) -> bool:
    now = time.time()
    minute_ago = now - 60
    request_counts[ip] = [req_time for req_time in request_counts[ip] if req_time > minute_ago]
    
    if len(request_counts[ip]) >= RATE_LIMIT:
        return False
    
    request_counts[ip].append(now)
    return True

@dataclass
class RTMSProductionData:
    """Enhanced production data structure"""
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

    def calculate_efficiency(self) -> float:
        """Calculate actual efficiency"""
        return (self.ProdnPcs / self.Eff100 * 100) if self.Eff100 > 0 else 0.0

def should_send_whatsapp(emp_data: dict, line_performers: List[dict]) -> bool:
    """
    Determine if WhatsApp alert should be sent for underperforming employee
    Logic: Top performer in line/operation = 100%, alert if < 85% of top performer
    """
    if not line_performers:
        return False
    
    # Find top performer in same line and operation
    same_operation = [p for p in line_performers 
                     if p.get("line_name") == emp_data.get("line_name") 
                     and p.get("new_oper_seq") == emp_data.get("new_oper_seq")]
    
    if not same_operation:
        return False
    
    top_performer_eff = max(p.get("efficiency", 0) for p in same_operation)
    threshold_eff = top_performer_eff * 0.85  # 85% of top performer
    
    return emp_data.get("efficiency", 0) < threshold_eff

class OllamaAIService:
    """Ollama AI Service for local llama-3.2:3b integration"""
    
    def __init__(self, model: str = "llama3.2:3b"):
        self.model = model
        self.available = self._check_ollama_availability()
    
    def _check_ollama_availability(self) -> bool:
        """Check if Ollama is available and model is installed"""
        try:
            result = subprocess.run(['ollama', 'list'], capture_output=True, text=True, timeout=10)
            return self.model in result.stdout
        except Exception as e:
            logger.warning(f"Ollama not available: {e}")
            return False
    
    async def summarize_text(self, text: str, length: str = "medium") -> str:
        """Summarize text using Ollama"""
        if not self.available:
            return "AI service unavailable. Summary would provide key insights about production efficiency."
        
        # Limit input text length
        text = text[:10000]
        
        length_prompts = {
            "short": "Provide a brief 1-2 sentence summary",
            "medium": "Provide a concise paragraph summary", 
            "long": "Provide a detailed summary with key points"
        }
        
        length_instruction = length_prompts.get(length, length_prompts["medium"])
        
        prompt = f"{length_instruction} of the following production data:\\n\\n{text}\\n\\nSummary:"
        
        try:
            result = subprocess.run([
                'ollama', 'run', self.model, prompt
            ], capture_output=True, text=True, timeout=30)
            
            if result.returncode == 0 and result.stdout.strip():
                return result.stdout.strip()
            else:
                return "Unable to generate summary at this time."
        
        except Exception as e:
            logger.error(f"Ollama summarization failed: {e}")
            return "AI summarization service temporarily unavailable."
    
    async def suggest_operations(self, context: str, query: str) -> List[Dict[str, Any]]:
        """Suggest operations based on context and query"""
        if not self.available:
            return [{"id": "fallback-1", "label": "General Operation", "confidence": 0.5}]
        
        context = context[:8000]  # Limit context length
        
        prompt = f"""
Based on the following garment manufacturing context and user query, suggest relevant operations.
Respond with a JSON array of operations, each with id, label, and confidence (0.0-1.0).

Context: {context}
Query: {query}

Example operations: Cutting, Sewing, Hemming, Buttonhole, Collar attachment, Sleeve attachment, Quality checking, Pressing, Folding, Packaging

Respond only with valid JSON array:
"""
        
        try:
            result = subprocess.run([
                'ollama', 'run', self.model, prompt
            ], capture_output=True, text=True, timeout=30)
            
            if result.returncode == 0 and result.stdout.strip():
                response = result.stdout.strip()
                
                # Extract JSON from response
                json_match = re.search(r'\\[.*\\]', response, re.DOTALL)
                if json_match:
                    suggestions_data = json.loads(json_match.group())
                    
                    suggestions = []
                    for item in suggestions_data:
                        if isinstance(item, dict) and all(key in item for key in ['id', 'label', 'confidence']):
                            suggestions.append({
                                "id": str(item['id']),
                                "label": str(item['label']),
                                "confidence": float(item['confidence'])
                            })
                    
                    return suggestions[:10]  # Limit to top 10
            
            # Fallback suggestions
            return [
                {"id": "sewing-1", "label": "Sewing Operation", "confidence": 0.8},
                {"id": "cutting-1", "label": "Cutting Operation", "confidence": 0.7},
                {"id": "quality-1", "label": "Quality Check", "confidence": 0.6}
            ]
        
        except Exception as e:
            logger.error(f"Operation suggestion failed: {e}")
            return [{"id": "fallback-1", "label": "General Operation", "confidence": 0.5}]
    
    async def generate_completion(self, prompt: str, max_tokens: int = 200) -> str:
        """Generate text completion"""
        if not self.available:
            return "AI completion service is not available. Please check your Ollama installation."
        
        # Limit prompt length
        prompt = prompt[:8000]
        
        try:
            result = subprocess.run([
                'ollama', 'run', self.model, prompt
            ], capture_output=True, text=True, timeout=45)
            
            if result.returncode == 0 and result.stdout.strip():
                response = result.stdout.strip()
                # Limit response length
                words = response.split()
                if len(words) > max_tokens:
                    response = ' '.join(words[:max_tokens]) + "..."
                return response
            else:
                return "Unable to generate completion at this time."
        
        except Exception as e:
            logger.error(f"Ollama completion failed: {e}")
            return "AI completion service temporarily unavailable."

class EnhancedRTMSEngine:
    """Enhanced RTMS Engine with production-ready features"""
    
    def __init__(self):
        self.db_config = config.database
        self.engine = self._create_database_engine()
        self.last_fetch_time = None
        self.monitoring_active = False
        self.ai_service = OllamaAIService(config.ai.primary_model)
        
        # WhatsApp notifications disabled flag
        self.whatsapp_disabled = True
        logger.info("🚫 WhatsApp notifications temporarily DISABLED")
        
        # Start background monitoring
        self.start_background_monitoring()

    def _create_database_engine(self):
        """Create SQLAlchemy engine with connection pooling"""
        try:
            password = urllib.parse.quote_plus(self.db_config.password)
            username = urllib.parse.quote_plus(self.db_config.username)
            connection_string = (
                f"mssql+pyodbc://{username}:{password}@{self.db_config.server}/"
                f"{self.db_config.database}?driver=ODBC+Driver+17+for+SQL+Server&TrustServerCertificate=yes"
            )
            
            engine = create_engine(
                connection_string,
                pool_size=10,
                max_overflow=20,
                pool_timeout=30,
                pool_recycle=3600,
                echo=False
            )
            logger.info("✅ Database engine created successfully")
            return engine
        except Exception as e:
            logger.error(f"❌ Failed to create database engine: {e}")
            return None

    async def get_unit_codes(self) -> List[str]:
        """Get list of unique unit codes"""
        try:
            query = """
            SELECT DISTINCT [UnitCode]
            FROM [ITR_PRO_IND].[dbo].[RTMS_SessionWiseProduction]
            WHERE [UnitCode] IS NOT NULL AND [UnitCode] != ''
            ORDER BY [UnitCode]
            """
            with self.engine.connect() as connection:
                df = pd.read_sql(text(query), connection)
                return df['UnitCode'].tolist()
        except Exception as e:
            logger.error(f"❌ Failed to fetch unit codes: {e}")
            return []

    async def get_floor_names(self, unit_code: str) -> List[str]:
        """Get list of floor names for a unit"""
        try:
            query = text("""
                SELECT DISTINCT [FloorName]
                FROM [ITR_PRO_IND].[dbo].[RTMS_SessionWiseProduction]
                WHERE [UnitCode] = :unit_code
                  AND [FloorName] IS NOT NULL 
                  AND [FloorName] != ''
                ORDER BY [FloorName]
            """)

            with self.engine.connect() as connection:
                df = pd.read_sql(query, connection, params={"unit_code": unit_code})
                return df['FloorName'].tolist()
        except Exception as e:
            logger.error(f"❌ Failed to fetch floor names: {e}")
            return []

    async def get_line_names(self, unit_code: str, floor_name: str) -> list[str]:
        """Get list of line names for a unit and floor"""
        try:
            query = text("""
                SELECT DISTINCT [LineName]
                FROM [ITR_PRO_IND].[dbo].[RTMS_SessionWiseProduction]
                WHERE [UnitCode] = :unit_code 
                  AND [FloorName] = :floor_name
                  AND [LineName] IS NOT NULL 
                  AND [LineName] != ''
                ORDER BY [LineName]
            """)

            with self.engine.connect() as connection:
                df = pd.read_sql(
                    query, 
                    connection, 
                    params={"unit_code": unit_code, "floor_name": floor_name}
                )
                return df['LineName'].tolist()

        except Exception as e:
            logger.error(f"❌ Failed to fetch line names: {e}")
            return []

    async def get_operations_by_line(self, unit_code: str, floor_name: str, line_name: str) -> List[str]:
        """Get list of operations for specific line"""
        try:
            query = """
            SELECT DISTINCT [NewOperSeq]
            FROM [ITR_PRO_IND].[dbo].[RTMS_SessionWiseProduction]
            WHERE [UnitCode] = @unit_code AND [FloorName] = @floor_name 
            AND [LineName] = @line_name AND [NewOperSeq] IS NOT NULL AND [NewOperSeq] != ''
            ORDER BY [NewOperSeq]
            """
            with self.engine.connect() as connection:
                df = pd.read_sql(text(query), connection, params={
                    "unit_code": unit_code, 
                    "floor_name": floor_name,
                    "line_name": line_name
                })
                return df['NewOperSeq'].tolist()
        except Exception as e:
            logger.error(f"❌ Failed to fetch operations by line: {e}")
            return []

    async def fetch_production_data(
        self,
        unit_code: Optional[str] = None,
        floor_name: Optional[str] = None,
        line_name: Optional[str] = None,
        operation: Optional[str] = None,
        limit: int = 1000
    ) -> List[RTMSProductionData]:
        """Fetch production data with optional filtering - FIXED DATE QUERY"""
        if not self.engine:
            logger.error("❌ Database engine not available")
            return []

        try:
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
            AND CAST([TranDate] AS DATE) = CAST(GETDATE() AS DATE)
            AND [ProdnPcs] > 0
            AND [EmpCode] IS NOT NULL
            AND [LineName] IS NOT NULL
            """
            
            # Add filters
            params = {}
            if unit_code:
                query += " AND [UnitCode] = @unit_code"
                params["unit_code"] = unit_code
            if floor_name:
                query += " AND [FloorName] = @floor_name"
                params["floor_name"] = floor_name
            if line_name:
                query += " AND [LineName] = @line_name"
                params["line_name"] = line_name
            if operation:
                query += " AND [NewOperSeq] = @operation"
                params["operation"] = operation
            
            query += " ORDER BY [TranDate] DESC"
            
            # Execute query
            with self.engine.connect() as connection:
                df = pd.read_sql(text(query), connection, params=params)
                logger.info(f"📊 Retrieved {len(df)} production records")
            
            # Convert to data objects
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
                    logger.warning(f"⚠️ Error processing row: {row_error}")
                    continue
            
            self.last_fetch_time = datetime.now()
            return production_data
        
        except Exception as e:
            logger.error(f"❌ Database query failed: {e}")
            return []

    async def get_operations_list(self) -> List[str]:
        """Get list of unique operations (NewOperSeq values) - FIXED DATE"""
        try:
            query = """
            SELECT DISTINCT [NewOperSeq]
            FROM [ITR_PRO_IND].[dbo].[RTMS_SessionWiseProduction]
            WHERE [NewOperSeq] IS NOT NULL
            AND [NewOperSeq] != ''
            AND CAST([TranDate] AS DATE) = CAST(GETDATE() AS DATE)
            ORDER BY [NewOperSeq]
            """
            with self.engine.connect() as connection:
                df = pd.read_sql(text(query), connection)
                operations = df['NewOperSeq'].tolist()
                logger.info(f"📋 Retrieved {len(operations)} operations")
                return operations
        except Exception as e:
            logger.error(f"❌ Failed to fetch operations: {e}")
            return []

    def process_efficiency_analysis(self, data: List[RTMSProductionData]) -> Dict[str, Any]:
        """Process efficiency analysis with AI insights"""
        if not data:
            return {"status": "no_data", "message": "No production data available"}

        # Calculate operator efficiencies
        operators = []
        underperformers = []
        operation_efficiencies = {}

        for emp_data in data:
            efficiency = emp_data.calculate_efficiency()
            operator = {
                "emp_name": emp_data.EmpName,
                "emp_code": emp_data.EmpCode,
                "line_name": emp_data.LineName,
                "unit_code": emp_data.UnitCode,
                "floor_name": emp_data.FloorName,
                "operation": emp_data.Operation,
                "new_oper_seq": emp_data.NewOperSeq,
                "device_id": emp_data.DeviceID,
                "efficiency": round(efficiency, 2),
                "production": emp_data.ProdnPcs,
                "target": emp_data.Eff100,
                "status": self._get_efficiency_status(efficiency),
                "is_top_performer": efficiency >= 100
            }
            operators.append(operator)

            # Check if should send WhatsApp alert using business logic
            if should_send_whatsapp(operator, operators):
                underperformers.append(operator)

            # Track operation efficiencies for relative calculations
            if emp_data.NewOperSeq not in operation_efficiencies:
                operation_efficiencies[emp_data.NewOperSeq] = []
            operation_efficiencies[emp_data.NewOperSeq].append(efficiency)

        # Calculate overall metrics
        total_production = sum(d.ProdnPcs for d in data)
        total_target = sum(d.Eff100 for d in data)
        overall_efficiency = (total_production / total_target * 100) if total_target > 0 else 0

        # Generate AI insights
        ai_insights = self._generate_ai_insights(operators, overall_efficiency, underperformers)

        return {
            "status": "success",
            "overall_efficiency": round(overall_efficiency, 2),
            "total_production": total_production,
            "total_target": total_target,
            "operators": operators,
            "underperformers": underperformers,
            "ai_insights": ai_insights,
            "whatsapp_alerts_needed": len(underperformers) > 0 and not self.whatsapp_disabled,
            "whatsapp_disabled": self.whatsapp_disabled,
            "analysis_timestamp": datetime.now().isoformat(),
            "records_analyzed": len(data),
            "data_date": date.today().strftime("%Y-%m-%d") 
        }

    def _get_efficiency_status(self, efficiency: float) -> str:
        """Get efficiency status based on thresholds"""
        if efficiency >= 100:
            return 'excellent'
        elif efficiency >= config.alerts.efficiency_threshold:
            return 'good'
        elif efficiency >= config.alerts.critical_threshold:
            return 'needs_improvement'
        else:
            return 'critical'

    def _generate_ai_insights(self, operators: List[Dict], overall_efficiency: float, underperformers: List[Dict]) -> Dict[str, Any]:
        """Generate AI-powered insights"""
        # Group by lines and operations for analysis
        line_performance = {}
        operation_performance = {}

        for op in operators:
            line = op["line_name"]
            operation = op["new_oper_seq"]

            if line not in line_performance:
                line_performance[line] = []
            line_performance[line].append(op["efficiency"])

            if operation not in operation_performance:
                operation_performance[operation] = []
            operation_performance[operation].append(op["efficiency"])

        # Calculate averages
        line_avg = {line: sum(effs) / len(effs) for line, effs in line_performance.items()}
        operation_avg = {op: sum(effs) / len(effs) for op, effs in operation_performance.items()}

        # Generate insights
        summary = self._generate_summary_insight(overall_efficiency, len(operators), len(underperformers))
        performance_analysis = {
            "best_performing_line": max(line_avg.items(), key=lambda x: x[1]) if line_avg else None,
            "worst_performing_line": min(line_avg.items(), key=lambda x: x[1]) if line_avg else None,
            "best_performing_operation": max(operation_avg.items(), key=lambda x: x[1]) if operation_avg else None,
            "worst_performing_operation": min(operation_avg.items(), key=lambda x: x[1]) if operation_avg else None,
        }

        recommendations = self._generate_recommendations(underperformers, line_avg, operation_avg)

        # Add AI predictions (simple trend analysis)
        predictions = {
            "trend": "stable" if 80 <= overall_efficiency <= 95 else "decreasing" if overall_efficiency < 80 else "increasing",
            "confidence": 0.85,
            "forecast": f"Based on current patterns, efficiency is expected to {'improve' if overall_efficiency >= 85 else 'require intervention'} in the next monitoring cycle."
        }

        return {
            "summary": summary,
            "performance_analysis": performance_analysis,
            "recommendations": recommendations,
            "predictions": predictions
        }

    def _generate_summary_insight(self, overall_eff: float, total_emp: int, underperformers_count: int) -> str:
        """Generate summary insight"""
        if overall_eff >= 95:
            return f"🎯 Excellent production performance! {total_emp} employees averaging {overall_eff:.1f}% efficiency."
        elif overall_eff >= 85:
            return f"📈 Good production performance with {overall_eff:.1f}% efficiency. {underperformers_count} employees need attention."
        elif overall_eff >= 70:
            return f"⚠️ Below target performance at {overall_eff:.1f}%. {underperformers_count} employees require immediate intervention."
        else:
            return f"🚨 Critical performance issues! Only {overall_eff:.1f}% efficiency with {underperformers_count} underperformers."

    def _generate_recommendations(self, underperformers: List[Dict], line_avg: Dict, operation_avg: Dict) -> List[str]:
        """Generate actionable recommendations"""
        recommendations = []

        if underperformers:
            recommendations.append(f"Focus training on {len(underperformers)} underperforming employees")

        # Critical cases
        critical_cases = [emp for emp in underperformers if emp["efficiency"] < config.alerts.critical_threshold]
        if critical_cases:
            recommendations.append(f"{len(critical_cases)} employees need immediate supervision")

        # Line-specific recommendations
        if line_avg:
            worst_line = min(line_avg.items(), key=lambda x: x[1])
            if worst_line[1] < config.alerts.efficiency_threshold:
                recommendations.append(f"Line {worst_line[0]} requires immediate attention ({worst_line[1]:.1f}% efficiency)")

        # Operation-specific recommendations
        if operation_avg:
            worst_operation = min(operation_avg.items(), key=lambda x: x[1])
            if worst_operation[1] < config.alerts.efficiency_threshold:
                recommendations.append(f"Operation {worst_operation[0]} needs process optimization")

        return recommendations

    def start_background_monitoring(self):
        """Start background monitoring thread"""
        def monitor():
            while True:
                try:
                    time.sleep(600)  # 10 minutes
                    logger.info("🔄 Background monitoring cycle")
                    # Add periodic tasks here if needed
                except Exception as e:
                    logger.error(f"❌ Background monitoring error: {e}")

        thread = threading.Thread(target=monitor, daemon=True)
        thread.start()
        logger.info("✅ Background monitoring started")

# Initialize RTMS Engine
rtms_engine = EnhancedRTMSEngine()

# AI Endpoints
@app.post("/api/ai/summarize")
async def ai_summarize(request: AISummarizeRequest, background_tasks: BackgroundTasks):
    """Summarize efficiency analysis using Ollama AI with garment-specific insights"""
    try:
        if request.text:  
            # ✅ Case 1: Summarize free text
            if len(request.text) > 10000:
                raise HTTPException(status_code=400, detail="Text too long (max 10,000 characters)")
            
            summary = await rtms_engine.ai_service.summarize_text(
                request.text,
                request.length
            )

        else:
            # ✅ Case 2: Summarize efficiency analysis (with optional filters)
            data = await rtms_engine.fetch_production_data(
                unit_code=request.unit_code if request.unit_code else None,
                floor_name=request.floor_name if request.floor_name else None,
                line_name=request.line_name if request.line_name else None,
                operation=request.operation if request.operation else None,
                limit=request.limit
            )

            logger.info(f"Fetched {len(data)} records for summarization")

            if not data:
                return {
                    "status": "success",
                    "summary": "No production data available for the given filters (or today’s date).",
                    "filters_applied": {
                        "unit_code": request.unit_code,
                        "floor_name": request.floor_name,
                        "line_name": request.line_name,
                        "operation": request.operation
                    }
                }

            # ✅ Limit BEFORE analysis
            max_records = 1500
            data = data[:max_records]

            # 🔹 Custom garment aggregation
            from collections import defaultdict
            grouped = defaultdict(lambda: {"Eff100": 0, "ProdnPcs": 0})

            for row in data:
                if str(row.ISFinPart).upper() == "Y":
                    key = (row.LineName, row.StyleNo)  # Use attribute access
                    grouped[key]["Eff100"] += row.Eff100 or 0
                    grouped[key]["ProdnPcs"] += row.ProdnPcs or 0

            # 🔹 Convert grouped data to text
            lines = []
            for (line_name, style_no), agg in grouped.items():
                target = agg["Eff100"]
                actual = agg["ProdnPcs"]
                lines.append(
                    f"Line {line_name}, Style {style_no}: "
                    f"Target {target} pcs, Actual {actual} pcs"
                )

            analysis_text = "Garment production summary (final parts only):\n" + "\n".join(lines)

            # ✅ Truncate if still too long
            if len(analysis_text) > 10000:
                logger.warning(f"Analysis text too large ({len(analysis_text)} chars). Truncating...")
                analysis_text = analysis_text[:8000] + "\n...[TRUNCATED]..."

            # 🔹 Pass context to AI
            prompt = (
                "You are analyzing garment factory production efficiency.\n"
                "The data below represents Garment pieces produced in final parts, identified by ISFinPart = 'Y'.\n"
                "Each record shows the total target (Eff100) and actual production (ProdnPcs) for the final part of a LineName,\n"
                "along with the corresponding PartName and calculated efficiency (Actual / Target * 100).\n"
                "A unit consists of different lines, each with various parts. The final part's production determines the line's efficiency.\n"
                "For example, if a line has multiple operations on a part (e.g., stitching, finishing), the final operator's output (marked by ISFinPart = 'Y')\n"
                "is used to calculate efficiency.\n"
                "Please highlight efficiency gaps, underperforming lines, and provide polite, constructive insights to boost the team's morale\n"
                "and support production managers in improving performance.\n\n"
                f"{analysis_text}"
            )

            summary = await rtms_engine.ai_service.summarize_text(prompt, request.length)

        return {
            "status": "success",
            "summary": summary,
            "filters_applied": {
                "unit_code": request.unit_code,
                "floor_name": request.floor_name,
                "line_name": request.line_name,
                "operation": request.operation
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"AI summarization failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"AI summarization failed: {str(e)}"
        )



@app.post("/api/ai/suggest_ops")
async def ai_suggest_operations(request: AISuggestOperationsRequest):
    """Suggest operations using AI"""
    try:
        if len(request.context) > 8000:
            raise HTTPException(status_code=400, detail="Context too long (max 8,000 characters)")
        
        suggestions = await rtms_engine.ai_service.suggest_operations(request.context, request.query)
        return {"suggestions": suggestions}
    
    except Exception as e:
        logger.error(f"AI operation suggestion failed: {e}")
        raise HTTPException(status_code=500, detail="AI operation suggestion failed")

@app.post("/api/ai/completion")
async def ai_completion(request: AICompletionRequest):
    """Generate AI completion"""
    try:
        if len(request.prompt) > 8000:
            raise HTTPException(status_code=400, detail="Prompt too long (max 8,000 characters)")
        
        completion = await rtms_engine.ai_service.generate_completion(request.prompt, request.maxTokens or 200)
        return {"text": completion}
    
    except Exception as e:
        logger.error(f"AI completion failed: {e}")
        raise HTTPException(status_code=500, detail="AI completion failed")

# Main API Endpoints
@app.get("/api/status")
async def get_service_status():
    """Get service status"""
    return {
        "service": "Fabric Pulse AI",
        "version": "4.0.0",
        "status": "running",
        "ai_enabled": rtms_engine.ai_service.available,
        "whatsapp_enabled": not rtms_engine.whatsapp_disabled,
        "whatsapp_disabled": rtms_engine.whatsapp_disabled,
        "database_connected": rtms_engine.engine is not None,
        "bot_name": "Fabric Pulse AI Bot",
        "data_date": date.today().strftime("%Y-%m-%d") ,  # Fixed to today's date
        "features": ["AI Insights", "WhatsApp Alerts", "Real-time Monitoring", "Dependent Filters"],
        "last_fetch": rtms_engine.last_fetch_time.isoformat() if rtms_engine.last_fetch_time else None,
        "timestamp": datetime.now().isoformat()
    }

@app.get("/api/rtms/filters/units")
async def get_unit_codes():
    """Get list of unit codes"""
    try:
        units = await rtms_engine.get_unit_codes()
        return {
            "status": "success",
            "data": units,
            "count": len(units),
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Failed to fetch unit codes: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch unit codes")

@app.get("/api/rtms/filters/floors")
async def get_floor_names(unit_code: str = Query(...)):
    """Get list of floor names for a unit"""
    try:
        floors = await rtms_engine.get_floor_names(unit_code)
        return {
            "status": "success",
            "data": floors,
            "count": len(floors),
            "unit_code": unit_code,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Failed to fetch floor names: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch floor names")

@app.get("/api/rtms/filters/lines")
async def get_line_names(unit_code: str = Query(...), floor_name: str = Query(...)):
    """Get list of line names for a unit and floor"""
    try:
        lines = await rtms_engine.get_line_names(unit_code, floor_name)
        return {
            "status": "success",
            "data": lines,
            "count": len(lines),
            "unit_code": unit_code,
            "floor_name": floor_name,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Failed to fetch line names: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch line names")

@app.get("/api/rtms/filters/operations")
async def get_operations(unit_code: str = Query(None), floor_name: str = Query(None), line_name: str = Query(None)):
    """Get list of operations, optionally filtered by line"""
    try:
        if unit_code and floor_name and line_name:
            operations = await rtms_engine.get_operations_by_line(unit_code, floor_name, line_name)
        else:
            operations = await rtms_engine.get_operations_list()
        
        return {
            "status": "success",
            "data": operations,
            "count": len(operations),
           "data_date": date.today().strftime("%Y-%m-%d") ,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Failed to fetch operations: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch operations")

# FIXED: Added missing analyze endpoint that frontend expects
@app.get("/api/rtms/analyze")
async def analyze_production_data(
    unit_code: Optional[str] = Query(None),
    floor_name: Optional[str] = Query(None),
    line_name: Optional[str] = Query(None),
    operation: Optional[str] = Query(None),
    limit: int = Query(1000, ge=1, le=5000)
):
    """Analyze production data - frontend expects this endpoint"""
    try:
        # Fetch production data
        data = await rtms_engine.fetch_production_data(
            unit_code=unit_code,
            floor_name=floor_name,
            line_name=line_name,
            operation=operation,
            limit=limit
        )
        
        # Process analysis
        analysis = rtms_engine.process_efficiency_analysis(data)
        
        return {
            "status": "success",
            "data": analysis,
            "filters_applied": {
                "unit_code": unit_code,
                "floor_name": floor_name,
                "line_name": line_name,
                "operation": operation
            }
        }
    except Exception as e:
        logger.error(f"Failed to analyze production data: {e}")
        raise HTTPException(status_code=500, detail="Failed to analyze production data")

@app.get("/api/rtms/efficiency")
async def get_operator_efficiencies(
    unit_code: Optional[str] = Query(None),
    floor_name: Optional[str] = Query(None),
    line_name: Optional[str] = Query(None),
    operation: Optional[str] = Query(None),
    limit: int = Query(1000, ge=1, le=5000)
):
    """Get operator efficiency analysis with AI insights"""
    try:
        # Fetch production data
        data = await rtms_engine.fetch_production_data(
            unit_code=unit_code,
            floor_name=floor_name,
            line_name=line_name,
            operation=operation,
            limit=limit
        )
        
        # Process analysis
        analysis = rtms_engine.process_efficiency_analysis(data)
        
        return {
            "status": "success",
            "data": analysis,
            "filters_applied": {
                "unit_code": unit_code,
                "floor_name": floor_name,
                "line_name": line_name,
                "operation": operation
            }
        }
    except Exception as e:
        logger.error(f"Failed to get operator efficiencies: {e}")
        raise HTTPException(status_code=500, detail="Failed to get operator efficiencies")

# Health check
@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

if __name__ == "__main__":
    logger.info("🚀 Starting Fabric Pulse AI Backend...")
    uvicorn.run(
        "fabric_pulse_ai_main:app",
        host="0.0.0.0",
        port=8000,
        reload=False,
        log_level="info"
    )