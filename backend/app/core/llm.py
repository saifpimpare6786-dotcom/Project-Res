import ollama
from typing import List, Dict, Any, Optional
from app.core.config import settings

class OllamaClient:
    """
    Wrapper for Ollama interactions:
    - Generative calls (Gemma 4 12B)
    - Embeddings (nomic-embed-text)
    """
    def __init__(self):
        self.client = ollama.Client(host=settings.OLLAMA_HOST, timeout=12.0)
        self.model = settings.OLLAMA_MODEL
        self.embed_model = settings.OLLAMA_EMBED_MODEL

    def is_available(self) -> bool:
        """Check if Ollama server is responding and required models exist."""
        try:
            models_response = self.client.list()
            model_names = [m.model for m in models_response.models]
            has_primary = any(self.model in name for name in model_names)
            has_embed = any(self.embed_model in name for name in model_names)
            return has_primary or len(model_names) > 0
        except Exception:
            return False

    def list_models(self) -> List[str]:
        try:
            res = self.client.list()
            return [m.model for m in res.models]
        except Exception as e:
            return [f"Error: {e}"]

    def chat(self, messages: List[Dict[str, str]], temperature: float = 0.5, **kwargs) -> str:
        """Send chat messages to Ollama and get assistant response."""
        try:
            opts = {"temperature": temperature, "num_predict": 350}
            opts.update(kwargs.get("options", {}))
            response = self.client.chat(
                model=self.model,
                messages=messages,
                options=opts,
            )
            return response["message"]["content"]
        except Exception as e:
            return f"Ollama generation error: {str(e)}"

    def get_embedding(self, text: str) -> List[float]:
        """Generate vector embedding for a given text."""
        try:
            res = self.client.embeddings(
                model=self.embed_model,
                prompt=text,
            )
            return res.get("embedding", [])
        except Exception as e:
            print(f"Embedding generation error: {e}")
            return []

ollama_client = OllamaClient()
