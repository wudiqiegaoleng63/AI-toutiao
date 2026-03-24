import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { NavBar, Form, Input, Button, Toast, Image } from 'antd-mobile'
import { register } from '../../store/userSlice'
import './index.css'

const Register = () => {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const [loading, setLoading] = useState(false)

  const onFinish = async (values) => {
    setLoading(true)
    try {
      const result = await dispatch(register(values))
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
        content: '注册失败，请稍后再试',
      })
    } finally {
      setLoading(false)
    }
  }

  const onClickLeft = () => {
    navigate(-1)
  }

  return (
    <div className="register-page">
      <NavBar onBack={onClickLeft}>用户注册</NavBar>

      <div className="register-container">
        <div className="register-logo">
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
              注册
            </Button>
          }
        >
          <Form.Item
            name="username"
            label="用户名"
            rules={[
              { required: true, message: '请填写用户名' },
              { min: 3, message: '用户名至少3个字符' }
            ]}
          >
            <Input placeholder="请输入用户名" />
          </Form.Item>
          <Form.Item
            name="password"
            label="密码"
            rules={[
              { required: true, message: '请填写密码' },
              { min: 6, message: '密码至少6个字符' }
            ]}
          >
            <Input placeholder="请输入密码" type="password" />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label="确认密码"
            rules={[
              { required: true, message: '请确认密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve()
                  }
                  return Promise.reject(new Error('两次密码不一致'))
                },
              }),
            ]}
          >
            <Input placeholder="请再次输入密码" type="password" />
          </Form.Item>
        </Form>

        <div className="login-link">
          已有账号？<span onClick={() => navigate('/login')}>去登录</span>
        </div>
      </div>
    </div>
  )
}

export default Register