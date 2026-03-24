from datetime import datetime
from sqlalchemy import String, Integer, Text, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, DeclarativeBase
from models.users import User
from typing import Optional

class Base(DeclarativeBase):
    pass

class AIChatLog(Base):
    __tablename__ = "ai_chat_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey(User.id), nullable=False)
    question: Mapped[str] = mapped_column(Text, nullable=False, comment="用户问题")
    answer: Mapped[str] = mapped_column(Text, nullable=False, comment="AI回复")
    created_at: Mapped[datetime] = mapped_column(
        DateTime, 
        default=datetime.now, 
        comment="创建时间"
    )
    def __repr__(self):
        return f"<AIChatLog(id={self.id}, user_id={self.user_id})>"


class ChatSession(Base):

    __tablename__ = "chat_session"

    id: Mapped[int] = mapped_column(Integer , primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey(User.id), nullable=False )
    title: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)  #可选标题
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.now,
        comment="创建时间"
    )
    def __repr__(self):
        return f"<ChatSession(id={self.id}, user_id={self.user_id}, title={self.title})>"


class ChatMessage(Base):
    """聊天消息"""
    __tablename__ = "chat_message"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[int] = mapped_column(Integer, ForeignKey("chat_session.id"), nullable=False, comment="会话ID")
    role: Mapped[str] = mapped_column(String(20), nullable=False, comment="角色: user/assistant")
    content: Mapped[str] = mapped_column(Text, nullable=False, comment="消息内容")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, comment="创建时间")

    def __repr__(self):
        return f"<ChatMessage(id={self.id}, session_id={self.session_id}, role={self.role})>"
    