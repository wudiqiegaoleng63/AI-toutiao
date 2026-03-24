import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { NavBar, Empty, PullToRefresh, InfiniteScroll, Button, Dialog } from 'antd-mobile'
import { getFavoriteList, removeFavoriteApi } from '../../store/favoriteSlice'
import NewsItem from '../../components/NewsItem'
import TabBar from '../../components/TabBar'
import './index.css'

const Favorite = () => {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { isLogin } = useSelector(state => state.user)

  const [list, setList] = useState([])
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isLogin) {
      loadData(1, true)
    }
  }, [isLogin])

  const loadData = async (pageNum = page, refresh = false) => {
    if (loading) return
    setLoading(true)
    try {
      const result = await dispatch(getFavoriteList(pageNum, 10))
      if (result.success) {
        if (refresh) {
          setList(result.list)
        } else {
          setList(prev => [...prev, ...result.list])
        }
        setTotal(result.total)
        setHasMore(result.hasMore)
        setPage(pageNum + 1)
      }
    } finally {
      setLoading(false)
    }
  }

  const onRefresh = async () => {
    await loadData(1, true)
  }

  const onLoadMore = async () => {
    if (hasMore && !loading) {
      await loadData(page)
    }
  }

  const handleRemove = async (newsId) => {
    const result = await Dialog.confirm({
      content: '确定取消收藏吗？',
    })
    if (result) {
      const res = await dispatch(removeFavoriteApi(newsId))
      if (res.success) {
        setList(prev => prev.filter(item => item.id !== newsId))
      }
    }
  }

  const goToDetail = (id) => {
    navigate(`/news/detail/${id}`)
  }

  if (!isLogin) {
    return (
      <div className="favorite-page">
        <NavBar onBack={() => navigate(-1)}>我的收藏</NavBar>
        <div className="not-login">
          <Empty description="请先登录" />
          <Button color="primary" onClick={() => navigate('/login')}>去登录</Button>
        </div>
        <TabBar />
      </div>
    )
  }

  return (
    <div className="favorite-page">
      <NavBar onBack={() => navigate(-1)}>我的收藏</NavBar>

      <div className="favorite-content">
        <PullToRefresh onRefresh={onRefresh}>
          {list.length > 0 ? (
            <>
              {list.map(item => (
                <div key={item.id || item.favorite_id} className="favorite-item">
                  <div onClick={() => goToDetail(item.id)}>
                    <NewsItem news={item} />
                  </div>
                  <Button
                    size="small"
                    fill="outline"
                    color="danger"
                    onClick={() => handleRemove(item.id)}
                  >
                    取消收藏
                  </Button>
                </div>
              ))}
              <InfiniteScroll loadMore={onLoadMore} hasMore={hasMore}>
                {hasMore ? '加载中...' : '没有更多了'}
              </InfiniteScroll>
            </>
          ) : (
            <Empty description="暂无收藏" />
          )}
        </PullToRefresh>
      </div>

      <TabBar />
    </div>
  )
}

export default Favorite