import Home from '../pages/Home'
import Login from '../pages/Login'
import Register from '../pages/Register'
import NewsDetail from '../pages/NewsDetail'
import History from '../pages/History'
import Favorite from '../pages/Favorite'
import Category from '../pages/Category'
import AIChat from '../pages/AIChat'
import RAGManager from '../pages/RAGManager'
import My from '../pages/My'
import Profile from '../pages/Profile'
import Settings from '../pages/Settings'

const router = [
  {
    path: '/',
    element: <Home />,
  },
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/register',
    element: <Register />,
  },
  {
    path: '/home',
    element: <Home />,
  },
  {
    path: '/news/detail/:id',
    element: <NewsDetail />,
  },
  {
    path: '/history',
    element: <History />,
  },
  {
    path: '/favorite',
    element: <Favorite />,
  },
  {
    path: '/category',
    element: <Category />,
  },
  {
    path: '/aichat',
    element: <AIChat />,
  },
  {
    path: '/rag-manager',
    element: <RAGManager />,
  },
  {
    path: '/my',
    element: <My />,
  },
  {
    path: '/profile',
    element: <Profile />,
  },
  {
    path: '/settings',
    element: <Settings />,
  },
]

export default router