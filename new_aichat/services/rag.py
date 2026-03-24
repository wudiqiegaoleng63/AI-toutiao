import os
from typing import List, Optional, Tuple
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from .vectorstore import search_similar
from .reranker import get_reranker
from .hybrid_search import get_hybrid_search

# 加载环境变量
load_dotenv()

# 从环境变量读取配置
OLLAMA_API_KEY = os.getenv('OLLAMA_API_KEY', '')
OLLAMA_BASE_URL = os.getenv('DASHSCOPE_BASE_UR', 'http://localhost:11434/v1')


# 初始化 LLM
qwen_llm = ChatOpenAI(
    model="qwen3-vl:2b",
    base_url=OLLAMA_BASE_URL,
    api_key=OLLAMA_API_KEY,
    temperature=0.2
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
    chain = prompt | llm | StrOutputParser()

    rewritten = chain.invoke({"history": history_text, "question": question})
    return rewritten.strip()


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


def chat(question: str, history: Optional[HistoryType] = None) -> str:
    """简单聊天（不使用 RAG 检索）"""
    message = [("system", CHAT_SYSTEM_PROMPT)]
    if history:
        message.extend(history)
    message.append(("user", "{question}"))

    prompt = ChatPromptTemplate.from_messages(message)
    llm = get_llm()
    chain = prompt | llm | StrOutputParser()

    result = chain.invoke({"question": question})
    return result


def rag_chat(question: str, k: int = 2, history: Optional[HistoryType] = None) -> dict:
    """
    RAG 聊天（先检索再回答）

    参数:
        question: 用户问题
        k: 检索数量

    返回:
        {"answer": "AI回复", "sources": [检索到的文档列表]}
    """
    docs = search_similar(query=question, k=k)

    context = "\n\n---\n\n".join([
        f"检索的相关新闻信息{doc.page_content}" for doc in docs
    ])

    messages = [("system", RAG_SYSTEM_PROMPT)]
    if history:
        messages.extend(history)
    messages.append(("user", "{question}"))

    rag_prompt = ChatPromptTemplate.from_messages(messages)
    llm = get_llm()
    chain = rag_prompt | llm | StrOutputParser()

    res = chain.invoke({"context": context, "question": question})

    return {"answer": res, "sources": docs}


async def stream_chat(question: str, history: Optional[HistoryType] = None):
    """流式聊天"""
    messages = [("system", CHAT_SYSTEM_PROMPT)]
    if history:
        messages.extend(history)
    messages.append(("user", "{question}"))

    prompt = ChatPromptTemplate.from_messages(messages)
    llm = get_llm()
    chain = prompt | llm | StrOutputParser()

    in_thinking = False
    async for chunk in chain.astream({"question": question}):
        if '<tool_call>' in chunk:
            in_thinking = True
            yield "think_start:"
            chunk = chunk.replace('<tool_call>', '')

        if in_thinking and '*/}' in chunk:
            in_thinking = False
            chunk = chunk.replace('*/}', '')
            if chunk.strip():
                yield f"think:{chunk}"
            yield "think_end:"
            continue

        if in_thinking:
            if chunk.strip():
                yield f"think:{chunk}"
        else:
            if chunk.strip():
                yield f"data:{chunk}"


async def stream_rag_chat(question: str, k: int = 2, history: Optional[HistoryType] = None):
    """流式 RAG 聊天"""
    docs = search_similar(query=question, k=k)

    context = "\n\n---\n\n".join([
        f"检索的相关新闻信息{doc.page_content}" for doc in docs
    ])

    messages = [("system", RAG_SYSTEM_PROMPT)]
    if history:
        messages.extend(history)
    messages.append(("user", "{question}"))

    rag_prompt = ChatPromptTemplate.from_messages(messages)
    llm = get_llm()
    chain = rag_prompt | llm | StrOutputParser()

    in_thinking = False
    async for chunk in chain.astream({"question": question, "context": context}):
        if '<tool_call>' in chunk:
            in_thinking = True
            yield "think_start:"
            chunk = chunk.replace('<tool_call>', '')

        if in_thinking and '*/}' in chunk:
            in_thinking = False
            chunk = chunk.replace('*/}', '')
            if chunk.strip():
                yield f"think:{chunk}"
            yield "think_end:"
            continue

        if in_thinking:
            if chunk.strip():
                yield f"think:{chunk}"
        else:
            if chunk.strip():
                yield f"data:{chunk}"


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
    chain = prompt | llm | StrOutputParser()

    answer = chain.invoke({"context": context, "question": question})

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
    chain = prompt | llm | StrOutputParser()

    in_thinking = False
    async for chunk in chain.astream({'context': context, 'question': question}):
        if '<tool_call>' in chunk:
            in_thinking = True
            yield "think_start:"
            chunk = chunk.replace('<tool_call>', '')

        if in_thinking and '*/}' in chunk:
            in_thinking = False
            chunk = chunk.replace('*/}', '')
            if chunk.strip():
                yield f"think:{chunk}"
            yield "think_end:"
            continue

        if in_thinking:
            if chunk.strip():
                yield f"think:{chunk}"
        else:
            if chunk.strip():
                yield f"data:{chunk}"