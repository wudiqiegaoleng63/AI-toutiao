import { useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { loadUserFromStorage } from './store/userSlice'
import router from './router'

function App() {
  const dispatch = useDispatch()
  const location = useLocation()

  // 从 localStorage 恢复用户状态
  useEffect(() => {
    dispatch(loadUserFromStorage())
  }, [dispatch])

  return (
    <div className="app">
      <Routes>
        {router.map(route => (
          <Route
            key={route.path}
            path={route.path}
            element={route.element}
          />
        ))}
      </Routes>
    </div>
  )
}

export default App