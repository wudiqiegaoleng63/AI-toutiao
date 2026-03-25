/**
 * 消息输入组件 (ChatInput.jsx)
 *
 * 该组件提供消息输入功能，支持：
 * - 文本输入
 * - 发送消息（通过 SSE 流式响应）
 * - 回车发送
 * - 发送状态显示
 * - 普通/高级RAG 模式切换
 * - 图片/视频上传（多模态聊天）
 *
 * 作者：Claude AI
 * 日期：2024
 */

import React, { useState, useRef } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { Button, Switch, Toast } from 'antd-mobile'
import { SendOutline, GlobalOutline, PictureOutline, VideoOutline } from 'antd-mobile-icons'
import { apiConfig } from '../../../config/api'
import {
  setCurrentConversation,
  addMessage,
  updateLastMessage,
  setSending
} from '../../../store/aiChatSlice'
import './ChatInput.css'

const ChatInput = () => {
  const dispatch = useDispatch()
  const inputRef = useRef(null)
  const fileInputRef = useRef(null)

  // 本地状态
  const [inputValue, setInputValue] = useState('')
  const [chatMode, setChatMode] = useState('normal') // 'normal' | 'advanced'
  const [useRag, setUseRag] = useState(true)
  const [selectedFile, setSelectedFile] = useState(null) // 多模态文件

  // 从 Redux 获取状态
  const { currentConversationId, isSending } = useSelector(
    (state) => state.aiChat
  )
  const { token, isLogin } = useSelector((state) => state.user)

  /**
   * 发送消息
   * 使用 SSE 流式响应获取 AI 回复
   */
  const sendMessage = async () => {
    const message = inputValue.trim()
    if (!message || isSending) return

    // 检查登录状态
    if (!isLogin || !token) {
      Toast.show({ content: '请先登录', icon: 'fail' })
      return
    }

    // 清空输入框
    setInputValue('')
    dispatch(setSending(true))

    // 生成唯一ID
    const generateId = () => `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // 添加用户消息
    const userMessage = selectedFile
      ? `[上传了文件: ${selectedFile.name}] ${message}`
      : message

    dispatch(
      addMessage({
        id: generateId(),
        role: 'user',
        content: userMessage,
        created_at: new Date().toISOString()
      })
    )

    // 添加 AI 消息占位
    dispatch(
      addMessage({
        id: generateId(),
        role: 'assistant',
        content: '',
        created_at: new Date().toISOString()
      })
    )

    try {
      // 根据是否选择文件，决定调用哪个接口
      if (selectedFile) {
        // 多模态聊天
        await sendMultimodalMessage(message, selectedFile)
      } else {
        // 普通聊天或高级RAG
        await sendTextMessage(message)
      }
    } catch (error) {
      console.error('Error sending message:', error)
      dispatch(
        updateLastMessage({
          content: `发生错误: ${error.message || '请检查网络连接'}`
        })
      )
      Toast.show({ content: error.message || '发送失败', icon: 'fail' })
    } finally {
      dispatch(setSending(false))
      setSelectedFile(null) // 清空文件
      inputRef.current?.focus()
    }
  }

  /**
   * 发送普通/高级RAG文本消息
   */
  const sendTextMessage = async (message) => {
    // 根据模式选择接口
    const endpoint = chatMode === 'advanced'
      ? `${apiConfig.baseURL}/api/aichat/advance_stream`
      : `${apiConfig.baseURL}/api/aichat/stream`

    // 构建请求体
    const body = chatMode === 'advanced'
      ? {
          question: message,
          session_id: currentConversationId,
          use_rewrite: true,
          use_hybrid: true,
          use_rerank: true
        }
      : {
          question: message,
          session_id: currentConversationId,
          use_rag: useRag
        }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: token
      },
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    await handleSSEResponse(response)
  }

  /**
   * 发送多模态消息（图片/视频）
   */
  const sendMultimodalMessage = async (message, file) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('question', message)
    if (currentConversationId) {
      formData.append('session_id', currentConversationId)
    }

    const response = await fetch(`${apiConfig.baseURL}/api/aichat/multimodal/stream`, {
      method: 'POST',
      headers: {
        Authorization: token
      },
      body: formData
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    await handleSSEResponse(response)
  }

  /**
   * 处理 SSE 流式响应
   */
  const handleSSEResponse = async (response) => {
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let aiResponse = ''
    let thinkingContent = ''

    // 节流更新：减少 dispatch 频率，让 UI 有时间渲染
    let lastUpdateTime = 0
    const UPDATE_INTERVAL = 16 // 约 60fps

    const throttledUpdate = (content, thinking) => {
      const now = Date.now()
      if (now - lastUpdateTime >= UPDATE_INTERVAL) {
        dispatch(updateLastMessage({ content, thinking }))
        lastUpdateTime = now
      }
    }

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (!line.trim()) continue

        if (line.startsWith('session_id:')) {
          const sessionId = parseInt(line.slice(11).trim())
          if (sessionId && !currentConversationId) {
            dispatch(setCurrentConversation(sessionId))
          }
        }
        else if (line.startsWith('think:')) {
          thinkingContent += line.slice(6)
          throttledUpdate(aiResponse, thinkingContent)
        }
        else if (line.startsWith('data:')) {
          const content = line.slice(5)
          if (content) {
            aiResponse += content
            throttledUpdate(aiResponse, thinkingContent)
          }
        }
        // think_start 和 think_end 不需要特殊处理
      }
    }

    // 最终更新，确保显示完整内容
    dispatch(updateLastMessage({ content: aiResponse, thinking: thinkingContent }))

    if (!aiResponse) {
      dispatch(updateLastMessage({ content: '抱歉，没有收到回复，请稍后重试。' }))
    }
  }

  /**
   * 处理文件选择
   */
  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 检查文件类型
    const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    const videoTypes = ['video/mp4', 'video/avi', 'video/quicktime', 'video/x-matroska']

    if (![...imageTypes, ...videoTypes].includes(file.type)) {
      Toast.show({ content: '请上传图片或视频文件', icon: 'fail' })
      return
    }

    // 检查文件大小 (最大 50MB)
    if (file.size > 50 * 1024 * 1024) {
      Toast.show({ content: '文件过大，最大支持 50MB', icon: 'fail' })
      return
    }

    setSelectedFile(file)
    Toast.show({ content: `已选择: ${file.name}`, icon: 'success' })
  }

  /**
   * 处理键盘事件
   */
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="chat-input-container">
      {/* 模式切换 */}
      <div className="chat-input-options">
        <div className="mode-buttons">
          <Button
            size="small"
            color={chatMode === 'normal' ? 'primary' : 'default'}
            onClick={() => setChatMode('normal')}
          >
            普通聊天
          </Button>
          <Button
            size="small"
            color={chatMode === 'advanced' ? 'primary' : 'default'}
            onClick={() => setChatMode('advanced')}
          >
            高级模式
          </Button>
        </div>

        {/* RAG 开关 - 所有模式都显示 */}
        <div className="rag-toggle">
          <GlobalOutline fontSize={16} />
          <span className="rag-label">知识库检索</span>
          <Switch
            checked={useRag}
            onChange={setUseRag}
            style={{ '--checked-color': '#1890ff' }}
          />
        </div>
      </div>

      {/* 已选择的文件 */}
      {selectedFile && (
        <div className="selected-file">
          {selectedFile.type.startsWith('image') ? (
            <PictureOutline fontSize={16} />
          ) : (
            <VideoOutline fontSize={16} />
          )}
          <span>{selectedFile.name}</span>
          <Button
            size="mini"
            fill="none"
            onClick={() => setSelectedFile(null)}
          >
            ✕
          </Button>
        </div>
      )}

      {/* 输入区域 */}
      <div className="chat-input-wrapper">
        {/* 文件上传按钮 */}
        <Button
          fill="none"
          onClick={() => fileInputRef.current?.click()}
          disabled={isSending}
        >
          <PictureOutline fontSize={20} />
        </Button>

        <textarea
          ref={inputRef}
          className="chat-textarea"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={selectedFile ? "描述图片/视频内容..." : "输入消息... (Enter 发送)"}
          disabled={isSending}
          rows={1}
        />
        <Button
          className="send-button"
          color="primary"
          onClick={sendMessage}
          disabled={!inputValue.trim() || isSending}
          loading={isSending}
        >
          {!isSending && <SendOutline fontSize={18} />}
        </Button>
      </div>

      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
    </div>
  )
}

export default ChatInput