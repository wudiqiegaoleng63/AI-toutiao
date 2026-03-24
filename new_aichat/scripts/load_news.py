"""
新闻数据导入脚本

把 MySQL 中的新闻数据导入到 Chroma 向量库
"""
import asyncio
from sqlalchemy import select
from config.db_conf import AsyncSessionLocal
from models.news import News
from new_aichat.services.vectorstore import add_news_documents


async def load_news_to_chroma(batch_size: int = 5):
    """
    把新闻数据加载到 Chroma 向量库

    参数:
        batch_size: 每批处理的新闻数量
    """
    print("开始加载新闻数据到 Chroma...")

    async with AsyncSessionLocal() as db:
        # 1. 查询所有新闻
        stmt = select(News)
        result = await db.execute(stmt)
        news_list = result.scalars().all()

        total = len(news_list)
        print(f"共找到 {total} 条新闻")

        # 2. 分批处理
        for i in range(0, total, batch_size):
            batch = news_list[i:i + batch_size]

            # 准备数据
            texts = []
            metadatas = []

            for news in batch:
                # 组合标题和内容作为文本
                text = f"标题：{news.title}\n内容：{news.content}"
                texts.append(text)

                # 元数据：存储新闻 ID 和标题
                metadatas.append({
                    "news_id": news.id,
                    "title": news.title,
                    "category_id": news.category_id
                })

            # 添加到向量库
            add_news_documents(texts, metadatas)

            print(f"已处理 {i + len(batch)}/{total} 条新闻")

        print("新闻数据加载完成！")


if __name__ == "__main__":
    asyncio.run(load_news_to_chroma())