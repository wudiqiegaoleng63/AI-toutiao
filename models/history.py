from datetime import datetime

from sqlalchemy import Index, Integer, ForeignKey, DateTime, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

from models.news import News
from models.users import User


# 基类
class Base(DeclarativeBase):
    pass


# 浏览历史
class History(Base):
    """
    历史浏览表ORM模型
    """
    __tablename__ = 'history'

    # 创建索引
    # UniqueConstraint: 唯一约束，当前用户，当前新闻的浏览历史只保留一次
    __table_args__ = (
        Index('fk_history_user_idx', 'user_id'),
        Index('fk_history_news_idx', 'news_id'),
        Index('idx_view_time', 'view_time')
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, comment="历史ID")
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey(User.id), nullable=False, comment="用户ID")
    news_id: Mapped[int] = mapped_column(Integer, ForeignKey(News.id), nullable=False, comment="新闻ID")
    view_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.utcnow(), nullable=False,
                                                comment="浏览时间")

    def __repr__(self):
        return f"<History(id={self.id}, user_id={self.user_id}, news_id={self.news_id}, view_time={self.view_time})>"