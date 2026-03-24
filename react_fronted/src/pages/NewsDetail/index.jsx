import React, { useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { NavBar, Button, Empty, Toast } from 'antd-mobile'
import { StarOutline, StarFill } from 'antd-mobile-icons'
import { getNewsDetail } from '../../store/newsSlice'
import { addHistoryApi } from '../../store/historySlice'
import { toggleFavorite, checkFavoriteStatusApi, loadFavorites, isFavorite } from '../../store/favoriteSlice'
import TabBar from '../../components/TabBar'
import './index.css'

const NewsDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const dispatch = useDispatch()

  const { newsDetail } = useSelector(state => state.news)
  const { token, isLogin } = useSelector(state => state.user)
  const isFav = useSelector(state => isFavorite(state, Number(id)))

  useEffect(() => {
    dispatch(getNewsDetail(id))
    dispatch(loadFavorites())

    // 检查收藏状态
    if (isLogin && id) {
      dispatch(checkFavoriteStatusApi(id))
    }
  }, [dispatch, id, isLogin])

  useEffect(() => {
    // 记录浏览历史
    if (newsDetail.id && isLogin) {
      dispatch(addHistoryApi(newsDetail.id))
    }
  }, [newsDetail.id, isLogin, dispatch])

  const onClickLeft = () => {
    navigate(-1)
  }

  const goToRelatedNews = (relatedId) => {
    navigate(`/news/detail/${relatedId}`)
  }

  const handleToggleFavorite = async () => {
    if (!isLogin) {
      Toast.show({
        content: '请先登录后再收藏',
        position: 'bottom',
      })
      navigate('/login')
      return
    }

    const result = await dispatch(toggleFavorite(newsDetail))
    if (result.success) {
      Toast.show({
        content: result.message,
        position: 'bottom',
      })
    } else {
      Toast.show({
        content: result.message || '操作失败，请稍后重试',
        position: 'bottom',
      })
    }
  }

  // 将内容拆分为段落
  const contentParagraphs = useMemo(() => {
    if (!newsDetail.content) return []
    return newsDetail.content.split('\n\n').filter(p => p.trim())
  }, [newsDetail.content])

  return (
    <div className="news-detail">
      <NavBar onBack={onClickLeft}>新闻详情</NavBar>

      {newsDetail.id ? (
        <div className="detail-content">
          <div className="title-container">
            <h1 className="title">{newsDetail.title}</h1>
            <Button
              className={`favorite-btn ${isFav ? 'is-favorite' : ''}`}
              onClick={handleToggleFavorite}
            >
              {isFav ? <StarFill fontSize={20} /> : <StarOutline fontSize={20} />}
            </Button>
          </div>

          <div className="info">
            <span>{newsDetail.author || '新闻资讯'}</span>
            <span>{newsDetail.publishTime}</span>
            <span>{newsDetail.views || 0} 阅读</span>
          </div>

          {newsDetail.image && (
            <div className="cover">
              <img src={newsDetail.image} alt={newsDetail.title} />
            </div>
          )}

          <div className="content">
            {contentParagraphs.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>

          {newsDetail.relatedNews && newsDetail.relatedNews.length > 0 && (
            <div className="related-news">
              <h3>相关推荐</h3>
              <div className="related-list">
                {newsDetail.relatedNews.map(item => (
                  <div
                    key={item.id}
                    className="related-item"
                    onClick={() => goToRelatedNews(item.id)}
                  >
                    <div className="related-image">
                      <img src={item.image} alt={item.title} />
                    </div>
                    <div className="related-title">{item.title}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <Empty description="加载中..." />
      )}

      <TabBar />
    </div>
  )
}

export default NewsDetail