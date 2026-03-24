"""
文档加载服务：支持多种格式的文档加载和分块
"""
import os
import tempfile
from typing import List
from langchain_core.documents import Document
from langchain_community.document_loaders import (
    PyPDFLoader,
    TextLoader,
    Docx2txtLoader,
    UnstructuredMarkdownLoader,
    CSVLoader,
)
from langchain_text_splitters import RecursiveCharacterTextSplitter


# 根据文档选择加载器
def get_loader(file_path: str, file_type: str):
    """
    根据文件类型选择对应的加载器

    参数:
        file_path: 文件路径
        file_type: 文件类型 (pdf, txt, docx, md, csv)

    返回:
        对应的 LangChain 文档加载器实例
    """

    # 不同文件类型的加载器映射
    # TextLoader 需要指定 encoding='utf-8'，避免 Windows 上编码问题
    loaders = {
        "pdf": PyPDFLoader,
        "txt": lambda path: TextLoader(path, encoding='utf-8'),  # 指定 UTF-8 编码
        "docx": Docx2txtLoader,
        "md": UnstructuredMarkdownLoader,
        "csv": CSVLoader
    }

    loader_factory = loaders.get(file_type)

    if not loader_factory:
        raise ValueError(f"不支持的文档类型: {file_type}")

    # 返回加载器实例
    return loader_factory(file_path)


# 加载文档并且分块

def load_and_split(
        file_path: str,
        file_type: str,
        chunk_size: int = 500,
        chunk_overlap: int = 50
):
    """
    加载文档并分块
    
    参数:
        file_path: 文件路径
        file_type: 文件类型
        chunk_size: 分块大小
        chunk_overlap: 分块重叠
    
    返回:
        分块后的文档列表
    """

    # 1.加载
    loader = get_loader(file_path, file_type)
    documents = loader.load()

    # 2.分块

    text_spliter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=["\n\n", "\n", "。", "！", "？", "；", "，", " ", ""]
    )

    chunks = text_spliter.split_documents(documents)
    return chunks


# 获取文件类型
def get_file_type(filename:str):
    ext = os.path.splitext(filename)[1].lower().replace(".", "")
    return ext
