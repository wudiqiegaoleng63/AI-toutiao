import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { NavBar, List, Input, Button, TextArea, Toast, Avatar } from 'antd-mobile'
import { updateUserBioApi, getUserInfoDetail } from '../../store/userSlice'
import './index.css'

const Profile = () => {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { userInfo, isLogin } = useSelector(state => state.user)
  const [bio, setBio] = useState(userInfo?.bio || '')
  const [loading, setLoading] = useState(false)

  const onClickLeft = () => {
    navigate(-1)
  }

  const handleSave = async () => {
    if (!isLogin) {
      Toast.show({ content: '请先登录' })
      return
    }

    setLoading(true)
    try {
      const result = await dispatch(updateUserBioApi(bio))
      if (result.success) {
        Toast.show({ icon: 'success', content: '保存成功' })
        dispatch(getUserInfoDetail())
      } else {
        Toast.show({ icon: 'fail', content: result.message || '保存失败' })
      }
    } catch (error) {
      Toast.show({ icon: 'fail', content: '保存失败' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="profile-page">
      <NavBar onBack={onClickLeft}>个人信息</NavBar>

      <div className="profile-content">
        <div className="avatar-section">
          <Avatar
            src={userInfo?.avatar || 'https://fastly.jsdelivr.net/npm/@vant/assets/cat.jpeg'}
            style={{ '--size': '80px', '--border-radius': '50%' }}
          />
        </div>

        <List header="基本信息" className="profile-list">
          <List.Item>
            用户名
            <span className="value">{userInfo?.username || '-'}</span>
          </List.Item>
          <List.Item>
            昵称
            <span className="value">{userInfo?.nickname || '-'}</span>
          </List.Item>
        </List>

        <div className="bio-section">
          <div className="bio-label">个人简介</div>
          <TextArea
            placeholder="请输入个人简介"
            value={bio}
            onChange={setBio}
            rows={3}
            maxLength={200}
            showCount
          />
        </div>

        <div className="save-section">
          <Button block color="primary" size="large" onClick={handleSave} loading={loading}>
            保存修改
          </Button>
        </div>
      </div>
    </div>
  )
}

export default Profile