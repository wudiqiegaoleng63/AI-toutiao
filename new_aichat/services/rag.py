import os
from typing import List, Optional, Tuple
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from .vectorstore import search_similar
from .reranker import get_reranker
from .hybrid_search import get_hybrid_search

# 加载环境变量
load_dotenv()

# 从环境变量读取配置
OLLAMA_API_KEY = os.getenv('OLLAMA_API_KEY', 'ollama')
OLLAMA_BASE_URL = os.getenv('OLLAMA_BASE_URL', 'http://localhost:11434/v1')

# 推理参数配置
reasoning = {
    "effort": "medium",  # 'low', 'medium', or 'high'
    "summary": "auto",   # 'detailed', 'auto', or None
}

# 初始化 LLM（支持推理模型）
qwen_llm = ChatOpenAI(
    model='qwen3-vl:2b',
    api_key=OLLAMA_API_KEY,
    base_url=OLLAMA_BASE_URL,
    reasoning=reasoning,
    output_version="responses/v1"
)


HistoryType = List[Tuple[str, str]]


def get_llm() -> ChatOpenAI:
    """获取 LLM 实例"""
    return qwen_llm


async def rewrite_query(question: str, history: Optional[HistoryType] = None):
    """重写查询，让提问更完整清晰"""
    if not history:
        return question

    history_text = "\n".join([f"{role}: {content}" for role, content in history])
    prompt = ChatPromptTemplate.from_messages([
        ("system", "你是一个查询重写助手。根据对话历史重写用户问题，使其更完整清晰。只返回重写后的问题。"),
        ("user", "对话历史：\n{history}\n\n用户问题：{question}\n\n重写后的问题：")
    ])
    llm = get_llm()
    chain = prompt | llm

    result = await chain.ainvoke({"history": history_text, "question": question})
    return result.content.strip()



# 系统提示词（有上下文时使用）
RAG_SYSTEM_PROMPT = """根据以下新闻内容回答问题，要求：
1. 简明扼要，不超过150字
2. 直接回答核心内容，不要重复问题
3. 如果新闻无关，简短回答用户问题即可

相关新闻：
{context}
"""

# 系统提示词（无上下文时使用）
CHAT_SYSTEM_PROMPT = "你是一个友好的 AI 助手，请用中文回答问题。"


def _process_stream_chunk(chunk):
    """
    处理流式响应块，提取思考和回答内容

    返回: {"thinking": str, "data": str}
    """
    result = {"thinking": "", "data": ""}

    if not hasattr(chunk, 'content') or not chunk.content:
        return result

    for block in chunk.content:
        if isinstance(block, dict):
            block_type = block.get("type", "")
            if block_type == "reasoning":
                # 思考过程
                for summary in block.get("summary", []):
                    text = summary.get("text", "")
                    if text:
                        result["thinking"] += text
            elif block_type == "text":
                # 回答内容
                text = block.get("text", "")
                if text:
                    result["data"] += text
        elif hasattr(block, "text"):
            # 兼容普通文本块
            text = getattr(block, "text", "")
            if text:
                result["data"] += text

    return result


def _extract_answer(result):
    """从 LLM 结果中提取回答内容（过滤思考过程）"""
    answer = ""
    for block in result.content:
        if isinstance(block, dict) and block.get("type") == "text":
            answer += block.get("text", "")
        elif hasattr(block, "text"):
            answer += getattr(block, "text", "")
    return answer


# ==================== 统一聊天接口 ====================

async def stream_chat(
    question: str,
    use_rag: bool = True,
    k: int = 2,
    history: Optional[HistoryType] = None
):
    """
    流式聊天 - 统一接口

    参数:
        question: 用户问题
        use_rag: 是否使用 RAG 检索（默认 True）
        k: 检索数量（RAG 模式有效）
        history: 对话历史
    """
    docs = []

    if use_rag:
        # RAG 模式：先检索
        docs = search_similar(query=question, k=k)
        context = "\n\n---\n\n".join([
            f"检索的相关新闻信息{doc.page_content}" for doc in docs
        ])
        system_prompt = RAG_SYSTEM_PROMPT
    else:
        # 普通模式
        context = ""
        system_prompt = CHAT_SYSTEM_PROMPT

    messages = [("system", system_prompt)]
    if history:
        messages.extend(history)
    messages.append(("user", "{question}"))

    prompt = ChatPromptTemplate.from_messages(messages)
    llm = get_llm()
    chain = prompt | llm

    in_thinking = False

    async for chunk in chain.astream({"question": question, "context": context}):
        parsed = _process_stream_chunk(chunk)

        # 处理思考内容
        if parsed["thinking"]:
            if not in_thinking:
                yield "think_start:"
                in_thinking = True
            yield f"think:{parsed['thinking']}"

        # 处理回答内容
        if parsed["data"]:
            if in_thinking:
                yield "think_end:"
                in_thinking = False
            yield f"data:{parsed['data']}"

    # 确保思考结束标签
    if in_thinking:
        yield "think_end:"


def chat(
    question: str,
    use_rag: bool = True,
    k: int = 2,
    history: Optional[HistoryType] = None
) -> dict:
    """
    聊天 - 统一接口

    参数:
        question: 用户问题
        use_rag: 是否使用 RAG 检索（默认 True）
        k: 检索数量（RAG 模式有效）
        history: 对话历史

    返回:
        {"answer": "AI回复", "sources": [文档列表]}
    """
    docs = []

    if use_rag:
        # RAG 模式：先检索
        docs = search_similar(query=question, k=k)
        context = "\n\n---\n\n".join([
            f"检索的相关新闻信息{doc.page_content}" for doc in docs
        ])
        system_prompt = RAG_SYSTEM_PROMPT
    else:
        # 普通模式
        context = ""
        system_prompt = CHAT_SYSTEM_PROMPT

    messages = [("system", system_prompt)]
    if history:
        messages.extend(history)
    messages.append(("user", "{question}"))

    prompt = ChatPromptTemplate.from_messages(messages)
    llm = get_llm()
    chain = prompt | llm

    result = chain.invoke({"context": context, "question": question})
    answer = _extract_answer(result)

    return {"answer": answer, "sources": docs}


# ==================== 高级 RAG 接口 ====================

async def advanced_rag_chat(
    question: str,
    k: int = 2,
    history: Optional[HistoryType] = None,
    use_rewrite: bool = True,
    use_hybrid: bool = True,
    use_rerank: bool = True
) -> dict:
    """
    高级 RAG 聊天

    参数:
        question: 用户问题
        k: 检索数量
        history: 对话历史
        use_rewrite: 是否使用查询重写
        use_hybrid: 是否使用混合检索
        use_rerank: 是否使用重排序

    返回:
        {"answer": "AI回复", "sources": [文档列表]}
    """
    # 1. 查询改写
    if use_rewrite and history:
        rewritten_query = await rewrite_query(question, history)
    else:
        rewritten_query = question

    # 2. 检索
    if use_hybrid:
        hybrid_search = get_hybrid_search()
        docs = hybrid_search.search(rewritten_query, k=k * 2)
    else:
        docs = search_similar(rewritten_query, k=k * 2)

    # 3. 重排序
    if use_rerank:
        reranker = get_reranker()
        docs = reranker.rerank(rewritten_query, docs, top_k=k)
    else:
        docs = docs[:k]

    # 4. 生成回答
    context = "\n\n---\n\n".join([
        f"相关新闻：{doc.page_content}" for doc in docs
    ])

    messages = [("system", RAG_SYSTEM_PROMPT)]
    if history:
        messages.extend(history)
    messages.append(("user", "{question}"))

    prompt = ChatPromptTemplate.from_messages(messages)
    llm = get_llm()
    chain = prompt | llm

    result = chain.invoke({"context": context, "question": question})
    answer = _extract_answer(result)

    return {
        "answer": answer,
        "sources": docs,
        "rewritten_query": rewritten_query if use_rewrite else None
    }


async def advanced_rag_stream(
    question: str,
    k: int = 2,
    history: Optional[HistoryType] = None,
    use_rewrite: bool = True,
    use_hybrid: bool = True,
    use_rerank: bool = True
):
    """高级 RAG 流式聊天"""
    # 1. 查询改写
    if use_rewrite and history:
        rewritten_query = await rewrite_query(question, history)
    else:
        rewritten_query = question

    # 2. 检索
    if use_hybrid:
        hybrid_search = get_hybrid_search()
        docs = hybrid_search.search(rewritten_query, k=k * 2)
    else:
        docs = search_similar(rewritten_query, k=k * 2)

    # 3. 重排序
    if use_rerank:
        reranker = get_reranker()
        docs = reranker.rerank(rewritten_query, docs, top_k=k)
    else:
        docs = docs[:k]

    # 4. 生成回答
    context = "\n\n---\n\n".join([
        f"相关新闻：{doc.page_content}" for doc in docs
    ])

    messages = [("system", RAG_SYSTEM_PROMPT)]
    if history:
        messages.extend(history)
    messages.append(("user", "{question}"))

    prompt = ChatPromptTemplate.from_messages(messages)
    llm = get_llm()
    chain = prompt | llm

    in_thinking = False

    async for chunk in chain.astream({'context': context, 'question': question}):
        parsed = _process_stream_chunk(chunk)

        if parsed["thinking"]:
            if not in_thinking:
                yield "think_start:"
                in_thinking = True
            yield f"think:{parsed['thinking']}"

        if parsed["data"]:
            if in_thinking:
                yield "think_end:"
                in_thinking = False
            yield f"data:{parsed['data']}"

    if in_thinking:
        yield "think_end:"


# ==================== 兼容性别名 ====================
# 保留旧函数名以兼容现有代码

async def stream_rag_chat(question: str, k: int = 2, history: Optional[HistoryType] = None):
    """兼容性别名 - 使用 stream_chat(use_rag=True)"""
    return stream_chat(question, use_rag=True, k=k, history=history)


def rag_chat(question: str, k: int = 2, history: Optional[HistoryType] = None) -> dict:
    """兼容性别名 - 使用 chat(use_rag=True)"""
    return chat(question, use_rag=True, k=k, history=history)