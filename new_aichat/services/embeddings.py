from ..config import EMBEDDING_MODEL_NAME
from langchain_ollama import OllamaEmbeddings

qwen_embedding = OllamaEmbeddings(
    base_url="http://localhost:11434",
    model=EMBEDDING_MODEL_NAME
)


def get_embeddings() -> OllamaEmbeddings:
    """获取 Embedding 实例"""
    return qwen_embedding
