import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { NavBar, Form, Input, Button, Toast, Image } from 'antd-mobile'
import { login } from '../../store/userSlice'
import './index.css'

const Login = () => {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const [loading, setLoading] = useState(false)

  const onFinish = async (values) => {
    setLoading(true)
    try {
      const result = await dispatch(login(values))
      if (result.success) {
        Toast.show({
          icon: 'success',
          content: result.message,
        })
        navigate('/')
      } else {
        Toast.show({
          icon: 'fail',
          content: result.message,
        })
      }
    } catch (error) {
      Toast.show({
        icon: 'fail',
        content: '登录失败，请稍后再试',
      })
    } finally {
      setLoading(false)
    }
  }

  const onClickLeft = () => {
    navigate(-1)
  }

  return (
    <div className="login-page">
      <NavBar onBack={onClickLeft}>用户登录</NavBar>

      <div className="login-container">
        <div className="login-logo">
          <Image
            src="https://fastly.jsdelivr.net/npm/@vant/assets/cat.jpeg"
            style={{ width: 80, height: 80, borderRadius: '50%' }}
          />
          <h2>新闻资讯</h2>
        </div>

        <Form
          onFinish={onFinish}
          footer={
            <Button block type="submit" color="primary" size="large" loading={loading}>
              登录
            </Button>
          }
        >
          <Form.Item name="username" label="用户名" rules={[{ required: true, message: '请填写用户名' }]}>
            <Input placeholder="请输入用户名" />
          </Form.Item>
          <Form.Item name="password" label="密码" rules={[{ required: true, message: '请填写密码' }]}>
            <Input placeholder="请输入密码" type="password" />
          </Form.Item>
        </Form>

        <div className="login-tips">
          <p>测试账号：admin</p>
          <p>测试密码：123456</p>
        </div>

        <div className="register-link">
          还没有账号？<span onClick={() => navigate('/register')}>去注册</span>
        </div>
      </div>
    </div>
  )
}

export default Login