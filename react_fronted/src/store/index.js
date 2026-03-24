import { configureStore } from '@reduxjs/toolkit'
import userReducer from './userSlice'
import newsReducer from './newsSlice'
import favoriteReducer from './favoriteSlice'
import historyReducer from './historySlice'
import themeReducer from './themeSlice'
import languageReducer from './languageSlice'
import aiChatReducer from './aiChatSlice'

const store = configureStore({
  reducer: {
    user: userReducer,
    news: newsReducer,
    favorite: favoriteReducer,
    history: historyReducer,
    theme: themeReducer,
    language: languageReducer,
    aiChat: aiChatReducer,
  },
})

export default store