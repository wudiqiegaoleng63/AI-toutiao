/**
 * AI 聊天 Redux Slice
 *
 * 该模块管理 AI 聊天功能的全局状态，包括：
 * - 会话列表管理
 * - 当前会话的消息列表
 * - 文档列表管理
 * - 聊天状态（加载中、错误等）
 *
 * 使用 Redux Toolkit 的 createSlice 和 createAsyncThunk 实现。
 *
 * 作者：Claude AI
 * 日期：2024
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import axios from 'axios'
import { apiConfig } from '../config/api'

// ==================== API 配置 ====================

/**
 * 创建带有认证头的 axios 实例
 * @param {string} token - 用户认证 token
 * @returns {object} 配置好的 axios 实例
 */
const createAuthAxios = (token) => {
  return axios.create({
    baseURL: `${apiConfig.baseURL}/api/aichat`,
    headers: {
      'Authorization': token,
      'Content-Type': 'application/json'
    }
  })
}

// ==================== 初始状态 ====================

const initialState = {
  // 会话列表
  conversations: [],
  // 会话总数
  conversationsTotal: 0,
  // 当前选中的会话 ID
  currentConversationId: null,
  // 当前会话的消息列表
  messages: [],
  // 消息总数
  messagesTotal: 0,
  // 用户文档列表
  documents: [],
  // 文档总数
  documentsTotal: 0,
  // 文档统计信息
  documentStats: null,
  // 是否正在加载
  isLoading: false,
  // 是否正在发送消息
  isSending: false,
  // 错误信息
  error: null,
  // 侧边栏是否展开（移动端）
  sidebarOpen: false,
  // 文档管理弹窗是否打开
  documentManagerOpen: false
}

// ==================== 异步 Thunk Actions ====================

/**
 * 获取会话列表
 * @param {object} params - 分页参数 { skip, limit }
 */
export const fetchConversations = createAsyncThunk(
  'aiChat/fetchConversations',
  async ({ skip = 0, limit = 20 } = {}, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().user
      if (!token) {
        return rejectWithValue('未登录')
      }

      const response = await axios.get(`${apiConfig.baseURL}/api/aichat/sessions`, {
        headers: { Authorization: token },
        params: { skip, limit }
      })

      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || '获取会话列表失败')
    }
  }
)

/**
 * 创建新会话
 * @param {object} data - 会话数据 { title }
 */
export const createNewConversation = createAsyncThunk(
  'aiChat/createNewConversation',
  async ({ title = '新对话' } = {}, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().user
      if (!token) {
        return rejectWithValue('未登录')
      }

      const response = await axios.post(
        `${apiConfig.baseURL}/api/aichat/sessions`,
        { title },
        { headers: { Authorization: token } }
      )

      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || '创建会话失败')
    }
  }
)

/**
 * 删除会话
 * @param {number} conversationId - 会话 ID
 */
export const deleteConversationById = createAsyncThunk(
  'aiChat/deleteConversation',
  async (conversationId, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().user
      if (!token) {
        return rejectWithValue('未登录')
      }

      await axios.delete(`${apiConfig.baseURL}/api/aichat/sessions/${conversationId}`, {
        headers: { Authorization: token }
      })

      return conversationId
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || '删除会话失败')
    }
  }
)

/**
 * 获取会话消息
 * @param {object} params - { conversationId, skip, limit }
 */
export const fetchMessages = createAsyncThunk(
  'aiChat/fetchMessages',
  async ({ conversationId, skip = 0, limit = 100 }, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().user
      if (!token) {
        return rejectWithValue('未登录')
      }

      const response = await axios.get(
        `${apiConfig.baseURL}/api/aichat/sessions/${conversationId}/messages`,
        {
          headers: { Authorization: token },
          params: { skip, limit }
        }
      )

      return { ...response.data, conversationId }
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || '获取消息失败')
    }
  }
)

/**
 * 获取文档列表
 * @param {object} params - 分页参数 { skip, limit }
 */
export const fetchDocuments = createAsyncThunk(
  'aiChat/fetchDocuments',
  async ({ skip = 0, limit = 20 } = {}, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().user
      if (!token) {
        return rejectWithValue('未登录')
      }

      const response = await axios.get(`${apiConfig.baseURL}/api/aichat/documents`, {
        headers: { Authorization: token },
        params: { skip, limit }
      })

      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || '获取文档列表失败')
    }
  }
)

/**
 * 上传文档
 * @param {File} file - 文档文件
 */
export const uploadDocument = createAsyncThunk(
  'aiChat/uploadDocument',
  async (file, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().user
      if (!token) {
        return rejectWithValue('未登录')
      }

      const formData = new FormData()
      formData.append('file', file)

      const response = await axios.post(
        `${apiConfig.baseURL}/api/aichat/documents`,
        formData,
        {
          headers: {
            Authorization: token,
            'Content-Type': 'multipart/form-data'
          }
        }
      )

      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || '上传文档失败')
    }
  }
)

/**
 * 删除文档
 * @param {number} documentId - 文档 ID
 */
export const deleteDocumentById = createAsyncThunk(
  'aiChat/deleteDocument',
  async (documentId, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().user
      if (!token) {
        return rejectWithValue('未登录')
      }

      await axios.delete(`${apiConfig.baseURL}/api/aichat/documents/${documentId}`, {
        headers: { Authorization: token }
      })

      return documentId
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || '删除文档失败')
    }
  }
)

/**
 * 获取文档统计信息
 */
export const fetchDocumentStats = createAsyncThunk(
  'aiChat/fetchDocumentStats',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().user
      if (!token) {
        return rejectWithValue('未登录')
      }

      const response = await axios.get(`${apiConfig.baseURL}/api/aichat/documents/stats`, {
        headers: { Authorization: token }
      })

      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || '获取统计信息失败')
    }
  }
)

/**
 * 批量删除文档
 * @param {string[]} ids - 文档 ID 列表
 */
export const batchDeleteDocuments = createAsyncThunk(
  'aiChat/batchDeleteDocuments',
  async (ids, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().user
      if (!token) {
        return rejectWithValue('未登录')
      }

      await axios.post(
        `${apiConfig.baseURL}/api/aichat/documents/batch-delete`,
        { ids },
        { headers: { Authorization: token } }
      )

      return ids
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || '批量删除失败')
    }
  }
)

/**
 * 清空所有文档
 */
export const clearAllDocuments = createAsyncThunk(
  'aiChat/clearAllDocuments',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().user
      if (!token) {
        return rejectWithValue('未登录')
      }

      await axios.delete(`${apiConfig.baseURL}/api/aichat/documents/clear`, {
        headers: { Authorization: token }
      })

      return true
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || '清空失败')
    }
  }
)

// ==================== Slice 定义 ====================

const aiChatSlice = createSlice({
  name: 'aiChat',
  initialState,
  reducers: {
    /**
     * 设置当前会话
     */
    setCurrentConversation: (state, action) => {
      state.currentConversationId = action.payload
    },

    /**
     * 添加消息到当前会话（用于 SSE 流式响应）
     */
    addMessage: (state, action) => {
      state.messages.push(action.payload)
    },

    /**
     * 更新最后一条消息（用于 SSE 流式更新）
     */
    updateLastMessage: (state, action) => {
      if (state.messages.length > 0) {
        state.messages[state.messages.length - 1] = {
          ...state.messages[state.messages.length - 1],
          ...action.payload
        }
      }
    },

    /**
     * 清空消息列表
     */
    clearMessages: (state) => {
      state.messages = []
      state.messagesTotal = 0
    },

    /**
     * 切换侧边栏
     */
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen
    },

    /**
     * 设置侧边栏状态
     */
    setSidebarOpen: (state, action) => {
      state.sidebarOpen = action.payload
    },

    /**
     * 切换文档管理弹窗
     */
    toggleDocumentManager: (state) => {
      state.documentManagerOpen = !state.documentManagerOpen
    },

    /**
     * 设置发送状态
     */
    setSending: (state, action) => {
      state.isSending = action.payload
    },

    /**
     * 设置错误信息
     */
    setError: (state, action) => {
      state.error = action.payload
    },

    /**
     * 清空错误信息
     */
    clearError: (state) => {
      state.error = null
    }
  },

  extraReducers: (builder) => {
    // ========== 会话列表 ==========
    builder
      .addCase(fetchConversations.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchConversations.fulfilled, (state, action) => {
        state.isLoading = false
        state.conversations = action.payload.conversations
        state.conversationsTotal = action.payload.total
      })
      .addCase(fetchConversations.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload
      })

    // ========== 创建会话 ==========
    builder
      .addCase(createNewConversation.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(createNewConversation.fulfilled, (state, action) => {
        state.isLoading = false
        // 将新会话添加到列表顶部
        state.conversations.unshift(action.payload)
        state.conversationsTotal += 1
        // 设为当前会话
        state.currentConversationId = action.payload.id
        // 清空消息
        state.messages = []
        state.messagesTotal = 0
      })
      .addCase(createNewConversation.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload
      })

    // ========== 删除会话 ==========
    builder
      .addCase(deleteConversationById.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(deleteConversationById.fulfilled, (state, action) => {
        state.isLoading = false
        // 从列表中移除会话
        state.conversations = state.conversations.filter(
          (c) => c.id !== action.payload
        )
        state.conversationsTotal -= 1
        // 如果删除的是当前会话，清空消息
        if (state.currentConversationId === action.payload) {
          state.currentConversationId = null
          state.messages = []
          state.messagesTotal = 0
        }
      })
      .addCase(deleteConversationById.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload
      })

    // ========== 获取消息 ==========
    builder
      .addCase(fetchMessages.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        state.isLoading = false
        state.messages = action.payload.messages
        state.messagesTotal = action.payload.total
      })
      .addCase(fetchMessages.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload
      })

    // ========== 文档列表 ==========
    builder
      .addCase(fetchDocuments.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchDocuments.fulfilled, (state, action) => {
        state.isLoading = false
        // 后端返回格式: {code, message, data: {ids, documents, metadatas, total}}
        const payload = action.payload.data || action.payload
        // 将 ids 和 documents 组合成文档列表
        if (payload.ids && payload.documents) {
          state.documents = payload.ids.map((id, index) => ({
            id,
            content: payload.documents[index],
            metadata: payload.metadatas?.[index] || {}
          }))
        } else {
          state.documents = payload.documents || []
        }
        state.documentsTotal = payload.total || 0
      })
      .addCase(fetchDocuments.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload
      })

    // ========== 上传文档 ==========
    builder
      .addCase(uploadDocument.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(uploadDocument.fulfilled, (state, action) => {
        state.isLoading = false
        // 将新文档添加到列表顶部
        state.documents.unshift(action.payload)
        state.documentsTotal += 1
      })
      .addCase(uploadDocument.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload
      })

    // ========== 删除文档 ==========
    builder
      .addCase(deleteDocumentById.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(deleteDocumentById.fulfilled, (state, action) => {
        state.isLoading = false
        // 从列表中移除文档
        state.documents = state.documents.filter((d) => d.id !== action.payload)
        state.documentsTotal -= 1
      })
      .addCase(deleteDocumentById.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload
      })

    // ========== 文档统计 ==========
    builder
      .addCase(fetchDocumentStats.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchDocumentStats.fulfilled, (state, action) => {
        state.isLoading = false
        state.documentStats = action.payload.data
      })
      .addCase(fetchDocumentStats.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload
      })

    // ========== 批量删除文档 ==========
    builder
      .addCase(batchDeleteDocuments.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(batchDeleteDocuments.fulfilled, (state, action) => {
        state.isLoading = false
        // 从列表中移除文档
        state.documents = state.documents.filter((d) => !action.payload.includes(d.id))
        state.documentsTotal -= action.payload.length
      })
      .addCase(batchDeleteDocuments.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload
      })

    // ========== 清空文档 ==========
    builder
      .addCase(clearAllDocuments.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(clearAllDocuments.fulfilled, (state) => {
        state.isLoading = false
        state.documents = []
        state.documentsTotal = 0
        state.documentStats = null
      })
      .addCase(clearAllDocuments.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload
      })
  }
})

// ==================== 导出 Actions 和 Reducer ====================

export const {
  setCurrentConversation,
  addMessage,
  updateLastMessage,
  clearMessages,
  toggleSidebar,
  setSidebarOpen,
  toggleDocumentManager,
  setSending,
  setError,
  clearError
} = aiChatSlice.actions

export default aiChatSlice.reducer