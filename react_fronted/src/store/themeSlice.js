import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  theme: localStorage.getItem('theme') || 'light'
}

const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    setTheme: (state, action) => {
      state.theme = action.payload
      localStorage.setItem('theme', action.payload)
      document.documentElement.setAttribute('data-theme', action.payload)
    },
    toggleTheme: (state) => {
      const newTheme = state.theme === 'light' ? 'dark' : 'light'
      state.theme = newTheme
      localStorage.setItem('theme', newTheme)
      document.documentElement.setAttribute('data-theme', newTheme)
    },
    initTheme: (state) => {
      document.documentElement.setAttribute('data-theme', state.theme)
    },
  },
})

export const { setTheme, toggleTheme, initTheme } = themeSlice.actions

export default themeSlice.reducer