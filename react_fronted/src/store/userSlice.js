import { createSlice } from '@reduxjs/toolkit'
import axios from 'axios'
import { apiConfig } from '../config/api'

const initialState = {
  userInfo: null,
  token: '',
  isLogin: false,
  userBio: '这是我的个人简介'
}

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUserInfo: (state, action) => {
      state.userInfo = action.payload
    },
    setToken: (state, action) => {
      state.token = action.payload
    },
    setLoginStatus: (state, action) => {
      state.isLogin = action.payload
    },
    logout: (state) => {
      state.userInfo = null
      state.token = ''
      state.isLogin = false
      localStorage.removeItem('user-store')
    },
    updateUserBio: (state, action) => {
      if (state.userInfo) {
        state.userInfo.bio = action.payload
      }
    },
    loadUserFromStorage: (state) => {
      try {
        const saved = localStorage.getItem('user-store')
        if (saved) {
          const parsed = JSON.parse(saved)
          if (parsed.token && parsed.userInfo) {
            state.userInfo = parsed.userInfo
            state.token = parsed.token
            state.isLogin = parsed.isLogin
          }
        }
      } catch (e) {
        console.error('Failed to load user from storage:', e)
      }
    },
  },
})

export const { setUserInfo, setToken, setLoginStatus, logout, updateUserBio, loadUserFromStorage } = userSlice.actions

// Thunk actions
export const login = (userData) => async (dispatch) => {
  try {
    const response = await axios.post(`${apiConfig.baseURL}/api/users/login`, {
      username: userData.username,
      password: userData.password
    })

    if (response.data && response.data.code === 200) {
      const userInfo = response.data.data.userInfo
      const token = response.data.data.token

      dispatch(setUserInfo(userInfo))
      dispatch(setToken(token))
      dispatch(setLoginStatus(true))

      // 持久化到 localStorage
      localStorage.setItem('user-store', JSON.stringify({
        userInfo,
        token,
        isLogin: true
      }))

      return { success: true, message: '登录成功' }
    } else {
      return { success: false, message: response.data.message || '登录失败' }
    }
  } catch (error) {
    console.error('登录请求失败:', error)
    return {
      success: false,
      message: error.response?.data?.message || '登录请求失败，请稍后再试'
    }
  }
}

export const register = (userData) => async (dispatch) => {
  try {
    const response = await axios.post(`${apiConfig.baseURL}/api/users/register`, {
      username: userData.username,
      password: userData.password
    })

    if (response.data && response.data.code === 200) {
      const userInfo = response.data.data.userInfo
      const token = response.data.data.token

      dispatch(setUserInfo(userInfo))
      dispatch(setToken(token))
      dispatch(setLoginStatus(true))

      localStorage.setItem('user-store', JSON.stringify({
        userInfo,
        token,
        isLogin: true
      }))

      return { success: true, message: '注册成功' }
    } else {
      return { success: false, message: response.data.message || '注册失败' }
    }
  } catch (error) {
    console.error('注册请求失败:', error)
    return {
      success: false,
      message: error.response?.data?.message || '注册请求失败，请稍后再试'
    }
  }
}

export const getUserInfoDetail = () => async (dispatch, getState) => {
  try {
    const { token, isLogin } = getState().user
    if (!token || !isLogin) {
      return { success: false, message: '未登录' }
    }

    const response = await axios.get(`${apiConfig.baseURL}/api/users/info`, {
      headers: {
        Authorization: token
      }
    })

    if (response.data && response.data.code === 200) {
      dispatch(setUserInfo(response.data.data))
      return { success: true, message: '获取用户信息成功', data: response.data.data }
    } else {
      return { success: false, message: response.data.message || '获取用户信息失败' }
    }
  } catch (error) {
    console.error('获取用户信息请求失败:', error)
    return {
      success: false,
      message: error.response?.data?.message || '获取用户信息请求失败，请稍后再试'
    }
  }
}

export const updateUserBioApi = (bio) => async (dispatch, getState) => {
  try {
    const { token } = getState().user
    if (!token) {
      return { success: false, message: '未登录' }
    }

    const response = await axios.put(`${apiConfig.baseURL}/api/users/update`,
      { bio },
      {
        headers: {
          Authorization: token
        }
      }
    )

    if (response.data && response.data.code === 200) {
      dispatch(updateUserBio(bio))
      return { success: true, message: '更新个人简介成功' }
    } else {
      return { success: false, message: response.data.message || '更新个人简介失败' }
    }
  } catch (error) {
    console.error('更新个人简介请求失败:', error)
    return {
      success: false,
      message: error.response?.data?.message || '更新个人简介请求失败，请稍后再试'
    }
  }
}

export const updatePassword = (oldPassword, newPassword) => async (dispatch, getState) => {
  try {
    const { token } = getState().user
    if (!token) {
      return { success: false, message: '未登录' }
    }

    const response = await axios.put(`${apiConfig.baseURL}/api/users/password`,
      {
        oldPassword,
        newPassword
      },
      {
        headers: {
          Authorization: token
        }
      }
    )

    if (response.data && response.data.code === 200) {
      return { success: true, message: '密码修改成功' }
    } else {
      return { success: false, message: response.data.message || '密码修改失败' }
    }
  } catch (error) {
    console.error('修改密码请求失败:', error)
    return {
      success: false,
      message: error.response?.data?.message || '修改密码请求失败，请稍后再试'
    }
  }
}

export default userSlice.reducer