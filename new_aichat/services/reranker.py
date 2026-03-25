"""
重排序服务：使用本地 Qwen3-Reranker 模型
参考: https://huggingface.co/Qwen/Qwen3-Reranker-0.6B
"""
import os
from typing import List
from langchain_core.documents import Document
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

# 从环境变量读取模型路径
RERANKER_MODEL_PATH = os.getenv(
    'RERANKER_MODEL_PATH',
    r"E:\qwen\Qwen3-Reranker-0___6B"
)


class Reranker:
    def __init__(self):
        """初始化 - 使用本地 Qwen3-Reranker-0.6B 模型"""
        print(f"正在加载本地重排序模型: {RERANKER_MODEL_PATH}...")

        self.tokenizer = AutoTokenizer.from_pretrained(RERANKER_MODEL_PATH, padding_side='left', trust_remote_code=True)
        self.model = AutoModelForCausalLM.from_pretrained(RERANKER_MODEL_PATH, trust_remote_code=True).eval()

        # yes/no token ids for scoring
        self.token_true_id = self.tokenizer.convert_tokens_to_ids("yes")
        self.token_false_id = self.tokenizer.convert_tokens_to_ids("no")
        self.max_length = 2048

        # Prompt prefix and suffix
        self.prefix = "<|im_start|>system\nJudge whether the Document meets the requirements based on the Query and the Instruct provided. Note that the answer can only be \"yes\" or \"no\".<|im_end|>\n<|im_start|>user\n"
        self.suffix = "<|im_end|>\n<|im_start|>assistant\n<tool_call>\n\n<think/>\n\n"
        self.prefix_tokens = self.tokenizer.encode(self.prefix, add_special_tokens=False)
        self.suffix_tokens = self.tokenizer.encode(self.suffix, add_special_tokens=False)

        print("重排序模型加载完成！")

    def _format_instruction(self, instruction, query, doc):
        """格式化输入"""
        return "<Instruct>: {instruction}\n<Query>: {query}\n<Document>: {doc}".format(
            instruction=instruction, query=query, doc=doc
        )

    def _process_inputs(self, pairs):
        """处理输入"""
        inputs = self.tokenizer(
            pairs, padding=False, truncation='longest_first',
            return_attention_mask=False, max_length=self.max_length - len(self.prefix_tokens) - len(self.suffix_tokens)
        )
        for i, ele in enumerate(inputs['input_ids']):
            inputs['input_ids'][i] = self.prefix_tokens + ele + self.suffix_tokens
        inputs = self.tokenizer.pad(inputs, padding=True, return_tensors="pt")
        return inputs

    @torch.no_grad()
    def _compute_scores(self, inputs):
        """计算相关性分数"""
        batch_scores = self.model(**inputs).logits[:, -1, :]
        true_vector = batch_scores[:, self.token_true_id]
        false_vector = batch_scores[:, self.token_false_id]
        batch_scores = torch.stack([false_vector, true_vector], dim=1)
        batch_scores = torch.nn.functional.log_softmax(batch_scores, dim=1)
        scores = batch_scores[:, 1].exp().tolist()
        return scores

    def rerank(
        self,
        query: str,
        documents: List[Document],
        top_k: int = 3
    ) -> List[Document]:
        """
        重排序文档
        """
        if not documents:
            return []

        instruction = 'Given a web search query, retrieve relevant passages that answer the query'

        # 构建输入对
        pairs = [self._format_instruction(instruction, query, doc.page_content) for doc in documents]

        # 处理输入
        inputs = self._process_inputs(pairs)

        # 计算分数
        scores = self._compute_scores(inputs)

        # 根据分数排序
        scored_docs = list(zip(documents, scores))
        scored_docs.sort(key=lambda x: x[1], reverse=True)

        return [doc for doc, score in scored_docs[:top_k]]


_reranker = None


def get_reranker() -> Reranker:
    """获取重排序器实例"""
    global _reranker
    if _reranker is None:
        _reranker = Reranker()
    return _reranker