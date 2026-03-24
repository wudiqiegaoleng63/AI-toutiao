"""
修复 ai_chat_log 表的字符集问题

将 utf8 改为 utf8mb4 以支持 emoji 表情符号
"""
import sys
import os
# 添加项目根目录到 Python 路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

import asyncio
from sqlalchemy import text
from config.db_conf import AsyncSessionLocal


async def fix_charset():
    """修复数据库表字符集"""
    async with AsyncSessionLocal() as db:
        # 修改表的字符集
        sql = text("""
            ALTER TABLE ai_chat_log
            CONVERT TO CHARACTER SET utf8mb4
            COLLATE utf8mb4_unicode_ci
        """)

        await db.execute(sql)
        await db.commit()
        print("✅ ai_chat_log 表字符集已修改为 utf8mb4")

        # 验证修改
        verify_sql = text("""
            SELECT TABLE_NAME, TABLE_COLLATION
            FROM information_schema.TABLES
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ai_chat_log'
        """)
        result = await db.execute(verify_sql)
        row = result.fetchone()
        print(f"验证结果: {row}")


if __name__ == "__main__":
    asyncio.run(fix_charset())