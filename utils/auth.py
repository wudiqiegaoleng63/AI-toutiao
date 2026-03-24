# 整合 token 查询用户
from fastapi import Header, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from starlette import status

from config.db_conf import get_db
from crud import users


async def get_current_user(
        authorization: str = Header(..., alias='Authorization'),
        db: AsyncSession = Depends(get_db)):

    # 兼容 "Bearer token" 和 "token" 两种格式
    if " " in authorization:
        token = authorization.split(" ")[1]
    else:
        token = authorization

    user = await users.get_user_by_token(db, token)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='无效令牌或已过期')
    return user