import { createSlice } from '@reduxjs/toolkit'
import axios from 'axios'
import { apiConfig } from '../config/api'

const initialState = {
  favorites: [],
  loading: false
}

const favoriteSlice = createSlice({
  name: 'favorite',
  initialState,
  reducers: {
    setFavorites: (state, action) => {
      state.favorites = action.payload
    },
    addFavorite: (state, action) => {
      if (!state.favorites.find(item => item.id === action.payload.id)) {
        state.favorites.push(action.payload)
      }
    },
    removeFavorite: (state, action) => {
      state.favorites = state.favorites.filter(item => item.id !== action.payload)
    },
    setLoading: (state, action) => {
      state.loading = action.payload
    },
    loadFavorites: (state) => {
      try {
        const saved = localStorage.getItem('favorites')
        if (saved) {
          state.favorites = JSON.parse(saved)
        }
      } catch (e) {
        console.error('Failed to load favorites:', e)
      }
    },
  },
})

export const { setFavorites, addFavorite, removeFavorite, setLoading, loadFavorites } = favoriteSlice.actions

// Selector
export const isFavorite = (state, newsId) => {
  return state.favorite.favorites.some(item => item.id === newsId)
}

// Thunk actions
export const checkFavoriteStatusApi = (newsId) => async (dispatch, getState) => {
  const { token, isLogin } = getState().user
  if (!isLogin || !token) {
    return { success: false, isFavorite: false }
  }

  try {
    const response = await axios.get(`${apiConfig.baseURL}/api/favorite/check`, {
      params: { newsId },
      headers: {
        Authorization: token
      }
    })

    if (response.data && response.data.code === 200) {
      return {
        success: true,
        isFavorite: response.data.data.isFavorite
      }
    }
    return { success: false }
  } catch (error) {
    console.error('检查收藏状态失败:', error)
    return { success: false }
  }
}

export const addFavoriteApi = (news) => async (dispatch, getState) => {
  const { token, isLogin } = getState().user
  if (!isLogin || !token) {
    return { success: false, message: '请先登录' }
  }

  try {
    const response = await axios.post(`${apiConfig.baseURL}/api/favorite/add`,
      { newsId: news.id },
      {
        headers: {
          Authorization: token
        }
      }
    )

    if (response.data && response.data.code === 200) {
      dispatch(addFavorite(news))
      // 持久化
      const { favorites } = getState().favorite
      localStorage.setItem('favorites', JSON.stringify(favorites))
      return { success: true, message: '已添加到收藏' }
    }
    return { success: false, message: '添加收藏失败' }
  } catch (error) {
    console.error('添加收藏失败:', error)
    return { success: false, message: error.response?.data?.message || '添加收藏失败' }
  }
}

export const removeFavoriteApi = (newsId) => async (dispatch, getState) => {
  const { token, isLogin } = getState().user
  if (!isLogin || !token) {
    return { success: false, message: '请先登录' }
  }

  try {
    const response = await axios.delete(`${apiConfig.baseURL}/api/favorite/remove`, {
      params: { newsId },
      headers: {
        Authorization: token
      }
    })

    if (response.data && response.data.code === 200) {
      dispatch(removeFavorite(newsId))
      // 持久化
      const { favorites } = getState().favorite
      localStorage.setItem('favorites', JSON.stringify(favorites))
      return { success: true, message: '已取消收藏' }
    }
    return { success: false, message: '取消收藏失败' }
  } catch (error) {
    console.error('取消收藏失败:', error)
    return { success: false, message: error.response?.data?.message || '取消收藏失败' }
  }
}

export const toggleFavorite = (news) => async (dispatch, getState) => {
  const { favorites } = getState().favorite
  const isFav = favorites.some(item => item.id === news.id)

  if (isFav) {
    return dispatch(removeFavoriteApi(news.id))
  } else {
    return dispatch(addFavoriteApi(news))
  }
}

export const getFavoriteList = (page = 1, pageSize = 10) => async (dispatch, getState) => {
  const { token, isLogin } = getState().user
  if (!isLogin || !token) {
    return { success: false, list: [], total: 0 }
  }

  try {
    const response = await axios.get(`${apiConfig.baseURL}/api/favorite/list`, {
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
    console.error('获取收藏列表失败:', error)
    return { success: false, list: [], total: 0 }
  }
}

export default favoriteSlice.reducer