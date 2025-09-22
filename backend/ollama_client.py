from pydantic import BaseModel
import aiohttp
import asyncio
import json
import logging

logger = logging.getLogger("ollama_client")

class AIRequest(BaseModel):
    prompt: str
    max_tokens: int = 500
    temperature: float = 0.7
    stream: bool = False
    
class OllamaClient:
    def __init__(self, base_url: str = "http://localhost:11434"):
        self.base_url = base_url.rstrip("/")

    # ================== STREAM CHAT ==================
    async def stream_chat(self, model: str, messages: list, options: dict = None):
        """
        Stream chat responses from Ollama (token-by-token).
        Yields text fragments (like ChatGPT typing animation).
        """
        url = f"{self.base_url}/api/chat"
        payload = {
            "model": model,
            "messages": messages,
            "stream": True
        }
        if options:
            payload["options"] = options

        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=payload) as resp:
                async for raw_line in resp.content:
                    if not raw_line:
                        continue
                    try:
                        # ✅ Always decode as UTF-8, skip bad bytes
                        line = raw_line.decode("utf-8", errors="ignore").strip()
                        if not line:
                            continue
                        data = json.loads(line)
                        if "message" in data and "content" in data["message"]:
                            yield data["message"]["content"]
                    except json.JSONDecodeError:
                        logger.debug("Skipping malformed JSON chunk from Ollama (chat)")
                        continue
                    except Exception as e:
                        logger.error(f"Ollama stream_chat parse error: {e}")
                        continue

    # ================== GENERATE COMPLETION ==================
    async def generate_completion(self, model: str, prompt: str, stream: bool = False, options: dict = None):
        """
        Generate text completions from Ollama.
        If stream=True, yields fragments incrementally.
        If stream=False, yields the full response once.
        """
        url = f"{self.base_url}/api/generate"
        payload = {
            "model": model,
            "prompt": prompt,
            "stream": stream
        }
        if options:
            payload["options"] = options

        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=payload) as resp:
                if stream:
                    async for raw_line in resp.content:
                        if not raw_line:
                            continue
                        try:
                            line = raw_line.decode("utf-8", errors="ignore").strip()
                            if not line:
                                continue
                            chunk = json.loads(line)
                            if "response" in chunk:
                                yield chunk["response"]
                            if chunk.get("done", False):
                                break
                        except json.JSONDecodeError:
                            logger.debug("Skipping malformed JSON chunk in completion stream")
                            continue
                        except Exception as e:
                            logger.error(f"Ollama generate_completion stream error: {e}")
                            continue
                else:
                    try:
                        content = await resp.read()
                        text = content.decode("utf-8", errors="ignore")
                        result = json.loads(text)
                        yield result.get("response", "")
                    except Exception as e:
                        logger.error(f"Ollama generate_completion non-stream error: {e}")
                        yield ""

    # ================== EXTRA: STREAM RAW RESPONSES ==================
    async def stream_raw(self, endpoint: str, payload: dict):
        """
        Generic method to stream raw responses from any Ollama endpoint.
        """
        url = f"{self.base_url}{endpoint}"
        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=payload) as resp:
                async for raw_line in resp.content:
                    try:
                        line = raw_line.decode("utf-8", errors="ignore").strip()
                        if line:
                            yield line
                    except Exception as e:
                        logger.error(f"stream_raw decode error: {e}")
                        continue

    # ================== NON-STREAM GENERIC CALL ==================
    async def call(self, endpoint: str, payload: dict):
        """
        Generic non-streaming call.
        """
        url = f"{self.base_url}{endpoint}"
        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=payload) as resp:
                try:
                    content = await resp.read()
                    text = content.decode("utf-8", errors="ignore")
                    return json.loads(text)
                except json.JSONDecodeError:
                    logger.error("Malformed JSON in Ollama response")
                    return {}
                except Exception as e:
                    logger.error(f"Ollama call error: {e}")
                    return {}

    # ================== PING ==================
    async def ping(self):
        """
        Check if Ollama server is alive.
        """
        url = f"{self.base_url}/api/tags"
        async with aiohttp.ClientSession() as session:
            try:
                async with session.get(url) as resp:
                    if resp.status == 200:
                        return True
            except Exception:
                return False
        return False


# ================== TEST HARNESS ==================
if __name__ == "__main__":
    async def main():
        client = OllamaClient()
        print("=== Streaming Chat Test ===")
        async for token in client.stream_chat(
            model="llama3.2:3b",
            messages=[{"role": "user", "content": "Hello Ollama!"}],
        ):
            print(token, end="", flush=True)

        print("\n\n=== Completion Test ===")
        async for result in client.generate_completion(
            model="llama3.2:3b", prompt="Write a haiku about AI.", stream=False
        ):
            print(result)

    asyncio.run(main())

# ✅ Always available for imports
ollama_client = OllamaClient()