import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { NavBar, List, Picker, Dialog } from 'antd-mobile'
import { useTranslation } from 'react-i18next'
import { setTheme } from '../../store/themeSlice'
import { setLanguage } from '../../store/languageSlice'
import './index.css'

const Settings = () => {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { t, i18n } = useTranslation()

  const { theme } = useSelector(state => state.theme)
  const { language } = useSelector(state => state.language)

  const onClickLeft = () => {
    navigate(-1)
  }

  // 主题选项
  const themeOptions = [
    { label: '浅色', value: 'light' },
    { label: '深色', value: 'dark' },
  ]

  // 语言选项
  const languageOptions = [
    { label: '中文', value: 'zh-CN' },
    { label: 'English', value: 'en-US' },
  ]

  // 切换主题
  const handleThemeChange = async () => {
    const value = await Picker.picker({
      columns: [themeOptions],
      defaultValue: [theme],
    })
    if (value) {
      dispatch(setTheme(value[0]))
      Dialog.alert({ content: t('settings.themeChanged') })
    }
  }

  // 切换语言
  const handleLanguageChange = async () => {
    const value = await Picker.picker({
      columns: [languageOptions],
      defaultValue: [language],
    })
    if (value) {
      dispatch(setLanguage(value[0]))
      i18n.changeLanguage(value[0])
      Dialog.alert({ content: t('settings.languageChanged') })
    }
  }

  // 获取当前主题名称
  const getThemeName = () => {
    return theme === 'light' ? '浅色' : '深色'
  }

  // 获取当前语言名称
  const getLanguageName = () => {
    return language === 'zh-CN' ? '中文' : 'English'
  }

  return (
    <div className="settings-page">
      <NavBar onBack={onClickLeft}>{t('settings.title')}</NavBar>

      <List header={t('settings.personalization')} className="settings-list">
        <List.Item onClick={handleThemeChange} arrow>
          {t('settings.themeCustomization')}
          <span className="value">{getThemeName()}</span>
        </List.Item>
        <List.Item onClick={handleLanguageChange} arrow>
          {t('settings.languageSettings')}
          <span className="value">{getLanguageName()}</span>
        </List.Item>
      </List>

      <List header={t('settings.account')} className="settings-list">
        <List.Item arrow>
          {t('settings.privacySettings')}
        </List.Item>
        <List.Item arrow>
          {t('settings.notificationSettings')}
        </List.Item>
      </List>

      <List className="settings-list">
        <List.Item arrow>
          {t('settings.aboutUs')}
        </List.Item>
      </List>
    </div>
  )
}

export default Settings