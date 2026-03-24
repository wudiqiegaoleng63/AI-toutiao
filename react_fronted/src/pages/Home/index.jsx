import React, { useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { NavBar, Tabs, PullToRefresh, InfiniteScroll, Empty } from 'antd-mobile'
import { useTranslation } from 'react-i18next'
import { getCategories, getNewsList, changeCategory } from '../../store/newsSlice'
import NewsItem from '../../components/NewsItem'
import TabBar from '../../components/TabBar'
import './index.css'

const Home = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { t } = useTranslation()

  const { newsList, categories, currentCategory, loading, refreshing, finished } = useSelector(state => state.news)
  const [activeTab, setActiveTab] = useState(0)

  // 获取分类名称的翻译
  const getCategoryTranslation = (categoryName) => {
    const categoryMap = {
      '头条': 'headline',
      '社会': 'society',
      '国内': 'domestic',
      '国际': 'international',
      '娱乐': 'entertainment',
      '体育': 'sports',
      '军事': 'military',
      '科技': 'technology',
      '财经': 'finance',
      '更多': 'more'
    }
    const key = categoryMap[categoryName]
    return key ? t(`home.categories.${key}`) : categoryName
  }

  // 监听路由参数变化
  useEffect(() => {
    const categoryId = searchParams.get('categoryId')
    if (categoryId) {
      const id = parseInt(categoryId)
      const filteredCategories = categories.filter(c => c.name !== '更多')
      const index = filteredCategories.findIndex(c => c.id === id)
      if (index !== -1) {
        setActiveTab(index)
        dispatch(changeCategory(id))
      }
    }
  }, [searchParams, categories, dispatch])

  // 初始化加载
  useEffect(() => {
    dispatch(getCategories()).then(() => {
      dispatch(getNewsList())
    })
  }, [dispatch])

  // 监听分类变化
  useEffect(() => {
    if (categories.length > 0) {
      const filteredCategories = categories.filter(c => c.name !== '更多')
      const index = filteredCategories.findIndex(c => c.id === currentCategory)
      if (index !== -1) {
        setActiveTab(index)
      }
    }
  }, [currentCategory, categories])

  // 下拉刷新
  const onRefresh = async () => {
    await dispatch(getNewsList(true))
  }

  // 上拉加载更多
  const onLoadMore = async () => {
    if (!finished) {
      await dispatch(getNewsList())
    }
  }

  // 切换分类
  const onTabChange = (key) => {
    const index = parseInt(key)
    const filteredCategories = categories.filter(c => c.name !== '更多')
    if (filteredCategories[index] && filteredCategories[index].id !== currentCategory) {
      dispatch(changeCategory(filteredCategories[index].id))
    }
  }

  // 显示的分类（排除"更多"）
  const displayCategories = categories.filter(c => c.name !== '更多')

  return (
    <div className="home">
      <NavBar>{t('home.title')}</NavBar>

      <div className="more-options">
        <div className="more-tab" onClick={() => navigate('/category')}>
          {t('home.more')} <span className="arrow">→</span>
        </div>
      </div>

      <div className="category-tabs">
        {displayCategories.length > 0 && (
          <Tabs
            activeKey={String(activeTab)}
            onChange={onTabChange}
          >
            {displayCategories.map((category, index) => (
              <Tabs.Tab
                key={String(index)}
                title={getCategoryTranslation(category.name)}
              >
                <PullToRefresh onRefresh={onRefresh}>
                  <div className="news-list">
                    {newsList.map(news => (
                      <NewsItem key={news.id} news={news} />
                    ))}
                    {newsList.length === 0 && !loading && (
                      <Empty description="暂无新闻" />
                    )}
                  </div>
                  <InfiniteScroll
                    loadMore={onLoadMore}
                    hasMore={!finished}
                  >
                    {finished ? t('home.noMore') : t('home.loading')}
                  </InfiniteScroll>
                </PullToRefresh>
              </Tabs.Tab>
            ))}
          </Tabs>
        )}
      </div>

      <TabBar />
    </div>
  )
}

export default Home