import { createSlice } from '@reduxjs/toolkit'
import axios from 'axios'
import { apiConfig } from '../config/api'

const initialState = {
  newsList: [],
  newsDetail: {},
  categories: [],
  currentCategory: 1,
  loading: false,
  refreshing: false,
  finished: false,
  categoriesLoading: false
}

const newsSlice = createSlice({
  name: 'news',
  initialState,
  reducers: {
    setNewsList: (state, action) => {
      state.newsList = action.payload
    },
    appendNewsList: (state, action) => {
      // 去重：过滤掉已存在的新闻
      const existingIds = new Set(state.newsList.map(item => item.id))
      const newItems = action.payload.filter(item => !existingIds.has(item.id))
      state.newsList = [...state.newsList, ...newItems]
    },
    setNewsDetail: (state, action) => {
      state.newsDetail = action.payload
    },
    setCategories: (state, action) => {
      state.categories = action.payload
    },
    setCurrentCategory: (state, action) => {
      state.currentCategory = action.payload
    },
    setLoading: (state, action) => {
      state.loading = action.payload
    },
    setRefreshing: (state, action) => {
      state.refreshing = action.payload
    },
    setFinished: (state, action) => {
      state.finished = action.payload
    },
    setCategoriesLoading: (state, action) => {
      state.categoriesLoading = action.payload
    },
    clearNewsList: (state) => {
      state.newsList = []
      state.finished = false
    },
  },
})

export const {
  setNewsList,
  appendNewsList,
  setNewsDetail,
  setCategories,
  setCurrentCategory,
  setLoading,
  setRefreshing,
  setFinished,
  setCategoriesLoading,
  clearNewsList
} = newsSlice.actions

// Thunk actions
export const getCategories = () => async (dispatch, getState) => {
  const { categoriesLoading } = getState().news
  if (categoriesLoading) return

  dispatch(setCategoriesLoading(true))

  try {
    const response = await axios.get(`${apiConfig.baseURL}/api/news/categories`)

    if (response.data && response.data.code === 200) {
      dispatch(setCategories([...response.data.data, { id: 10, name: '更多' }]))
    }
  } catch (error) {
    console.error('获取新闻分类失败:', error)
    // 设置默认分类
    dispatch(setCategories([
      { id: 1, name: '头条' },
      { id: 2, name: '社会' },
      { id: 3, name: '国内' },
      { id: 4, name: '国际' },
      { id: 5, name: '娱乐' },
      { id: 6, name: '体育' },
      { id: 7, name: '科技' }
    ]))
  } finally {
    dispatch(setCategoriesLoading(false))
  }
}

export const getNewsList = (isRefresh = false) => async (dispatch, getState) => {
  const { newsList, currentCategory } = getState().news

  if (isRefresh) {
    dispatch(setRefreshing(true))
    dispatch(setNewsList([]))
    dispatch(setFinished(false))
  }

  dispatch(setLoading(true))

  try {
    const params = {
      categoryId: currentCategory,
      page: isRefresh ? 1 : Math.ceil(newsList.length / 10) + 1,
      pageSize: 10
    }

    const response = await axios.get(`${apiConfig.baseURL}/api/news/list`, { params })

    if (response.data && response.data.code === 200) {
      const newsData = response.data.data.list

      if (isRefresh) {
        dispatch(setNewsList(newsData))
      } else {
        dispatch(appendNewsList(newsData))
      }

      if (newsData.length < params.pageSize) {
        dispatch(setFinished(true))
      }
    }
  } catch (error) {
    console.error('获取新闻列表失败:', error)
  } finally {
    dispatch(setLoading(false))
    dispatch(setRefreshing(false))
  }
}

export const getNewsDetail = (id) => async (dispatch) => {
  try {
    const response = await axios.get(`${apiConfig.baseURL}/api/news/detail?id=${id}`)

    if (response.data && response.data.code === 200) {
      dispatch(setNewsDetail(response.data.data))
    }
  } catch (error) {
    console.error('获取新闻详情失败:', error)
  }
}

export const changeCategory = (categoryId) => (dispatch) => {
  dispatch(setCurrentCategory(categoryId))
  dispatch(clearNewsList())
  dispatch(getNewsList(true))
}

export const getCategoryName = (categories, categoryId) => {
  const category = categories.find(item => item.id === categoryId)
  return category ? category.name : '未知'
}

export default newsSlice.reducer