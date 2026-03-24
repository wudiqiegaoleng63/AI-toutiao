from fastapi import APIRouter, HTTPException
from fastapi.params import Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from config.db_conf import get_db
from crud import news_cache
from models.news import News

#AIPRouter实例
router = APIRouter(prefix="/api/news", tags=["news"])

@router.get("/categories")
async def get_categories(skip: int = 0, limit: int = 10, db: AsyncSession = Depends(get_db)):
    categories = await news_cache.get_categories(db, skip=skip, limit=limit)
    return {
        "code": 200,
        "message": "success",
        "data": categories
    }

@router.get("/list")
async def get_news_list(
        category_id: int = Query(..., alias="categoryId"),
        page: int = Query(1, alias="page"),
        page_size: int = Query(10, alias="pageSize", le=100),
        db: AsyncSession = Depends(get_db)
):
    offset = (page - 1) * page_size
    news_list = await news_cache.get_news_list(db,category_id, offset, page_size)
    total = await news_cache.get_news_count(db, category_id)
    #跳过的 + 当前列表数量 《总数
    has_more = (offset + len(news_list)) < total
    return {
        "code": 200,
        "message": "success",
        "data": {
            'list': news_list,
            'total': total,
            'hasMore': has_more,
        }
    }

@router.get("/detail")
async def get_news_detail(news_id: int = Query(...,alias='id'), db: AsyncSession = Depends(get_db)):
    #获取新闻详情 + 浏览量+1 + 相关新闻
    news_detail = await news_cache.get_news_detail(db, news_id)
    if news_detail is None:
        raise HTTPException(status_code=404, detail='新闻不存在')

    view_result = await news_cache.increase_news_views(db, news_id)
    if view_result is None:
        raise HTTPException(status_code=404, detail='浏览量更新失败')

    related_news = await news_cache.get_related_news(db, news_id,news_detail.category_id)
    return {
    "code": 200,
    "message": "success",
    "data": {
        "id": news_detail.id,
        "title": news_detail.title,
        "content": news_detail.content,
        "image": news_detail.image,
        "author": news_detail.author,
        "publishTime": news_detail.publish_time,
        "categoryId": news_detail.category_id,
        "views": news_detail.views,
        "relatedNews": related_news,
    }
}
