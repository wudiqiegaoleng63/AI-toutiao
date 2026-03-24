import logging
from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

from routers import news, users, favorite, history
from utils.exception_handlers import register_exception_handlers
import new_aichat
from new_aichat.services.reranker import get_reranker

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI()

#注册异常

register_exception_handlers(app)


#跨域问题
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],#允许的源
    allow_credentials=True,#cookie
    allow_methods=["*"],#请求方法
    allow_headers=["*"],#请求头
)


#挂载，把路由注入类似 include_router(文件.router)

@app.get("/")
async def root():
    return {"message": "Hello World"}


@app.get("/hello/{name}")
async def say_hello(name: str):
    return {"message": f"Hello {name}"}


@app.on_event("startup")
async def startup_event():
    """应用启动时预加载模型"""
    logger.info("=" * 50)
    logger.info("正在预加载模型...")
    logger.info("=" * 50)
    # 预加载重排序模型
    get_reranker()
    logger.info("=" * 50)
    logger.info("模型预加载完成！")
    logger.info("=" * 50)


app.include_router(news.router)
app.include_router(users.router)
app.include_router(favorite.router)
app.include_router(history.router)
app.include_router(new_aichat.router)
# app.include_router(ai_chat_router)