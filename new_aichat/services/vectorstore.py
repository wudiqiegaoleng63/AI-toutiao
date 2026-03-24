from langchain_chroma import Chroma
from langchain_core.documents import Document
from ..config import CHROMA_PERSIST_DIR
from .embeddings import qwen_embedding
from typing import List, Optional
import asyncio

vectorstore = Chroma(
    collection_name='news_store',
    persist_directory=CHROMA_PERSIST_DIR,
    embedding_function=qwen_embedding,
)


def get_vectorstore() -> Chroma:
    """获取 Chroma 向量库实例"""
    return vectorstore


def add_news_documents(text: List[str], metadatas: List[dict]):
    vectorstore.add_texts(
        texts=text,
        metadatas=metadatas
    )
    return True


def search_similar(query: str, k: int = 3) -> List[Document]:
    res = vectorstore.similarity_search(query=query, k=k)
    return res

# curd

# 获取分页所有文档
async def get_all_documents(limit: int=10, offset: int=0) -> dict:
    def _get():
        docs = vectorstore.get()
        ids = docs.get("ids", [])[offset:offset+limit]
        documents = docs.get("documents", [])[offset:offset+limit]
        metadatas = docs.get("metadatas", [])[offset:offset+limit]
        return {
            "ids": ids,
            "documents": documents,
            "metadatas": metadatas,
            "total": len(docs.get("ids", []))
        }
    return await asyncio.to_thread(_get)

# 按id获取文档 
async def get_document_by_id(doc_id: str)-> Optional[dict]:
    def _get():
        docs = vectorstore.get(ids=[doc_id])
        if not docs["ids"]:
            return None
        return {
            "id": docs["ids"][0],
            "content": docs["documents"][0],
            "metadata": docs["metadatas"][0] if docs["metadatas"] else {}
        }
    return await asyncio.to_thread(_get)


async def delete_document(doc_id: str) -> bool:
    """删除文档"""
    def _delete():
        vectorstore.delete(ids=[doc_id])
        return True
    return await asyncio.to_thread(_delete)


async def delete_documents(doc_ids: List[str]) -> bool:
    """批量删除文档"""
    def _delete():
        vectorstore.delete(ids=doc_ids)
        return True
    return await asyncio.to_thread(_delete)

async def clear_collection() -> bool:
    """清空集合"""
    def _clear():
        all_ids = vectorstore.get()["ids"]
        if all_ids:
            vectorstore.delete(ids=all_ids)
        return True
    return await asyncio.to_thread(_clear)

async def get_collection_stats() -> dict:
    """获取集合统计信息"""
    def _stats():
        all_docs = vectorstore.get()
        return {
            "total_documents": len(all_docs.get("ids", [])),
            "collection_name": "news_store"
        }
    return await asyncio.to_thread(_stats)




