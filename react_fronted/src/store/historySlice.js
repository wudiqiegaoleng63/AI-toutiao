import { createSlice } from '@reduxjs/toolkit'
import axios from 'axios'
import { apiConfig } from '../config/api'

const initialState = {
  historyList: [],
  loading: false
}

const historySlice = createSlice({
  name: 'history',
  initialState,
  reducers: {
    setHistoryList: (state, action) => {
      state.historyList = action.payload
    },
    addHistory: (state, action) => {
      // 如果已存在，移除旧的，添加新的到最前面
      state.historyList = state.historyList.filter(item => item.id !== action.payload.id)
      state.historyList.unshift(action.payload)
    },
    removeHistory: (state, action) => {
      state.historyList = state.historyList.filter(item => item.id !== action.payload)
    },
    clearHistoryList: (state) => {
      state.historyList = []
    },
    setLoading: (state, action) => {
      state.loading = action.payload
    },
    loadHistory: (state) => {
      try {
        const saved = localStorage.getItem('history')
        if (saved) {
          state.historyList = JSON.parse(saved)
        }
      } catch (e) {
        console.error('Failed to load history:', e)
      }
    },
  },
})

export const {
  setHistoryList,
  addHistory,
  removeHistory,
  clearHistoryList,
  setLoading,
  loadHistory
} = historySlice.actions

// Thunk actions
export const addHistoryApi = (newsId) => async (dispatch, getState) => {
  const { token, isLogin } = getState().user
  if (!isLogin || !token) {
    return { success: false }
  }

  try {
    const response = await axios.post(`${apiConfig.baseURL}/api/history/add`,
      { newsId },
      {
        headers: {
          Authorization: token
        }
      }
    )

    if (response.data && response.data.code === 200) {
      return { success: true }
    }
    return { success: false }
  } catch (error) {
    console.error('添加历史记录失败:', error)
    return { success: false }
  }
}

export const getHistoryListApi = (page = 1, pageSize = 10) => async (dispatch, getState) => {
  const { token, isLogin } = getState().user
  if (!isLogin || !token) {
    return { success: false, list: [], total: 0 }
  }

  try {
    const response = await axios.get(`${apiConfig.baseURL}/api/history/list`, {
      params: { page, pageSize },
      headers: {
        Authorization: token
      }
    })

    if (response.data && response.data.code === 200) {
      return {
        success: true,
        list: response.data.data.list,
        total: response.data.data.total,
        hasMore: response.data.data.hasMore
      }
    }
    return { success: false, list: [], total: 0 }
  } catch (error) {
    console.error('获取历史记录列表失败:', error)
    return { success: false, list: [], total: 0 }
  }
}

export const deleteHistoryApi = (historyId) => async (dispatch, getState) => {
  const { token, isLogin } = getState().user
  if (!isLogin || !token) {
    return { success: false, message: '请先登录' }
  }

  try {
    const response = await axios.delete(`${apiConfig.baseURL}/api/history/delete/${historyId}`, {
      headers: {
        Authorization: token
      }
    })

    if (response.data && response.data.code === 200) {
      dispatch(removeHistory(historyId))
      return { success: true, message: '删除成功' }
    }
    return { success: false, message: '删除失败' }
  } catch (error) {
    console.error('删除历史记录失败:', error)
    return { success: false, message: error.response?.data?.message || '删除失败' }
  }
}

export const clearHistoryApi = () => async (dispatch, getState) => {
  const { token, isLogin } = getState().user
  if (!isLogin || !token) {
    return { success: false, message: '请先登录' }
  }

  try {
    const response = await axios.delete(`${apiConfig.baseURL}/api/history/clear`, {
      headers: {
        Authorization: token
      }
    })

    if (response.data && response.data.code === 200) {
      dispatch(clearHistoryList())
      return { success: true, message: '清空成功' }
    }
    return { success: false, message: '清空失败' }
  } catch (error) {
    console.error('清空历史记录失败:', error)
    return { success: false, message: error.response?.data?.message || '清空失败' }
  }
}

export default historySlice.reducer