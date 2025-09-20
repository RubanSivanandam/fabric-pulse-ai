"""
Ollama AI Client for local llama-3.2:3b model integration
Provides text completion, summarization, and operational suggestions
"""

import asyncio
import json
import logging
import subprocess

import aiohttp
import httpx
from typing import Dict, List, Any, Optional, AsyncGenerator
from dataclasses import dataclass
import time
from pathlib import Path

logger = logging.getLogger(__name__)

@dataclass
class AIRequest:
    """Base AI request structure"""
    prompt: str
    max_tokens: int = 500
    temperature: float = 0.7
    stream: bool = False

@dataclass
class SummarizeRequest:
    """Summarization request"""
    text: str
    length: str = "medium"  # short, medium, long

@dataclass
class OperationSuggestion:
    """Operation suggestion response"""
    id: str
    label: str
    confidence: float

class OllamaClient:
    """Client for communicating with local Ollama instance"""
    
    def __init__(self, model: str = "llama3.2:3b", base_url: str = "http://localhost:11434"):
        self.model = model
        self.base_url = base_url
        self.client = httpx.AsyncClient(timeout=30.0)
        
    async def __aenter__(self):
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.client.aclose()
    
    async def check_model_availability(self) -> bool:
        """Check if Ollama is running and model is available"""
        try:
            response = await self.client.get(f"{self.base_url}/api/tags")
            if response.status_code == 200:
                models = response.json().get("models", [])
                return any(model["name"].startswith(self.model) for model in models)
            return False
        except Exception as e:
            logger.error(f"Failed to check Ollama availability: {e}")
            return False
    
    async def ensure_model_pulled(self) -> bool:
        """Ensure the model is pulled and available"""
        try:
            # Check if model exists
            if await self.check_model_availability():
                return True
                
            logger.info(f"Pulling model {self.model}...")
            response = await self.client.post(
                f"{self.base_url}/api/pull",
                json={"name": self.model},
                timeout=300.0  # 5 minutes for model pull
            )
            
            if response.status_code == 200:
                logger.info(f"Model {self.model} pulled successfully")
                return True
            else:
                logger.error(f"Failed to pull model: {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"Error ensuring model availability: {e}")
            return False
    
    async def generate_completion(self, request: AIRequest) -> AsyncGenerator[str, None]:
        """Generate text completion with streaming support"""
        try:
            payload = {
                "model": self.model,
                "prompt": request.prompt,
                "stream": request.stream,
                "options": {
                    "temperature": request.temperature,
                    "num_predict": request.max_tokens
                }
            }
            
            async with self.client.stream(
                'POST',
                f"{self.base_url}/api/generate",
                json=payload
            ) as response:
                
                if response.status_code != 200:
                    error_text = await response.aread()
                    raise Exception(f"Ollama API error: {error_text.decode()}")
                
                if request.stream:
                    async for line in response.aiter_lines():
                        if line.strip():
                            try:
                                chunk = json.loads(line)
                                if "response" in chunk:
                                    yield chunk["response"]
                                if chunk.get("done", False):
                                    break
                            except json.JSONDecodeError:
                                continue
                else:
                    content = await response.aread()
                    result = json.loads(content.decode())
                    yield result.get("response", "")
                    
        except Exception as e:
            logger.error(f"Completion generation failed: {e}")
            yield f"Error: {str(e)}"
    
    async def summarize_text(self, request: SummarizeRequest) -> str:
        """Summarize text with specified length"""
        length_prompts = {
            "short": "Provide a brief 1-2 sentence summary",
            "medium": "Provide a concise paragraph summary", 
            "long": "Provide a detailed summary with key points"
        }
        
        length_instruction = length_prompts.get(request.length, length_prompts["medium"])
        
        prompt = f"""
{length_instruction} of the following text:

{request.text}

Summary:"""
        
        ai_request = AIRequest(
            prompt=prompt,
            max_tokens=300 if request.length == "long" else 150,
            temperature=0.3,  # Lower temperature for factual summaries
            stream=False
        )
        
        result = ""
        async for chunk in self.generate_completion(ai_request):
            result += chunk
            
        return result.strip()
    
    async def suggest_operations(self, context: str, query: str) -> List[OperationSuggestion]:
        """Suggest operations based on context and query"""
        prompt = f"""
Based on the following garment manufacturing context and user query, suggest relevant operations.
Respond with a JSON array of operations, each with id, label, and confidence (0.0-1.0).

Context: {context}
Query: {query}

Example operations in garment manufacturing:
- Cutting, Sewing, Hemming, Buttonhole, Collar attachment, Sleeve attachment
- Quality checking, Pressing, Folding, Packaging

Respond only with valid JSON array:
"""
        
        ai_request = AIRequest(
            prompt=prompt,
            max_tokens=200,
            temperature=0.4,
            stream=False
        )
        
        try:
            result = ""
            async for chunk in self.generate_completion(ai_request):
                result += chunk
            
            # Try to extract JSON from response
            result = result.strip()
            if not result.startswith('['):
                # Find JSON array in response
                start = result.find('[')
                end = result.rfind(']') + 1
                if start != -1 and end > start:
                    result = result[start:end]
            
            suggestions_data = json.loads(result)
            
            suggestions = []
            for item in suggestions_data:
                if isinstance(item, dict) and all(key in item for key in ['id', 'label', 'confidence']):
                    suggestions.append(OperationSuggestion(
                        id=str(item['id']),
                        label=str(item['label']),
                        confidence=float(item['confidence'])
                    ))
            
            return suggestions[:10]  # Limit to top 10 suggestions
            
        except Exception as e:
            logger.error(f"Operation suggestion failed: {e}")
            # Fallback suggestions
            return [
                OperationSuggestion(id="fallback-1", label="General Operation", confidence=0.5)
            ]
    async def stream_chat(self, model: str, messages: list, options: dict = None):
        """
        Stream chat responses from Ollama (token-by-token).
        Yields tokens like ChatGPT typing animation.
        """
        url = f"{self.base_url}/api/chat"
        payload = {
            "model": model,
            "messages": messages,
            "stream": True  # important for streaming
        }
        if options:
            payload["options"] = options

        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=payload) as resp:
                async for line in resp.content:
                    if not line.strip():
                        continue
                    try:
                        data = json.loads(line.decode("utf-8"))
                        if "message" in data and "content" in data["message"]:
                            yield data["message"]["content"]
                    except Exception as e:
                        logger.error(f"Streaming parse error: {e}")
                        continue


# Global client instance
ollama_client = OllamaClient()
