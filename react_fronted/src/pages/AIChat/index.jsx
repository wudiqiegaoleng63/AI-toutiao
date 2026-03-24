/**
 * AI 聊天页面
 *
 * 该页面是 AI 聊天功能的主入口，整合了以下组件：
 * - Sidebar: 会话列表侧边栏
 * - MessageList: 消息列表
 * - ChatInput: 消息输入
 * - DocumentManager: 文档管理
 *
 * 功能特性：
 * - 多会话管理
 * - 历史消息加载
 * - SSE 流式响应
 * - RAG 检索增强
 * - 文档上传与管理
 *
 * 作者：Claude AI
 * 日期：2024
 */

import React, { useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { NavBar, Button, Popover } from 'antd-mobile'
import {
  UnorderedListOutline,
  FileOutline,
  AddCircleOutline
} from 'antd-mobile-icons'
import {
  createNewConversation,
  fetchConversations,
  toggleSidebar,
  toggleDocumentManager
} from '../../store/aiChatSlice'
import TabBar from '../../components/TabBar'
import Sidebar from './components/Sidebar'
import MessageList from './components/MessageList'
import ChatInput from './components/ChatInput'
import DocumentManager from './components/DocumentManager'
import './index.css'

const AIChat = () => {
  const dispatch = useDispatch()

  // 从 Redux 获取状态
  const { currentConversationId, conversations, isLoading } = useSelector(
    (state) => state.aiChat
  )
  const { isLogin } = useSelector((state) => state.user)

  // 初始化时加载会话列表
  useEffect(() => {
    if (isLogin) {
      dispatch(fetchConversations())
    }
  }, [dispatch, isLogin])

  /**
   * 获取当前会话标题
   */
  const getCurrentTitle = () => {
    if (!currentConversationId) return 'AI 助手'
    const conversation = conversations.find((c) => c.id === currentConversationId)
    return conversation?.title || 'AI 助手'
  }

  /**
   * 创建新会话
   */
  const handleNewConversation = async () => {
    await dispatch(createNewConversation({}))
  }

  /**
   * 右侧操作按钮
   */
  const rightContent = (
    <div className="nav-bar-actions">
      <Button
        fill="none"
        onClick={() => dispatch(toggleDocumentManager())}
      >
        <FileOutline fontSize={20} />
      </Button>
    </div>
  )

  /**
   * 左侧操作按钮
   */
  const leftContent = (
    <div className="nav-bar-actions">
      <Button
        fill="none"
        onClick={() => dispatch(toggleSidebar())}
      >
        <UnorderedListOutline fontSize={20} />
      </Button>
    </div>
  )

  return (
    <div className="ai-chat-container">
      {/* 导航栏 */}
      <NavBar
        left={leftContent}
        right={rightContent}
        back={null}
      >
        <div className="nav-bar-title">
          <span>{getCurrentTitle()}</span>
        </div>
      </NavBar>

      {/* 主内容区 */}
      <div className="chat-main">
        {/* 侧边栏（桌面端固定显示） */}
        <Sidebar />

        {/* 聊天区域 */}
        <div className="chat-area">
          {/* 消息列表 */}
          <MessageList />

          {/* 输入区域 */}
          <ChatInput />
        </div>
      </div>

      {/* 文档管理弹窗 */}
      <DocumentManager />

      {/* 底部导航 */}
      <TabBar />
    </div>
  )
}

export default AIChat