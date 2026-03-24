/**
 * 消息列表组件 (MessageList.jsx)
 *
 * 该组件显示当前会话的消息列表，支持：
 * - 显示用户消息和 AI 回复
 * - 支持 Markdown 渲染
 * - 流式消息实时更新
 * - 自动滚动到底部
 * - 加载历史消息
 *
 * 作者：Claude AI
 * 日期：2024
 */

import React, { useRef, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { fetchMessages } from '../../../store/aiChatSlice'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import './MessageList.css'

// 配置 marked 选项
marked.setOptions({
  breaks: true,        // 支持换行
  gfm: true,           // 支持 GitHub 风格 Markdown
})

const MessageList = () => {
  const dispatch = useDispatch()
  const messagesContainerRef = useRef(null)
  const prevConversationIdRef = useRef(null)

  // 从 Redux 获取状态
  const { messages, currentConversationId, isLoading, isSending } = useSelector(
    (state) => state.aiChat
  )
  const { isLogin } = useSelector((state) => state.user)

  // 当切换会话时，加载消息（发送消息时不重新加载）
  useEffect(() => {
    // 只在会话ID真正变化且不是正在发送消息时才加载
    if (isLogin && currentConversationId && !isSending) {
      // 检查是否是真正的会话切换（不是发送消息时设置的）
      if (prevConversationIdRef.current !== currentConversationId) {
        prevConversationIdRef.current = currentConversationId
        dispatch(fetchMessages({ conversationId: currentConversationId }))
      }
    }
  }, [dispatch, currentConversationId, isLogin, isSending])

  // 消息更新时滚动到底部
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  /**
   * 滚动到底部
   */
  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop =
        messagesContainerRef.current.scrollHeight
    }
  }

  /**
   * 格式化消息内容（Markdown 转 HTML）
   * @param {string} content - 消息内容
   * @returns {string} 安全的 HTML
   */
  const formatMessage = (content) => {
    if (!content) return ''
    // 使用 DOMPurify 防止 XSS 攻击
    return DOMPurify.sanitize(marked.parse(content))
  }

  /**
   * 格式化消息时间
   * @param {string} dateString - ISO 时间字符串
   * @returns {string} 格式化后的时间
   */
  const formatTime = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  /**
   * 渲染单个消息
   * @param {object} message - 消息对象
   * @param {number} index - 消息索引
   */
  const renderMessage = (message, index) => {
    const isUser = message.role === 'user'
    const isLoadingMsg = !isUser && message.content === ''

    return (
      <div
        key={message.id || index}
        className={`message ${isUser ? 'user-message' : 'ai-message'}`}
      >
        {/* 消息头像 */}
        <div className="message-avatar">
          {isUser ? '👤' : '🤖'}
        </div>

        {/* 消息内容 */}
        <div className="message-body">
          <div className="message-content">
            {isLoadingMsg ? (
              // 加载动画
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            ) : (
              <>
                {/* 思考内容（浅色显示） */}
                {message.thinking && (
                  <div className="message-thinking">
                    <div className="thinking-label">💭 思考过程</div>
                    <div
                      className="thinking-text"
                      dangerouslySetInnerHTML={{
                        __html: formatMessage(message.thinking)
                      }}
                    />
                  </div>
                )}
                {/* 正文内容 */}
                <div
                  className="message-text"
                  dangerouslySetInnerHTML={{
                    __html: formatMessage(message.content)
                  }}
                />
              </>
            )}
          </div>

          {/* 消息时间 */}
          {message.created_at && (
            <div className="message-time">
              {formatTime(message.created_at)}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="message-list-container" ref={messagesContainerRef}>
      {/* 无会话提示 */}
      {!currentConversationId && (
        <div className="message-empty">
          <div className="message-empty-icon">💬</div>
          <h4>开始对话</h4>
          <p>选择一个会话或创建新对话</p>
        </div>
      )}

      {/* 加载中 */}
      {isLoading && messages.length === 0 && (
        <div className="message-loading">
          <div className="loading-spinner"></div>
          <p>加载中...</p>
        </div>
      )}

      {/* 消息列表 */}
      {messages.length > 0 && (
        <div className="message-list">
          {messages.map(renderMessage)}
        </div>
      )}
    </div>
  )
}

export default MessageList