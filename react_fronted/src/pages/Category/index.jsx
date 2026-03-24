import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { NavBar, Grid } from 'antd-mobile'
import { useTranslation } from 'react-i18next'
import { getCategories, changeCategory } from '../../store/newsSlice'
import './index.css'

const Category = () => {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { t } = useTranslation()
  const { categories } = useSelector(state => state.news)

  useEffect(() => {
    if (categories.length === 0) {
      dispatch(getCategories())
    }
  }, [dispatch, categories.length])

  const onClickLeft = () => {
    navigate(-1)
  }

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

  // 分类图标颜色
  const getCategoryColor = (index) => {
    const colors = [
      '#1989fa', '#07c160', '#ff6034', '#ff976a',
      '#646566', '#969799', '#1989fa', '#07c160', '#ff6034'
    ]
    return colors[index % colors.length]
  }

  // 点击分类
  const handleCategoryClick = (category) => {
    if (category.name === '更多') return
    dispatch(changeCategory(category.id))
    navigate(`/home?categoryId=${category.id}`)
  }

  // 过滤掉"更多"分类
  const displayCategories = categories.filter(c => c.name !== '更多')

  return (
    <div className="category-page">
      <NavBar onBack={onClickLeft}>{t('common.allCategories')}</NavBar>

      <div className="category-content">
        <Grid columns={3} gap={16}>
          {displayCategories.map((category, index) => (
            <Grid.Item
              key={category.id}
              onClick={() => handleCategoryClick(category)}
            >
              <div className="category-item">
                <div
                  className="category-icon"
                  style={{ backgroundColor: getCategoryColor(index) }}
                >
                  {category.name.charAt(0)}
                </div>
                <div className="category-name">
                  {getCategoryTranslation(category.name)}
                </div>
              </div>
            </Grid.Item>
          ))}
        </Grid>
      </div>
    </div>
  )
}

export default Category