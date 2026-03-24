"""
多模态聊天服务：支持图片和视频的实时对话

功能：
1. 图片对话：上传图片后直接提问，模型实时理解并回答
2. 视频对话：提取关键帧后分析视频内容
3. 流式输出：支持 SSE 流式返回回答
"""

import base64
import cv2
import asyncio
from typing import List, Optional
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI

from ..config import OLLAMA_API_KEY, OLLAMA_BASE_URL, LLM_MODEL_NAME


class MultimodalChat:
    """
    多模态聊天服务类

    使用 qwen3-vl:2b 视觉语言模型，支持图片和视频理解
    """

    def __init__(self):
        """
        初始化多模态聊天服务

        使用 OpenAI 兼容接口连接 Ollama 的 VL 模型
        """
        self.llm = ChatOpenAI(
            base_url=OLLAMA_BASE_URL,      # Ollama API 地址
            api_key=OLLAMA_API_KEY,        # API Key (Ollama 任意值即可)
            model=LLM_MODEL_NAME,          # qwen3-vl:2b 视觉模型
            temperature=0.2                # 降低随机性，回答更稳定
        )

    # ==================== 图片对话 ====================

    async def chat_with_image(
        self,
        image_base64: str,
        question: str,
        history: Optional[List] = None
    ) -> str:
        """
        图片对话（非流式）

        参数:
            image_base64: 图片的 base64 编码
            question: 用户问题
            history: 对话历史 (可选)

        返回:
            模型的回答文本
        """
        # 1. 构建系统消息
        messages = [
            SystemMessage(content="你是一个视觉助手，请根据图片内容准确回答问题。")
        ]

        # 2. 添加历史对话（如果有）
        if history:
            messages.extend(history)

        # 3. 构建用户消息：文本 + 图片
        messages.append(HumanMessage(content=[
            {"type": "text", "text": question},
            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_base64}"}}
        ]))

        # 4. 调用模型并返回结果
        response = self.llm.invoke(messages)
        return response.content

    async def stream_chat_with_image(
        self,
        image_base64: str,
        question: str,
        history: Optional[List] = None
    ):
        """
        图片对话（流式输出）

        参数:
            image_base64: 图片的 base64 编码
            question: 用户问题
            history: 对话历史 (可选)

        生成:
            逐块返回回答内容 (async generator)
        """
        # 1. 构建系统消息
        messages = [
            SystemMessage(content="你是一个视觉助手，请根据图片内容准确回答问题。")
        ]

        # 2. 添加历史对话
        if history:
            messages.extend(history)

        # 3. 构建用户消息
        messages.append(HumanMessage(content=[
            {"type": "text", "text": question},
            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_base64}"}}
        ]))

        # 4. 流式输出
        in_thinking = False
        async for chunk in self.llm.astream(messages):
            content = chunk.content
            if not content:
                continue

            # 检测思考标签
            if '<tool_call>' in content:
                in_thinking = True
                yield "think_start:"
                content = content.replace('<tool_call>', '')

            if in_thinking and '*/}' in content:
                in_thinking = False
                content = content.replace('*/}', '')
                if content.strip():
                    yield f"think:{content}"
                yield "think_end:"
                continue

            if in_thinking:
                if content.strip():
                    yield f"think:{content}"
            else:
                if content.strip():
                    yield f"data:{content}"

    # ==================== 视频对话 ====================

    def extract_frames(self, video_path: str, max_frames: int = 8) -> List[str]:
        """
        从视频中均匀提取关键帧

        参数:
            video_path: 视频文件路径
            max_frames: 最大提取帧数 (默认 8 帧)

        返回:
            关键帧的 base64 编码列表
        """
        # 1. 打开视频文件
        cap = cv2.VideoCapture(video_path)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

        # 2. 计算采样间隔（均匀采样）
        interval = max(1, total_frames // max_frames)

        frames = []
        for i in range(max_frames):
            # 3. 跳转到指定帧位置
            cap.set(cv2.CAP_PROP_POS_FRAMES, i * interval)
            ret, frame = cap.read()

            if not ret:
                break  # 读取失败，结束

            # 4. 编码为 JPEG 并转 base64
            _, buffer = cv2.imencode('.jpg', frame)
            frame_base64 = base64.b64encode(buffer).decode()
            frames.append(frame_base64)

        # 5. 释放资源
        cap.release()
        return frames

    async def chat_with_video(
        self,
        video_path: str,
        question: str,
        max_frames: int = 8
    ) -> str:
        """
        视频对话（非流式）

        参数:
            video_path: 视频文件路径
            question: 用户问题
            max_frames: 提取的最大帧数

        返回:
            模型的回答文本
        """
        # 1. 提取关键帧
        frames = self.extract_frames(video_path, max_frames)

        # 2. 构建消息内容：文本 + 多个图片帧
        content = [
            {"type": "text", "text": f"这是视频的 {len(frames)} 个关键帧。问题：{question}"}
        ]

        # 3. 添加所有帧
        for frame in frames:
            content.append({
                "type": "image_url",
                "image_url": {"url": f"data:image/jpeg;base64,{frame}"}
            })

        # 4. 构建消息
        messages = [
            SystemMessage(content="你是一个视频分析助手，根据提供的视频关键帧回答问题。请综合分析所有帧的内容。"),
            HumanMessage(content=content)
        ]

        # 5. 调用模型
        response = self.llm.invoke(messages)
        return response.content

    async def stream_chat_with_video(
        self,
        video_path: str,
        question: str,
        max_frames: int = 8
    ):
        """
        视频对话（流式输出）

        参数:
            video_path: 视频文件路径
            question: 用户问题
            max_frames: 提取的最大帧数

        生成:
            逐块返回回答内容
        """
        # 1. 提取关键帧
        frames = self.extract_frames(video_path, max_frames)

        # 2. 构建消息内容
        content = [
            {"type": "text", "text": f"这是视频的 {len(frames)} 个关键帧。问题：{question}"}
        ]

        for frame in frames:
            content.append({
                "type": "image_url",
                "image_url": {"url": f"data:image/jpeg;base64,{frame}"}
            })

        # 3. 构建消息
        messages = [
            SystemMessage(content="你是一个视频分析助手，根据提供的视频关键帧回答问题。请综合分析所有帧的内容。"),
            HumanMessage(content=content)
        ]

        # 4. 流式输出
        in_thinking = False
        async for chunk in self.llm.astream(messages):
            content = chunk.content
            if not content:
                continue

            # 检测思考标签
            if '<tool_call>' in content:
                in_thinking = True
                yield "think_start:"
                content = content.replace('<tool_call>', '')

            if in_thinking and '*/}' in content:
                in_thinking = False
                content = content.replace('*/}', '')
                if content.strip():
                    yield f"think:{content}"
                yield "think_end:"
                continue

            if in_thinking:
                if content.strip():
                    yield f"think:{content}"
            else:
                if content.strip():
                    yield f"data:{content}"


# ==================== 单例实例 ====================

_multimodal_chat = None


def get_multimodal_chat() -> MultimodalChat:
    """
    获取多模态聊天服务实例（单例模式）

    返回:
        MultimodalChat 实例
    """
    global _multimodal_chat
    if _multimodal_chat is None:
        _multimodal_chat = MultimodalChat()
    return _multimodal_chat