# AI头条后端系统

基于 FastAPI 的新闻资讯后端系统，集成高级 RAG（检索增强生成）智能问答功能。

## 项目简介

本项目是一个完整的新闻资讯后端系统，提供用户管理、新闻浏览、收藏历史等功能，并集成了基于 RAG 的 AI 智能问答系统，支持普通聊天、RAG 检索增强、多模态对话等功能。

## 功能特性

### 核心功能
- **用户系统**：注册、登录、用户信息管理、密码修改
- **新闻系统**：新闻列表、详情、分类浏览、相关推荐
- **收藏/历史**：用户收藏和浏览历史记录

### AI 聊天系统
- **普通聊天**：基于 LLM 的智能对话
- **RAG 聊天**：检索增强生成，基于新闻库回答问题
- **流式响应**：SSE 实时流式输出
- **高级 RAG**：查询重写 + 混合检索 + 重排序
- **多模态聊天**：图片/视频理解对话
- **会话管理**：多轮对话历史记录

### 向量文档管理
- 文档上传（支持 PDF、TXT、DOCX、MD、CSV）
- 文档列表查询
- 批量删除、清空

## 技术栈

| 类别 | 技术 |
|------|------|
| Web框架 | FastAPI + Uvicorn |
| 数据库 | MySQL (aiomysql + SQLAlchemy 异步) |
| LLM | 阿里云 GLM-5 (灵积 API) |
| 向量库 | ChromaDB |
| Embedding | Qwen3-Embedding (Ollama) |
| Reranker | Qwen3-Reranker-0.6B (生成式，yes/no打分) |
| RAG框架 | LangChain |

## 项目结构

```
toutiao_backend/
├── main.py                 # FastAPI 入口
├── requirements.txt        # 依赖列表
├── config/                 # 配置
│   ├── db_conf.py         # 数据库配置
│   └── cache_conf.py      # 缓存配置
├── models/                 # SQLAlchemy 模型
│   ├── users.py           # 用户模型
│   ├── news.py            # 新闻模型
│   ├── favorite.py        # 收藏模型
│   └── history.py         # 历史模型
├── schemas/                # Pydantic 请求/响应模型
│   ├── users.py
│   ├── favorite.py
│   └── history.py
├── routers/                # API 路由
│   ├── users.py           # 用户接口
│   ├── news.py            # 新闻接口
│   ├── favorite.py        # 收藏接口
│   └── history.py         # 历史接口
├── crud/                   # 数据库 CRUD 操作
│   ├── users.py
│   ├── news_cache.py
│   ├── favorite.py
│   └── history.py
├── utils/                  # 工具函数
│   ├── auth.py            # token 认证
│   ├── security.py        # 密码加密
│   ├── response.py        # 统一响应
│   └── exception.py       # 异常定义
├── new_aichat/            # AI聊天模块
│   ├── __init__.py
│   ├── router.py          # AI聊天路由
│   ├── models.py          # 会话模型
│   ├── config.py          # AI配置
│   ├── services/
│   │   ├── rag.py         # RAG 服务
│   │   ├── embeddings.py  # Embedding 服务
│   │   ├── vectorstore.py # 向量库服务
│   │   ├── hybrid_search.py # 混合检索
│   │   ├── reranker.py    # 重排序
│   │   ├── session.py     # 会话管理
│   │   ├── multimodal.py  # 多模态聊天
│   │   └── documents_loader.py # 文档加载
│   └── scripts/
│       ├── load_news.py   # 新闻导入脚本
│       ├── view_chroma.py # 查看向量库
│       └── evaluate_rag.py # RAG 评估脚本
└── react_fronted/         # React 前端项目
```

## 快速开始

### 环境要求

- Python 3.10+
- MySQL 8.0+
- Ollama (用于本地 Embedding)
- Conda (推荐)

### 安装步骤

1. **克隆项目**
```bash
git clone <repository-url>
cd toutiao_backend
```

2. **创建虚拟环境**
```bash
conda create -n FastAPI python=3.10
conda activate FastAPI
```

3. **安装依赖**
```bash
pip install -r requirements.txt
```

4. **配置环境变量**

创建 `.env` 文件：
```env
DATABASE_URL=mysql+aiomysql://root:password@127.0.0.1:3306/news_app?charset=utf8mb4
OLLAMA_BASE_URL=http://localhost:11434/v1
OLLAMA_API_KEY=ollama
RERANKER_MODEL_PATH=/path/to/Qwen3-Reranker-0.6B
```

5. **初始化数据库**
```bash
# 创建数据库
mysql -u root -p -e "CREATE DATABASE news_app CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 创建会话表
python -m new_aichat.scripts.create_session_tables
```

6. **启动 Ollama**
```bash
# 安装 Ollama 后拉取模型
ollama pull qwen3-embedding:0.6b
```

7. **运行服务**
```bash
uvicorn main:app --reload --port 8000
```

## API 文档

启动服务后访问：
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### 用户模块 `/api/users`

| 接口 | 方法 | 说明 | 认证 |
|------|------|------|------|
| `/register` | POST | 用户注册 | 否 |
| `/login` | POST | 用户登录 | 否 |
| `/info` | GET | 获取用户信息 | 是 |
| `/update` | PUT | 更新用户信息 | 是 |
| `/password` | PUT | 修改密码 | 是 |

### 新闻模块 `/api/news`

| 接口 | 方法 | 说明 | 认证 |
|------|------|------|------|
| `/categories` | GET | 获取分类列表 | 否 |
| `/list` | GET | 获取新闻列表 (分页) | 否 |
| `/detail` | GET | 获取新闻详情 | 否 |

### AI 聊天模块 `/api/aichat`

| 接口 | 方法 | 说明 | 认证 |
|------|------|------|------|
| `/chat` | POST | 普通聊天 / RAG 聊天 | 是 |
| `/stream` | POST | 流式聊天 (SSE) | 是 |
| `/advanced` | POST | 高级 RAG 聊天 | 是 |
| `/advance_stream` | POST | 高级 RAG 流式 (SSE) | 是 |
| `/sessions` | GET | 获取会话列表 | 是 |
| `/sessions` | POST | 创建新会话 | 是 |
| `/sessions/{id}/messages` | GET | 获取会话消息 | 是 |
| `/sessions/{id}` | DELETE | 删除会话 | 是 |
| `/multimodal/chat` | POST | 多模态聊天 | 是 |
| `/multimodal/stream` | POST | 多模态流式聊天 | 是 |
| `/documents` | GET | 获取文档列表 | 是 |
| `/documents` | POST | 上传文档 | 是 |
| `/documents/{id}` | DELETE | 删除文档 | 是 |
| `/documents/stats` | GET | 获取向量库统计 | 是 |

### 请求示例

**登录获取 Token**
```bash
curl -X POST http://localhost:8000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"123456"}'
```

**RAG 聊天**
```bash
curl -X POST http://localhost:8000/api/aichat/chat \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"question":"有什么AI相关的新闻？","use_rag":true,"k":3}'
```

**流式聊天 (SSE)**
```bash
curl -N -X POST http://localhost:8000/api/aichat/stream \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"question":"你好","use_rag":false}'
```

**高级 RAG 聊天**
```bash
curl -X POST http://localhost:8000/api/aichat/advanced \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"question":"Qwen3模型有什么特点？","k":5,"use_rewrite":true,"use_hybrid":true,"use_rerank":true}'
```

## RAG 系统说明

### 普通 RAG

```
用户问题 → 向量检索 (ChromaDB) → 拼接上下文 → LLM 生成回答
```

**特点**：
- 速度快 (~0.07s 检索)
- 实现简单
- 适合简单关键词查询

### 高级 RAG

```
用户问题 → 查询重写 → 混合检索 (向量+BM25) → 重排序 → LLM 生成回答
```

**各阶段说明**：

| 阶段 | 技术 | 时间 | 说明 |
|------|------|------|------|
| 查询重写 | LLM | ~0.5s | 根据历史重写问题，使其更完整 |
| 混合检索 | 向量 + BM25 | ~0.07s | 结合语义检索和关键词检索 |
| 重排序 | Qwen3-Reranker | ~2s | 生成式 yes/no 打分，精排文档 |

**适用场景**：
- 复杂/长尾问题
- 对准确性要求高的场景
- 需要多轮对话的场景

### 性能对比

| 指标 | 普通 RAG | 高级 RAG |
|------|----------|----------|
| 平均检索时间 | ~0.07s | ~2.5s (含重排序) |
| 平均检索质量 | 63.1分 | 65.1分 |
| 质量提升 | 基准 | +2.0分 |

详细评估报告见 [RAG_EVALUATION_REPORT.md](RAG_EVALUATION_REPORT.md)

## 数据库设计

### 用户表 `users`
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT | 主键 |
| username | VARCHAR(50) | 用户名 |
| password | VARCHAR(255) | 密码 (bcrypt) |
| nickname | VARCHAR(50) | 昵称 |
| avatar | VARCHAR(255) | 头像 URL |
| created_at | DATETIME | 创建时间 |

### 新闻表 `news`
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT | 主键 |
| title | VARCHAR(255) | 标题 |
| content | TEXT | 内容 |
| image | VARCHAR(255) | 封面图 |
| author | VARCHAR(50) | 作者 |
| category_id | INT | 分类 ID |
| views | INT | 浏览量 |
| publish_time | DATETIME | 发布时间 |

### 会话表 `chat_session`
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT | 主键 |
| user_id | INT | 用户 ID |
| title | VARCHAR(100) | 会话标题 |
| created_at | DATETIME | 创建时间 |

### 消息表 `chat_message`
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT | 主键 |
| session_id | INT | 会话 ID |
| role | VARCHAR(20) | 角色 (user/assistant) |
| content | TEXT | 消息内容 |
| created_at | DATETIME | 创建时间 |

## 脚本工具

### 新闻导入脚本
```bash
python -m new_aichat.scripts.load_news
```
将新闻数据导入 Chroma 向量库。

### 查看向量库
```bash
python -m new_aichat.scripts.view_chroma
```
查看 Chroma 向量库中的文档内容。

### RAG 性能评估
```bash
python -m new_aichat.scripts.evaluate_rag
```
对比普通 RAG 和高级 RAG 的检索质量，生成评估报告。