"""
创建多轮对话所需的数据库表
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

import asyncio
from sqlalchemy import text
from config.db_conf import async_engine
from new_aichat.models import ChatSession, ChatMessage


async def create_tables():
    """创建 chat_session 和 chat_message 表"""
    async with async_engine.begin() as conn:
        # 创建 chat_session 表
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS chat_session (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT UNSIGNED NOT NULL,
                title VARCHAR(100) DEFAULT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES user(id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """))

        # 创建 chat_message 表
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS chat_message (
                id INT AUTO_INCREMENT PRIMARY KEY,
                session_id INT NOT NULL,
                role VARCHAR(20) NOT NULL,
                content TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (session_id) REFERENCES chat_session(id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """))

    print("Tables created successfully!")
    print("  - chat_session")
    print("  - chat_message")


if __name__ == "__main__":
    asyncio.run(create_tables())