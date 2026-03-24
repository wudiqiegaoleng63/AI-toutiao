from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, ConfigDict


# 共用新闻模型类
class NewsItemBase(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    image: Optional[str] = None
    author: Optional[str] = None
    publish_time: Optional[datetime] = Field(None, alias="publishedTime")
    category_id: int = Field(alias="categoryId")
    views: int

    model_config = ConfigDict(
        from_attributes=True,  # 支持ORM模型直接转换
        populate_by_name=True  # 兼容字段名/别名赋值
    )