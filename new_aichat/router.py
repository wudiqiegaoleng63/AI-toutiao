from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, Form
import tempfile
import os
import base64
from sqlalchemy.ext.asyncio import AsyncSession
from .services.session import create_session, get_session_messages, get_user_session, add_message, delete_session, get_session_by_id
from config.db_conf import get_db
from utils.auth import get_current_user
from models.users import User
from .services.rag import chat, stream_chat, advanced_rag_chat, advanced_rag_stream
from .services.documents_loader import load_and_split, get_file_type
from .services.multimodal import get_multimodal_chat
from .services.vectorstore import (
    get_vectorstore,
    get_all_documents,
    get_document_by_id,
    delete_document,
    delete_documents,
    clear_collection,
    get_collection_stats
)
from .models import AIChatLog
from fastapi.responses import StreamingResponse
import logging
from pydantic import BaseModel
from typing import Optional, List
logger = logging.getLogger(__name__)

class ChatRequest(BaseModel):
    """聊天请求"""
    question: str # 用户问题
    session_id: Optional[int] = None
    use_rag: bool = True    # 是否使用 RAG（默认开启）
    k: int = 3              # 检索数量


class ChatResponse(BaseModel):
    """聊天响应"""
    answer: str                     # AI 回复
    sources: Optional[List[str]]    # 检索


class AdvancedChatRequest(BaseModel):
    """高级 RAG 聊天请求"""
    question: str
    session_id: Optional[int] = None
    k: int = 5
    use_rewrite: bool = True
    use_hybrid: bool = True
    use_rerank: bool = True



router = APIRouter(prefix="/api/aichat", tags=['aichat'])


# ==================== 会话管理接口 ====================

@router.get("/sessions", summary="获取会话列表")
async def list_sessions(
    skip: int = Query(0, ge=0, description="偏移量"),
    limit: int = Query(20, ge=1, le=100, description="每页数量"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """获取用户的所有会话列表"""
    try:
        sessions = await get_user_session(db, user.id)
        # 按时间倒序并分页
        total = len(sessions)
        sessions = sessions[skip:skip + limit]

        return {
            "code": 200,
            "message": "success",
            "conversations": [
                {
                    "id": s.id,
                    "title": s.title or f"对话 {s.id}",
                    "created_at": s.created_at.isoformat(),
                    "updated_at": s.created_at.isoformat()  # 暂用创建时间
                }
                for s in sessions
            ],
            "total": total
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取会话列表失败: {str(e)}")


@router.post("/sessions", summary="创建新会话")
async def new_session(
    title: Optional[str] = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """创建新的聊天会话"""
    try:
        session = await create_session(db, user.id, title)
        return {
            "code": 200,
            "message": "会话创建成功",
            "id": session.id,
            "title": session.title or f"对话 {session.id}",
            "created_at": session.created_at.isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"创建会话失败: {str(e)}")


@router.get("/sessions/{session_id}/messages", summary="获取会话消息")
async def get_messages(
    session_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """获取指定会话的消息历史"""
    try:
        # 验证会话属于当前用户
        session = await get_session_by_id(db, session_id)
        if not session:
            raise HTTPException(status_code=404, detail="会话不存在")
        if session.user_id != user.id:
            raise HTTPException(status_code=403, detail="无权访问此会话")

        messages = await get_session_messages(db, session_id, limit)
        return {
            "code": 200,
            "message": "success",
            "messages": [
                {
                    "id": m.id,
                    "role": m.role,
                    "content": m.content,
                    "created_at": m.created_at.isoformat()
                }
                for m in messages
            ],
            "total": len(messages)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取消息失败: {str(e)}")


@router.delete("/sessions/{session_id}", summary="删除会话")
async def remove_session(
    session_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """删除指定会话及其消息"""
    try:
        # 验证会话属于当前用户
        session = await get_session_by_id(db, session_id)
        if not session:
            raise HTTPException(status_code=404, detail="会话不存在")
        if session.user_id != user.id:
            raise HTTPException(status_code=403, detail="无权删除此会话")

        success = await delete_session(db, session_id)
        if success:
            return {
                "code": 200,
                "message": "会话删除成功"
            }
        else:
            raise HTTPException(status_code=500, detail="删除失败")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"删除会话失败: {str(e)}")


# ==================== 聊天接口 ====================

@router.post("/chat", summary="AI 聊天")
async def set_chat(
    request: ChatRequest,
    user:User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    try:

        # 1.创建会话
        if request.session_id:
            # 获取会话的历史消息
            messages = await get_session_messages(db, request.session_id)
            history = [(msg.role, msg.content) for msg in messages]
            session_id = request.session_id
        else: #创建新会话
            session = await create_session(db, user.id)
            session_id = session.id
            history = None

        res = chat(
            question=request.question,
            use_rag=request.use_rag,
            k=request.k,
            history=history
        )
        answer = res['answer']
        source = res['sources']

        log = AIChatLog(
            user_id=user.id,
            question=request.question,
            answer=answer
        )
        db.add(log)
        await db.commit()
        await add_message(db, session_id, "user", request.question)
        await add_message(db, session_id, "assistant", answer)

        return {
            "code": 200,
            "message": "success",
            "data": {
                "answer": answer,
                "source": source,
                "session_id": session_id
            }
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"聊天失败：{str(e)}")

@router.post('/stream', summary='流式AI聊天')
async def set_stream_chat(
    request: ChatRequest,
    user:User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    async def generate():
        full_answer = ""  # 只存储回答内容
        thinking_content = ""  # 思考内容（不存数据库）
        try:

            # 1.创建会话
            if request.session_id:
                # 获取会话的历史消息
                messages = await get_session_messages(db, request.session_id)
                history = [(msg.role, msg.content) for msg in messages]
                session_id = request.session_id
            else: #创建新会话
                session = await create_session(db, user.id)
                session_id = session.id
                history = None

            # 先发送 session_id 给前端
            yield f"session_id:{session_id}\n\n"

            # 统一调用 stream_chat
            stream = stream_chat(
                question=request.question,
                use_rag=request.use_rag,
                k=request.k,
                history=history
            )

            async for chunk in stream:
                # 分开处理思考和回答
                if chunk.startswith('think:'):
                    thinking_content += chunk[6:]  # 去掉 think: 前缀
                elif chunk.startswith('think_start:') or chunk.startswith('think_end:'):
                    pass  # 标记不存储
                elif chunk.startswith('data:'):
                    content = chunk[5:]  # 去掉 data: 前缀
                    full_answer += content
                else:
                    full_answer += chunk
                yield f"{chunk}\n\n"

            # 只存储回答内容到数据库
            log = AIChatLog(
                user_id = user.id,
                question = request.question,
                answer = full_answer  # 只存回答，不存思考过程
            )
            db.add(log)
            await db.commit()
            await add_message(db, session_id, "user", request.question)
            await add_message(db, session_id, "assistant", full_answer)  # 只存回答

            logger.info(f"用户 {user.id} 流式聊天记录已保存")


        except Exception as e:
            logger.error(f"流式聊天失败: {str(e)}")
            await db.rollback()
            yield f"data: {{\"error\": \"{str(e)}\"}}\n\n"
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive"
        }
    )


@router.post("/advanced", summary="高级RAG聊天")
async def advanced_chat(
    request: AdvancedChatRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    高级 RAG 聊天接口
    
    支持：查询重写、混合检索、重排序
    """
    try:
        # 获取历史
        if request.session_id:
            messages = await get_session_messages(db, request.session_id)
            history = [(msg.role, msg.content) for msg in messages]
        else:
            history = None
        
        # 调用高级 RAG
        result = await advanced_rag_chat(
            question=request.question,
            k=request.k,
            history=history,
            use_rewrite=request.use_rewrite,
            use_hybrid=request.use_hybrid,
            use_rerank=request.use_rerank
        )
        
        # 保存对话
        if request.session_id:
            session_id = request.session_id
        else:
            session = await create_session(db, user.id)
            session_id = session.id
        
        await add_message(db, session_id, "user", request.question)
        await add_message(db, session_id, "assistant", result["answer"])
        
        return {
            "code": 200,
            "message": "success",
            "data": {
                "answer": result["answer"],
                "sources": result["sources"],
                "rewritten_query": result["rewritten_query"],
                "session_id": session_id
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"高级 RAG 聊天失败：{str(e)}")
        


@router.post('/advance_stream', summary='高级RAG流式聊天')
async def advanced_stream(
    request: AdvancedChatRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    async def generate():
        full_answer = ''  # 只存储回答内容
        thinking_content = ''  # 思考内容（不存数据库）
        try:
            # 获取或创建会话
            if request.session_id:
                messages = await get_session_messages(db, request.session_id)
                history = [(msg.role, msg.content) for msg in messages]
                session_id = request.session_id
            else:
                session = await create_session(db, user.id)
                session_id = session.id
                history = None

            # 先发送 session_id 给前端
            yield f"session_id:{session_id}\n\n"

            # 调用高级 RAG 流式
            result = advanced_rag_stream(
                question=request.question,
                k=request.k,
                history=history,
                use_rewrite=request.use_rewrite,
                use_hybrid=request.use_hybrid,
                use_rerank=request.use_rerank
            )
            async for chunk in result:
                # 分开处理思考和回答
                if chunk.startswith('think:'):
                    thinking_content += chunk[6:]
                elif chunk.startswith('think_start:') or chunk.startswith('think_end:'):
                    pass  # 标记不存储
                elif chunk.startswith('data:'):
                    content = chunk[5:]
                    full_answer += content
                else:
                    full_answer += chunk
                yield f"{chunk}\n\n"

            # 只保存回答内容
            await add_message(db, session_id, "user", request.question)
            await add_message(db, session_id, "assistant", full_answer)

            logger.info(f'用户 {user.id} 高级RAG流式聊天已保存')
        except Exception as e:
            logger.error(f"高级RAG流式聊天失败: {str(e)}")
            await db.rollback()
            yield f"data: {{\"error\": \"{str(e)}\"}}\n\n"
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive"
        }
    )


"""向量数据库的增删改查"""
class BatchDeleteRequest(BaseModel):
    """批量删除请求
    
    用于一次性删除多个文档
    """
    ids: List[str]  # 要删除的文档ID列表

# 上传
@router.post("/documents", summary='上传文档到向量数据库')
async def upload_document(
    file: UploadFile = File(..., description='要上传的文档'),
    chunk_size: int = Query(500, description="分块大小，默认500字符"),
    chunk_overlap: int = Query(50, description="分块重叠，默认50字符"),
    user: User = Depends(get_current_user)
):
    try:
        file_type = get_file_type(file.filename)

        supported_types = ["pdf", "txt", "docx", "md", "csv"]
        if file_type not in supported_types:
            raise HTTPException(
                status_code=400,
                detail=f"不支持的文件类型{file_type},支持的类型{supported_types}"
            )
        # 使用 tempfile 创建临时目录，确保文件会被自动清理
        with tempfile.NamedTemporaryFile(delete=False, suffix=f".{file_type}") as tmp:
            # 读取上传的文件内容并写入临时文件
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name  # 获取临时文件路径
        try:
            # 4. 加载并分块文档
            # 这一步会读取文件内容，按指定大小切分成多个块
            chunks = load_and_split(
                file_path=tmp_path,
                file_type=file_type,
                chunk_size=chunk_size,
                chunk_overlap=chunk_overlap
            )
            
            # 5. 为每个分块添加元数据
            # 元数据包含文件名、上传者等信息，方便后续管理
            for i, chunk in enumerate(chunks):
                chunk.metadata["source"] = file.filename  # 文件名
                chunk.metadata["uploader_id"] = user.id   # 上传者ID
                chunk.metadata["chunk_index"] = i         # 分块序号
            
            # 6. 添加到向量库
            # 将分块后的文档添加到 Chroma 向量数据库
            vectorstore = get_vectorstore()
            vectorstore.add_documents(chunks)
            
            return {
                "code": 200,
                "message": "文档上传成功",
                "data": {
                    "filename": file.filename,
                    "file_type": file_type,
                    "total_chunks": len(chunks),  # 分块总数
                    "chunk_size": chunk_size,
                    "chunk_overlap": chunk_overlap
                }
            }
            
        finally:
            # 7. 清理临时文件
            # 无论成功还是失败，都要删除临时文件
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
                
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"文档上传失败: {str(e)}")


# 获取文档列表 get
@router.get("/documents", summary='获取文档列表')
async def list_doucuments(
    limit: int = Query(10, ge=1, le=100, description='每页数量'),
    offset: int = Query(0, ge=0, description='偏移量'),
    user: User = Depends(get_current_user)
):
    try:
        result = await get_all_documents(limit=limit, offset=offset)
        return {
            "code": 200,
            "message": 'success',
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'获取文档列表失败: {str(e)}')
    
# 获取统计信息
@router.get("/documents/stats", summary="获取向量库统计信息")
async def get_stats(user: User = Depends(get_current_user)):
    """
    获取向量库的统计信息
    
    返回:
        文档总数、集合名称
    """
    try:
        stats = await get_collection_stats()
        return {
            "code": 200,
            "message": "success",
            "data": stats
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取统计信息失败: {str(e)}")
    
# 获取单个文档
@router.get("/documents/{doc_id}", summary="获取单个文档")
async def get_document(
    doc_id: str,
    user: User = Depends(get_current_user)
):
    """
    根据ID获取单个文档的详细内容
    
    参数:
        doc_id: 文档ID
    
    返回:
        文档ID、内容、元数据
    """
    try:
        doc = await get_document_by_id(doc_id)
        if not doc:
            raise HTTPException(status_code=404, detail="文档不存在")
        return {
            "code": 200,
            "message": "success",
            "data": doc
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取文档失败: {str(e)}")


# 删除单个文档
@router.delete("/documents/{doc_id}", summary="删除单个文档")
async def remove_document(
    doc_id: str,
    user: User = Depends(get_current_user)
):
    """
    根据ID删除单个文档
    
    参数:
        doc_id: 要删除的文档ID
    
    返回:
        删除成功信息
    """
    try:
        # 先检查文档是否存在
        doc = await get_document_by_id(doc_id)
        if not doc:
            raise HTTPException(status_code=404, detail="文档不存在")
        
        await delete_document(doc_id)
        return {
            "code": 200,
            "message": "文档删除成功",
            "data": {"deleted_id": doc_id}
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"删除文档失败: {str(e)}")
# 批量删除文档
@router.post("/documents/batch-delete", summary="批量删除文档")
async def batch_remove_documents(
    request: BatchDeleteRequest,
    user: User = Depends(get_current_user)
):
    """
    批量删除多个文档
    
    请求体:
        ids: 要删除的文档ID列表
    
    返回:
        删除的文档数量
    """
    try:
        if not request.ids:
            raise HTTPException(status_code=400, detail="请提供要删除的文档ID")
        
        await delete_documents(request.ids)
        return {
            "code": 200,
            "message": "批量删除成功",
            "data": {"deleted_count": len(request.ids)}
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"批量删除失败: {str(e)}")


# 清空所有文档
@router.delete("/documents/clear", summary="清空所有文档")
async def clear_all_documents(user: User = Depends(get_current_user)):
    """
    清空向量库中的所有文档
    
    警告: 此操作不可恢复！
    
    返回:
        清空成功信息
    """
    try:
        await clear_collection()
        return {
            "code": 200,
            "message": "向量库已清空",
            "data": None
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"清空失败: {str(e)}")


# ==================== 多模态聊天接口 ====================

# 支持的图片格式
IMAGE_TYPES = ["jpg", "jpeg", "png", "gif", "webp"]
# 支持的视频格式
VIDEO_TYPES = ["mp4", "avi", "mov", "mkv"]


@router.post("/multimodal/chat", summary="多模态聊天")
async def multimodal_chat_endpoint(
    file: UploadFile = File(..., description="图片或视频文件"),
    question: str = Form(..., description="用户问题"),
    session_id: Optional[int] = Form(None, description="会话ID，不传则创建新会话"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    上传图片/视频并提问

    支持的图片格式: jpg, jpeg, png, gif, webp
    支持的视频格式: mp4, avi, mov, mkv

    示例:
        上传图片 + 问题 "这张图片里有什么？"
        上传视频 + 问题 "视频中有几个人？"
    """
    try:
        # 1. 获取文件类型
        file_type = get_file_type(file.filename)

        # 2. 验证文件类型
        if file_type not in IMAGE_TYPES + VIDEO_TYPES:
            raise HTTPException(
                status_code=400,
                detail=f"不支持的文件类型: {file_type}。支持的格式: {IMAGE_TYPES + VIDEO_TYPES}"
            )

        # 3. 读取文件内容
        content = await file.read()

        # 4. 获取多模态服务实例
        multimodal = get_multimodal_chat()

        # 5. 获取或创建会话
        if session_id:
            # 获取已有会话的历史消息
            messages = await get_session_messages(db, session_id)
            history = [(msg.role, msg.content) for msg in messages]
            sid = session_id
        else:
            # 创建新会话
            session = await create_session(db, user.id)
            sid = session.id
            history = None

        # 6. 根据文件类型处理
        if file_type in IMAGE_TYPES:
            # 图片对话：直接转 base64
            image_base64 = base64.b64encode(content).decode()
            answer = await multimodal.chat_with_image(image_base64, question, history)

        else:
            # 视频对话：需要保存临时文件
            with tempfile.NamedTemporaryFile(delete=False, suffix=f".{file_type}") as tmp:
                tmp.write(content)
                tmp_path = tmp.name

            try:
                answer = await multimodal.chat_with_video(tmp_path, question)
            finally:
                # 清理临时文件
                if os.path.exists(tmp_path):
                    os.remove(tmp_path)

        # 7. 保存消息到会话
        await add_message(db, sid, "user", question)
        await add_message(db, sid, "assistant", answer)

        return {
            "code": 200,
            "message": "success",
            "data": {
                "answer": answer,
                "file_type": file_type,
                "session_id": sid
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"多模态聊天失败: {str(e)}")


@router.post("/multimodal/stream", summary="多模态流式聊天")
async def multimodal_stream_endpoint(
    file: UploadFile = File(..., description="图片或视频文件"),
    question: str = Form(..., description="用户问题"),
    session_id: Optional[int] = Form(None, description="会话ID"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    多模态流式聊天 (SSE)

    上传图片/视频后流式返回回答
    """
    # 1. 获取文件类型
    file_type = get_file_type(file.filename)

    # 2. 验证文件类型
    if file_type not in IMAGE_TYPES + VIDEO_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"不支持的文件类型: {file_type}"
        )

    # 3. 读取文件内容
    content = await file.read()

    # 4. 获取多模态服务实例
    multimodal = get_multimodal_chat()

    # 5. 获取或创建会话
    if session_id:
        messages = await get_session_messages(db, session_id)
        history = [(msg.role, msg.content) for msg in messages]
        sid = session_id
    else:
        session = await create_session(db, user.id)
        sid = session.id
        history = None

    async def generate():
        full_answer = ""
        try:
            # 先发送 session_id 给前端
            yield f"session_id:{sid}\n\n"

            if file_type in IMAGE_TYPES:
                # 图片流式对话
                image_base64 = base64.b64encode(content).decode()
                async for chunk in multimodal.stream_chat_with_image(image_base64, question, history):
                    full_answer += chunk
                    yield f"data:{chunk}\n\n"
            else:
                # 视频流式对话：需要保存临时文件
                with tempfile.NamedTemporaryFile(delete=False, suffix=f".{file_type}") as tmp:
                    tmp.write(content)
                    tmp_path = tmp.name

                try:
                    async for chunk in multimodal.stream_chat_with_video(tmp_path, question):
                        full_answer += chunk
                        yield f"data:{chunk}\n\n"
                finally:
                    if os.path.exists(tmp_path):
                        os.remove(tmp_path)

            # 保存消息到会话
            await add_message(db, sid, "user", question)
            await add_message(db, sid, "assistant", full_answer)
            logger.info(f"用户 {user.id} 多模态流式聊天已保存，会话ID: {sid}")

        except Exception as e:
            logger.error(f"多模态流式聊天失败: {str(e)}")
            await db.rollback()
            yield f"data: {{\"error\": \"{str(e)}\"}}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive"
        }
    )

