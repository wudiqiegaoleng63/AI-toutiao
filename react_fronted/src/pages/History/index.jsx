import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { NavBar, Empty, PullToRefresh, InfiniteScroll, Button, Dialog, SwipeAction } from 'antd-mobile'
import { getHistoryListApi, deleteHistoryApi, clearHistoryApi } from '../../store/historySlice'
import NewsItem from '../../components/NewsItem'
import TabBar from '../../components/TabBar'
import './index.css'

const History = () => {
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
      const result = await dispatch(getHistoryListApi(pageNum, 10))
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

  const handleDelete = async (historyId) => {
    const result = await dispatch(deleteHistoryApi(historyId))
    if (result.success) {
      setList(prev => prev.filter(item => item.history_id !== historyId))
    }
  }

  const handleClear = async () => {
    const result = await Dialog.confirm({
      content: '确定清空所有浏览历史吗？',
    })
    if (result) {
      const res = await dispatch(clearHistoryApi())
      if (res.success) {
        setList([])
      }
    }
  }

  const goToDetail = (id) => {
    navigate(`/news/detail/${id}`)
  }

  if (!isLogin) {
    return (
      <div className="history-page">
        <NavBar onBack={() => navigate(-1)}>浏览历史</NavBar>
        <div className="not-login">
          <Empty description="请先登录" />
          <Button color="primary" onClick={() => navigate('/login')}>去登录</Button>
        </div>
        <TabBar />
      </div>
    )
  }

  return (
    <div className="history-page">
      <NavBar
        onBack={() => navigate(-1)}
        right={
          list.length > 0 && (
            <Button size="small" fill="outline" color="danger" onClick={handleClear}>
              清空
            </Button>
          )
        }
      >
        浏览历史
      </NavBar>

      <div className="history-content">
        <PullToRefresh onRefresh={onRefresh}>
          {list.length > 0 ? (
            <>
              {list.map(item => (
                <SwipeAction
                  key={item.history_id || item.id}
                  rightActions={[
                    {
                      key: 'delete',
                      text: '删除',
                      color: 'danger',
                      onClick: () => handleDelete(item.history_id),
                    },
                  ]}
                >
                  <div onClick={() => goToDetail(item.id)}>
                    <NewsItem news={item} />
                  </div>
                </SwipeAction>
              ))}
              <InfiniteScroll loadMore={onLoadMore} hasMore={hasMore}>
                {hasMore ? '加载中...' : '没有更多了'}
              </InfiniteScroll>
            </>
          ) : (
            <Empty description="暂无浏览历史" />
          )}
        </PullToRefresh>
      </div>

      <TabBar />
    </div>
  )
}

export default History