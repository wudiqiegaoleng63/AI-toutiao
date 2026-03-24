import React from 'react'
import { useNavigate } from 'react-router-dom'
import './index.css'

const NewsItem = ({ news }) => {
  const navigate = useNavigate()

  const handleClick = () => {
    navigate(`/news/detail/${news.id}`)
  }

  return (
    <div className="news-item" onClick={handleClick}>
      <div className="news-content">
        <h3 className="news-title">{news.title}</h3>
        <p className="news-description">{news.description}</p>
        <div className="news-meta">
          <span className="news-author">{news.author || '新闻资讯'}</span>
          <span className="news-views">{news.views || 0} 阅读</span>
        </div>
      </div>
      {news.image && (
        <div className="news-image">
          <img src={news.image} alt={news.title} />
        </div>
      )}
    </div>
  )
}

export default NewsItem