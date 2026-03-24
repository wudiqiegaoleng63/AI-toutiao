"""
混合检索服务：向量检索 + BM25
"""
from typing import List
from langchain_core.documents import Document
from .vectorstore import get_vectorstore
from .embeddings import get_embeddings



from rank_bm25 import BM25Okapi


def simple_tokenize(text: str) -> List[str]:
    return list(text)


class HybridSearch:
    def __init__(self):
        self.vectorstore = get_vectorstore()
        self.bm25 = None
        self.documents = []

    def init_bm25(self):
        """初始化bm25检索器"""
        docs = self.vectorstore.get()
        self.documents = [
            Document(page_content=docs['documents'][i], metadata=docs['metadatas'][i])
            for i in range(len(docs['documents']))
        ]


        # 构建bm25索引
        tokenized_docs = [simple_tokenize(doc.page_content) for doc in self.documents]
        self.bm25 = BM25Okapi(tokenized_docs)


    def search(self, query: str, k: int = 5, alpha: float = 0.5):
        """
        混合检索
        
        参数:
            query: 查询文本
            k: 返回文档数量
            alpha: 向量检索权重 (0-1)，BM25权重为 (1-alpha)
        
        返回:
            检索到的文档列表
        """
        if not self.bm25:
            self.init_bm25()
        
        # 1.向量检索
        vector_docs = self.vectorstore.similarity_search_with_score(query, k=k*2)
        vector_scores = {doc.page_content: 1 / (1 + score) for doc, score in vector_docs}

        # 2.bm25检索

        tokenize_query = simple_tokenize(query)
        bm25_scores = self.bm25.get_scores(tokenize_query)


        # 3.合并分数
        combined_scores = {}
        for i, doc in enumerate(self.documents):
            content = doc.page_content
            v_score = vector_scores.get(content, 0)
            b_score = bm25_scores[i] / (1 + bm25_scores[i]) if bm25_scores[i] > 0 else 0  
            combined_scores[content] = alpha * v_score + (1 - alpha) * b_score
        # 4. 排序返回 top-k
        sorted_docs = sorted(
            self.documents,
            key=lambda d: combined_scores.get(d.page_content, 0),
            reverse=True
        )[:k]
        
        return sorted_docs


_hybrid_search = None

def get_hybrid_search() -> HybridSearch:
    global _hybrid_search
    if _hybrid_search is None:
        _hybrid_search = HybridSearch()
    return _hybrid_search