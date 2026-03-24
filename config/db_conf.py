import os
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

# 加载环境变量
load_dotenv()

# 数据库 URL（从环境变量读取）
ASYNC_DATABASE_URL = os.getenv(
    'DATABASE_URL',
    'mysql+aiomysql://root:password@127.0.0.1:3306/news_app?charset=utf8mb4'
)

# 创建异步引擎
async_engine = create_async_engine(
    ASYNC_DATABASE_URL,
    echo=False,  # 生产环境关闭 SQL 日志
    pool_size=10,
    max_overflow=20,
)

# 创建异步工厂
AsyncSessionLocal = async_sessionmaker(
    async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


# 获取会话
async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()