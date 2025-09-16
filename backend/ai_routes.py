"""
   AI API Routes for Fabric Pulse AI
   Local Ollama integration with rate limiting
   """

import asyncio
import logging
import time
from typing import Dict, Optional, List
from datetime import datetime, timedelta
import os
from collections import defaultdict
import pyodbc
from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
import httpx
from config import config
from ollama_client import ollama_client, SummarizeRequest, OperationSuggestion, AIRequest

logger = logging.getLogger(__name__)

# Configuration
RATE_LIMIT_REQUESTS = 60  # requests per hour per IP
MAX_INPUT_LENGTH = 10000

# In-memory rate limiting
rate_limit_store: Dict[str, Dict] = defaultdict(lambda: {"count": 0, "reset_time": datetime.now()})

# Function to initialize router (to avoid circular import)
def get_router():
    router = APIRouter(prefix="/api/ai", tags=["AI"])
    
    # Database connection
    def get_db_connection():
        """Establish database connection using config"""
        try:
            conn = pyodbc.connect(config.database.get_connection_string())
            return conn
        except Exception as e:
            logger.error(f"Database connection failed: {e}")
            raise HTTPException(status_code=500, detail="Database connection failed")

    # Request/Response Models
    class SummarizeRequestModel(BaseModel):
        text: str = Field(..., max_length=MAX_INPUT_LENGTH, description="Text to summarize")
        length: str = Field("medium", pattern="^(short|medium|long)$", description="Summary length")

    class SummarizeResponse(BaseModel):
        summary: str
        original_length: int
        processing_time: float

    class OperationSuggestionModel(BaseModel):
        id: str
        label: str
        confidence: float

    class SuggestOperationsRequest(BaseModel):
        context: str = Field(..., max_length=MAX_INPUT_LENGTH)
        query: str = Field(..., max_length=500)

    class SuggestOperationsResponse(BaseModel):
        suggestions: list[OperationSuggestionModel]
        processing_time: float

    class CompletionRequest(BaseModel):
        prompt: str = Field(..., max_length=MAX_INPUT_LENGTH)
        max_tokens: int = Field(500, ge=1, le=2000)
        temperature: float = Field(0.7, ge=0.0, le=2.0)
        stream: bool = Field(False)

    class ProductionOverview(BaseModel):
        total_operators: int
        avg_efficiency: float
        total_production: int
        lines_on_target: int
        alerts_generated: int

    class OperatorData(BaseModel):
        employee_code: str
        employee_name: str
        efficiency: float
        production: int
        target_production: int
        unit_code: str
        line_name: str
        operation: str
        new_oper_seq: str
        floor_name: str

    class LineData(BaseModel):
        line_name: str
        unit_code: str
        total_production: int
        target_production: int
        avg_efficiency: float
        operator_count: int

    # Rate limiting dependency
    async def rate_limit_check(request: Request) -> bool:
        client_ip = request.client.host
        now = datetime.now()
        
        client_data = rate_limit_store[client_ip]
        
        # Reset counter if hour has passed
        if now >= client_data["reset_time"]:
            client_data["count"] = 0
            client_data["reset_time"] = now + timedelta(hours=1)
        
        # Check rate limit
        if client_data["count"] >= RATE_LIMIT_REQUESTS:
            raise HTTPException(
                status_code=429,
                detail=f"Rate limit exceeded. Max {RATE_LIMIT_REQUESTS} requests per hour."
            )
        
        client_data["count"] += 1
        return True

    @router.get("/health")
    async def health_check(rate_limited: bool = Depends(rate_limit_check)):
        """Check AI service health"""
        try:
            model_available = await ollama_client.check_model_availability()
            return {
                "status": "healthy" if model_available else "model_unavailable",
                "model": ollama_client.model,
                "base_url": ollama_client.base_url,
                "timestamp": datetime.now().isoformat()
            }
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            return {
                "status": "error",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }

    @router.post("/summarize", response_model=SummarizeResponse)
    async def summarize_text(
        request: SummarizeRequestModel,
        rate_limited: bool = Depends(rate_limit_check)
    ):
        """Summarize text using local Ollama model"""
        start_time = time.time()
        
        try:
            # Ensure model is available
            if not await ollama_client.ensure_model_pulled():
                raise HTTPException(
                    status_code=503,
                    detail="AI model not available. Please ensure Ollama is running."
                )
            
            # Create summarize request
            summarize_req = SummarizeRequest(
                text=request.text,
                length=request.length
            )
            
            # Generate summary
            summary = await ollama_client.summarize_text(summarize_req)
            
            processing_time = time.time() - start_time
            
            logger.info(f"Summarization completed in {processing_time:.2f}s")
            
            return SummarizeResponse(
                summary=summary,
                original_length=len(request.text),
                processing_time=processing_time
            )
            
        except Exception as e:
            logger.error(f"Summarization failed: {e}")
            raise HTTPException(status_code=500, detail=f"Summarization failed: {str(e)}")

    @router.post("/suggest_ops", response_model=SummarizeResponse)
    async def suggest_operations(
        request: SuggestOperationsRequest,
        rate_limited: bool = Depends(rate_limit_check)
    ):
        """Suggest operations based on context and query"""
        start_time = time.time()
        
        try:
            if not await ollama_client.ensure_model_pulled():
                raise HTTPException(
                    status_code=503,
                    detail="AI model not available. Please ensure Ollama is running."
                )
            
            suggestions = await ollama_client.suggest_operations(
                context=request.context,
                query=request.query
            )
            
            processing_time = time.time() - start_time
            
            suggestion_models = [
                OperationSuggestionModel(
                    id=s.id,
                    label=s.label,
                    confidence=s.confidence
                ) for s in suggestions
            ]
            
            logger.info(f"Operation suggestions completed in {processing_time:.2f}s")
            
            return SuggestOperationsResponse(
                suggestions=suggestion_models,
                processing_time=processing_time
            )
            
        except Exception as e:
            logger.error(f"Operation suggestions failed: {e}")
            raise HTTPException(status_code=500, detail=f"Operation suggestions failed: {str(e)}")

    @router.post("/completion")
    async def text_completion(
        request: CompletionRequest,
        rate_limited: bool = Depends(rate_limit_check)
    ):
        """Generate text completion with optional streaming"""
        try:
            if not await ollama_client.ensure_model_pulled():
                raise HTTPException(
                    status_code=503,
                    detail="AI model not available. Please ensure Ollama is running."
                )
            
            ai_request = AIRequest(
                prompt=request.prompt,
                max_tokens=request.max_tokens,
                temperature=request.temperature,
                stream=request.stream
            )
            
            if request.stream:
                # Streaming response
                async def generate():
                    try:
                        async for chunk in ollama_client.generate_completion(ai_request):
                            if chunk:
                                yield f"data: {chunk}\n\n"
                        yield "data: [DONE]\n\n"
                    except Exception as e:
                        yield f"data: Error: {str(e)}\n\n"
                
                return StreamingResponse(
                    generate(),
                    media_type="text/plain",
                    headers={"Cache-Control": "no-cache", "Connection": "keep-alive"}
                )
            else:
                # Non-streaming response
                result = ""
                async for chunk in ollama_client.generate_completion(ai_request):
                    result += chunk
                
                return {"completion": result, "prompt": request.prompt}
                
        except Exception as e:
            logger.error(f"Text completion failed: {e}")
            raise HTTPException(status_code=500, detail=f"Text completion failed: {str(e)}")

    @router.get("/rtms/overview", response_model=ProductionOverview)
    async def get_production_overview(rate_limited: bool = Depends(rate_limit_check)):
        """Fetch production overview statistics"""
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            query = """
            SELECT 
                COUNT(DISTINCT employee_code) as total_operators,
                AVG(efficiency) as avg_efficiency,
                SUM(production) as total_production,
                SUM(CASE WHEN production >= target_production THEN 1 ELSE 0 END) as lines_on_target,
                COUNT(CASE WHEN efficiency < ? THEN 1 END) as alerts_generated
            FROM [ITR_PRO_IND].[dbo].[RTMS_SessionWiseProduction]
            WHERE production_date = '2025-09-12'
            """
            
            cursor.execute(query, (config.alerts.critical_threshold,))
            result = cursor.fetchone()
            
            response = ProductionOverview(
                total_operators=result[0] or 0,
                avg_efficiency=float(result[1] or 0),
                total_production=result[2] or 0,
                lines_on_target=result[3] or 0,
                alerts_generated=result[4] or 0
            )
            
            cursor.close()
            conn.close()
            
            logger.info(f"Fetched production overview: {response.dict()}")
            return response
            
        except Exception as e:
            logger.error(f"Failed to fetch production overview: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to fetch production overview: {str(e)}")

    @router.get("/rtms/operators", response_model=List[OperatorData])
    async def get_operator_data(rate_limited: bool = Depends(rate_limit_check)):
        """Fetch operator-specific production data"""
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            query = """
            SELECT 
                pr.employee_code,
                e.employee_name,
                pr.efficiency,
                pr.production,
                pr.target_production,
                pr.unit_code,
                pr.line_name,
                pr.operation,
                pr.new_oper_seq,
                pr.floor_name
            FROM [ITR_PRO_IND].[dbo].[RTMS_SessionWiseProduction] pr
            LEFT JOIN [ITR_PRO_IND].[dbo].[Employees] e ON pr.employee_code = e.employee_code
            WHERE pr.TranDate = '2025-09-12'
            """
            
            cursor.execute(query)
            rows = cursor.fetchall()
            
            response = [
                OperatorData(
                    employee_code=row[0],
                    employee_name=row[1],
                    efficiency=float(row[2]) if row[2] else 0.0,
                    production=row[3] if row[3] else 0,
                    target_production=row[4] if row[4] else 0,
                    unit_code=row[5] if row[5] else '',
                    line_name=row[6] if row[6] else '',
                    operation=row[7] if row[7] else '',
                    new_oper_seq=row[8] if row[8] else 'UNKNOWN',
                    floor_name=row[9] if row[9] else 'FLOOR-UNKNOWN'
                ) for row in rows
            ]
            
            cursor.close()
            conn.close()
            
            logger.info(f"Fetched {len(response)} operator records")
            return response
            
        except Exception as e:
            logger.error(f"Failed to fetch operator data: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to fetch operator data: {str(e)}")

    @router.get("/rtms/lines", response_model=List[LineData])
    async def get_line_data(rate_limited: bool = Depends(rate_limit_check)):
        """Fetch line-specific production data"""
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            query = """
            SELECT 
                line_name,
                unit_code,
                SUM(production) as total_production,
                SUM(target_production) as target_production,
                AVG(efficiency) as avg_efficiency,
                COUNT(DISTINCT employee_code) as operator_count
            FROM [ITR_PRO_IND].[dbo].[RTMS_SessionWiseProduction]
            WHERE TranDate = '2025-09-12'
            GROUP BY line_name, unit_code
            """
            
            cursor.execute(query)
            rows = cursor.fetchall()
            
            response = [
                LineData(
                    line_name=row[0] if row[0] else '',
                    unit_code=row[1] if row[1] else '',
                    total_production=row[2] if row[2] else 0,
                    target_production=row[3] if row[3] else 0,
                    avg_efficiency=float(row[4]) if row[4] else 0.0,
                    operator_count=row[5] if row[5] else 0
                ) for row in rows
            ]
            
            cursor.close()
            conn.close()
            
            logger.info(f"Fetched {len(response)} line records")
            return response
            
        except Exception as e:
            logger.error(f"Failed to fetch line data: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to fetch line data: {str(e)}")

    return router

# Expose the router initialization function
router = get_router()