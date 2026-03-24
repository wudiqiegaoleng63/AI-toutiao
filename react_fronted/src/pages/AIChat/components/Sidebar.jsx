/**
 * 会话列表侧边栏组件 (Sidebar.jsx)
 *
 * 该组件显示用户的对话会话列表，支持：
 * - 显示所有会话（按更新时间排序）
 * - 创建新会话
 * - 切换会话
 * - 删除会话
 *
 * UI 特性：
 * - 移动端采用抽屉式侧边栏
 * - 桌面端固定在左侧
 * - 支持长按/滑动删除（可选）
 *
 * 作者：Claude AI
 * 日期：2024
 */

import React, { useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { Popup, Button, SwipeAction, Dialog, Toast } from 'antd-mobile'
import {
  AddCircleOutline,
  MessageOutline,
  DeleteOutline
} from 'antd-mobile-icons'
import {
  fetchConversations,
  createNewConversation,
  deleteConversationById,
  setCurrentConversation,
  setSidebarOpen
} from '../../../store/aiChatSlice'
import './Sidebar.css'

const Sidebar = () => {
  const dispatch = useDispatch()

  // 从 Redux 获取状态
  const {
    conversations,
    currentConversationId,
    sidebarOpen,
    isLoading
  } = useSelector((state) => state.aiChat)

  const { isLogin } = useSelector((state) => state.user)

  // 初始化时加载会话列表
  useEffect(() => {
    if (isLogin) {
      dispatch(fetchConversations())
    }
  }, [dispatch, isLogin])

  /**
   * 创建新会话
   */
  const handleCreateConversation = async () => {
    const result = await dispatch(createNewConversation({}))
    if (createNewConversation.fulfilled.match(result)) {
      Toast.show({ content: '创建成功', icon: 'success' })
      // 关闭侧边栏（移动端）
      dispatch(setSidebarOpen(false))
    } else {
      Toast.show({ content: result.payload || '创建失败', icon: 'fail' })
    }
  }

  /**
   * 选择会话
   * @param {object} conversation - 会话对象
   */
  const handleSelectConversation = (conversation) => {
    dispatch(setCurrentConversation(conversation.id))
    // 关闭侧边栏（移动端）
    dispatch(setSidebarOpen(false))
  }

  /**
   * 删除会话
   * @param {number} conversationId - 会话 ID
   * @param {string} title - 会话标题（用于确认对话框）
   */
  const handleDeleteConversation = async (conversationId, title) => {
    const result = await Dialog.confirm({
      content: `确定要删除"${title}"吗？`,
      confirmText: '删除',
      cancelText: '取消'
    })

    if (result) {
      const deleteResult = await dispatch(deleteConversationById(conversationId))
      if (deleteConversationById.fulfilled.match(deleteResult)) {
        Toast.show({ content: '删除成功', icon: 'success' })
      } else {
        Toast.show({ content: deleteResult.payload || '删除失败', icon: 'fail' })
      }
    }
  }

  /**
   * 格式化时间显示
   * @param {string} dateString - ISO 时间字符串
   * @returns {string} 格式化后的时间
   */
  const formatTime = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now - date

    // 1小时内显示"刚刚"
    if (diff < 3600000) {
      return '刚刚'
    }
    // 今天显示时间
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    }
    // 昨天显示"昨天"
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    if (date.toDateString() === yesterday.toDateString()) {
      return '昨天'
    }
    // 其他显示日期
    return date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
  }

  /**
   * 渲染会话列表项
   */
  const renderConversationItem = (conversation) => {
    const isActive = conversation.id === currentConversationId

    return (
      <SwipeAction
        key={conversation.id}
        rightActions={[
          {
            key: 'delete',
            text: '删除',
            color: 'danger',
            onClick: () => handleDeleteConversation(conversation.id, conversation.title)
          }
        ]}
      >
        <div
          className={`sidebar-item ${isActive ? 'active' : ''}`}
          onClick={() => handleSelectConversation(conversation)}
        >
          <div className="sidebar-item-icon">
            <MessageOutline fontSize={20} />
          </div>
          <div className="sidebar-item-content">
            <div className="sidebar-item-title">{conversation.title}</div>
            <div className="sidebar-item-time">
              {formatTime(conversation.updated_at)}
            </div>
          </div>
        </div>
      </SwipeAction>
    )
  }

  /**
   * 侧边栏内容
   */
  const sidebarContent = (
    <div className="sidebar-content">
      {/* 头部 */}
      <div className="sidebar-header">
        <h3>会话列表</h3>
        <Button
          size="small"
          color="primary"
          onClick={handleCreateConversation}
          loading={isLoading}
        >
          <AddCircleOutline /> 新对话
        </Button>
      </div>

      {/* 会话列表 */}
      <div className="sidebar-list">
        {conversations.length === 0 ? (
          <div className="sidebar-empty">
            <MessageOutline fontSize={40} />
            <p>暂无会话</p>
            <p className="sidebar-empty-hint">点击上方按钮创建新对话</p>
          </div>
        ) : (
          conversations.map(renderConversationItem)
        )}
      </div>
    </div>
  )

  return (
    <>
      {/* 移动端：抽屉式侧边栏 */}
      <Popup
        position="left"
        visible={sidebarOpen}
        onMaskClick={() => dispatch(setSidebarOpen(false))}
        bodyStyle={{ width: '280px' }}
      >
        {sidebarContent}
      </Popup>

      {/* 桌面端：固定侧边栏 */}
      <div className="sidebar-desktop">
        {sidebarContent}
      </div>
    </>
  )
}

export default Sidebar