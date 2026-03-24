"""
查看 Chroma 向量数据库内容
"""
from langchain_chroma import Chroma
from langchain_ollama import OllamaEmbeddings

# 连接数据库
print("连接 Chroma 数据库...")

embeddings = OllamaEmbeddings(
    base_url="http://localhost:11434",
    model="qwen3-embedding:0.6b"
)

vectorstore = Chroma(
    collection_name='news_store',
    persist_directory='./chroma_db',
    embedding_function=embeddings
)

# 查看总数
count = vectorstore._collection.count()
print(f"\n[总数] 文档数: {count}")

# 获取部分数据
print("\n[预览] 前 5 条数据:")
print("-" * 50)

# 获取集合中的数据
collection = vectorstore._collection
result = collection.get(limit=5, include=["documents", "metadatas"])

for i, (doc, meta) in enumerate(zip(result["documents"], result["metadatas"])):
    print(f"\n【文档 {i+1}】")
    print(f"内容摘要: {doc[:100]}...")
    print(f"元数据: {meta}")

# 检索测试
print("\n" + "=" * 50)
print("[检索测试] 搜索: '科技新闻'")
print("-" * 50)

results = vectorstore.similarity_search("科技新闻", k=3)
for i, doc in enumerate(results):
    print(f"\n【结果 {i+1}】")
    print(f"内容: {doc.page_content[:150]}...")
    print(f"元数据: {doc.metadata}")