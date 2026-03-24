import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { TabBar as AntTabBar } from 'antd-mobile'
import { AppOutline, MessageOutline, SetOutline, UserOutline } from 'antd-mobile-icons'
import { useTranslation } from 'react-i18next'
import './index.css'

const TabBar = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()

  const tabs = [
    {
      key: '/home',
      title: t('nav.home'),
      icon: <AppOutline />,
    },
    {
      key: '/aichat',
      title: t('nav.aiChat'),
      icon: <MessageOutline />,
    },
    {
      key: '/rag-manager',
      title: 'RAG管理',
      icon: <SetOutline />,
    },
    {
      key: '/my',
      title: t('nav.my'),
      icon: <UserOutline />,
    },
  ]

  return (
    <div className="tab-bar">
      <AntTabBar activeKey={location.pathname} onChange={value => navigate(value)}>
        {tabs.map(item => (
          <AntTabBar.Item key={item.key} icon={item.icon} title={item.title} />
        ))}
      </AntTabBar>
    </div>
  )
}

export default TabBar