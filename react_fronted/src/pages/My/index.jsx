import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { NavBar, List, Avatar, Button, Dialog } from 'antd-mobile'
import {
  StarOutline,
  ClockCircleOutline,
  BellOutline,
  SetOutline,
  CloseCircleOutline
} from 'antd-mobile-icons'
import { useTranslation } from 'react-i18next'
import { logout } from '../../store/userSlice'
import { getUserInfoDetail } from '../../store/userSlice'
import TabBar from '../../components/TabBar'
import './index.css'

const My = () => {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { t } = useTranslation()

  const { userInfo, isLogin, token } = useSelector(state => state.user)

  useEffect(() => {
    if (isLogin && token) {
      dispatch(getUserInfoDetail())
    }
  }, [isLogin, token, dispatch])

  const handleLogout = async () => {
    const result = await Dialog.confirm({
      content: '确定要退出登录吗？',
    })
    if (result) {
      dispatch(logout())
      localStorage.removeItem('user-store')
    }
  }

  const menuItems = [
    {
      icon: <StarOutline />,
      text: t('my.myFavorite'),
      path: '/favorite',
    },
    {
      icon: <ClockCircleOutline />,
      text: t('my.browsingHistory'),
      path: '/history',
    },
    {
      icon: <BellOutline />,
      text: t('my.notifications'),
      onClick: () => {},
    },
    {
      icon: <SetOutline />,
      text: t('my.settings'),
      path: '/settings',
    },
  ]

  return (
    <div className="my-page">
      <NavBar>{t('my.title')}</NavBar>

      <div className="user-section">
        {isLogin ? (
          <div className="user-info" onClick={() => navigate('/profile')}>
            <Avatar
              src={userInfo?.avatar || 'https://fastly.jsdelivr.net/npm/@vant/assets/cat.jpeg'}
              style={{ '--size': '60px', '--border-radius': '50%' }}
            />
            <div className="user-detail">
              <div className="username">{userInfo?.username || '用户'}</div>
              <div className="bio">{userInfo?.bio || '这个人很懒，什么都没留下'}</div>
            </div>
          </div>
        ) : (
          <div className="login-prompt">
            <Avatar
              src="https://fastly.jsdelivr.net/npm/@vant/assets/cat.jpeg"
              style={{ '--size': '60px', '--border-radius': '50%' }}
            />
            <div className="login-actions">
              <Button color="primary" size="small" onClick={() => navigate('/login')}>
                {t('my.goToLogin')}
              </Button>
              <Button size="small" onClick={() => navigate('/register')}>
                {t('my.goToRegister')}
              </Button>
            </div>
          </div>
        )}
      </div>

      <List header="" className="menu-list">
        {menuItems.map((item, index) => (
          <List.Item
            key={index}
            prefix={item.icon}
            onClick={() => item.path ? navigate(item.path) : item.onClick?.()}
            arrow
          >
            {item.text}
          </List.Item>
        ))}
      </List>

      {isLogin && (
        <div className="logout-section">
          <Button block color="danger" fill="outline" onClick={handleLogout}>
            <CloseCircleOutline /> {t('my.logout')}
          </Button>
        </div>
      )}

      <TabBar />
    </div>
  )
}

export default My