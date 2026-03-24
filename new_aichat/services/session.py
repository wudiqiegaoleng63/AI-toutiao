from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from ..models import ChatSession, ChatMessage
# from fastapi import Depends
# from ..config import get_db


# 创建新会话
async def create_session(
        db: AsyncSession,
        user_id: int,
        title: Optional[str] = None
) -> ChatSession:
    session = ChatSession(user_id=user_id, title=title)
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session

# 获取用户的所有会话



async def get_user_session(
        db: AsyncSession,
        user_id: int
) -> List[ChatSession]:
    result = await db.execute(
        select(ChatSession).where(ChatSession.user_id == user_id).order_by(
            ChatSession.created_at.desc()
        )
    )
    return result.scalars().all()

# 添加消息到会话

async def add_message(
        db: AsyncSession,
        session_id: int,
        role: str,
        content: str
) -> ChatMessage:
    message = ChatMessage(session_id=session_id, role=role, content=content )
    db.add(message)
    await db.commit()
    await db.refresh(message)
    return message


async def get_session_messages(db: AsyncSession, session_id: int, limit: int = 10) -> List[ChatMessage]:
    """获取会话的消息历史"""
    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at.asc())
        .limit(limit)
    )
    return result.scalars().all()


async def get_session_by_id(db: AsyncSession, session_id: int) -> Optional[ChatSession]:
    """根据ID获取会话"""
    result = await db.execute(
        select(ChatSession).where(ChatSession.id == session_id)
    )
    return result.scalar_one_or_none()


async def delete_session(db: AsyncSession, session_id: int) -> bool:
    """删除会话及其消息"""
    session = await get_session_by_id(db, session_id)
    if not session:
        return False

    # 删除会话的消息
    from sqlalchemy import delete
    await db.execute(
        delete(ChatMessage).where(ChatMessage.session_id == session_id)
    )
    # 删除会话
    await db.delete(session)
    await db.commit()
    return True


async def update_session_title(db: AsyncSession, session_id: int, title: str) -> Optional[ChatSession]:
    """更新会话标题"""
    session = await get_session_by_id(db, session_id)
    if not session:
        return None
    session.title = title
    await db.commit()
    await db.refresh(session)
    return session




