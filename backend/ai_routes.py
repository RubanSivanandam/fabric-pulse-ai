"""
AI API Routes for Fabric Pulse AI
Local Ollama integration with rate limiting and authentication
"""

import asyncio
import logging
import time
from typing import Dict, Optional
from datetime import datetime, timedelta
import os
from collections import defaultdict

from fastapi import APIRouter, HTTPException, Depends, Request, Header
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
import httpx

from ollama_client import ollama_client, SummarizeRequest, OperationSuggestion, AIRequest

logger = logging.getLogger(__name__)

# Configuration
AI_API_KEY = os.getenv("AI_API_KEY", "fabric-pulse-ai-2025")
RATE_LIMIT_REQUESTS = 60  # requests per hour per IP
MAX_INPUT_LENGTH = 10000

# In-memory rate limiting
rate_limit_store: Dict[str, Dict] = defaultdict(lambda: {"count": 0, "reset_time": datetime.now()})

router = APIRouter(prefix="/api/ai", tags=["AI"])

# Request/Response Models
class SummarizeRequestModel(BaseModel):
    text: str = Field(..., max_length=MAX_INPUT_LENGTH, description="Text to summarize")
    length: str = Field("medium", regex="^(short|medium|long)$", description="Summary length")

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

# Authentication dependency
async def verify_ai_client(x_ai_client: Optional[str] = Header(None)) -> bool:
    if not x_ai_client or x_ai_client != AI_API_KEY:
        raise HTTPException(
            status_code=401,
            detail="Invalid or missing AI client authentication"
        )
    return True

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
async def health_check():
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
    authenticated: bool = Depends(verify_ai_client),
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

@router.post("/suggest_ops", response_model=SuggestOperationsResponse)
async def suggest_operations(
    request: SuggestOperationsRequest,
    authenticated: bool = Depends(verify_ai_client),
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
    authenticated: bool = Depends(verify_ai_client),
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
