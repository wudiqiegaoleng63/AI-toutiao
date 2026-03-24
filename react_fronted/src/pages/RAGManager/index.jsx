/**
 * RAG 管理页面
 *
 * 功能：
 * - 统计信息展示
 * - 文档上传与管理
 * - RAG 配置设置
 * - 高级设置（查询重写、混合检索、重排序）
 */

import React, { useEffect, useState, useRef } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import {
  NavBar,
  Card,
  Button,
  List,
  Switch,
  Slider,
  Dialog,
  Toast,
  DotLoading,
  Empty
} from 'antd-mobile'
import {
  FileOutline,
  DeleteOutline,
  AddCircleOutline,
  CheckCircleFill,
  SetOutline
} from 'antd-mobile-icons'
import {
  fetchDocuments,
  fetchDocumentStats,
  uploadDocument,
  deleteDocumentById,
  batchDeleteDocuments,
  clearAllDocuments
} from '../../store/aiChatSlice'
import TabBar from '../../components/TabBar'
import './index.css'

// 支持的文件类型
const SUPPORTED_TYPES = ['.pdf', '.docx', '.doc', '.txt', '.md', '.csv']

const RAGManager = () => {
  const dispatch = useDispatch()
  const fileInputRef = useRef(null)

  // 本地状态 - RAG 配置
  const [ragConfig, setRagConfig] = useState({
    k: 5,              // 检索数量
    chunkSize: 500,    // 分块大小
    chunkOverlap: 50,  // 分块重叠
    useRewrite: true,  // 查询重写
    useHybrid: true,   // 混合检索
    useRerank: true    // 重排序
  })

  // 从 Redux 获取状态
  const { documents = [], documentStats, isLoading } = useSelector(
    (state) => state.aiChat
  )
  const { isLogin } = useSelector((state) => state.user)

  // 加载数据
  useEffect(() => {
    if (isLogin) {
      dispatch(fetchDocuments())
      dispatch(fetchDocumentStats())
    }
  }, [dispatch, isLogin])

  /**
   * 上传文件
   */
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 检查文件类型
    const ext = '.' + file.name.split('.').pop().toLowerCase()
    if (!SUPPORTED_TYPES.includes(ext)) {
      Toast.show({
        content: `不支持的文件类型，支持: ${SUPPORTED_TYPES.join(', ')}`,
        icon: 'fail'
      })
      return
    }

    // 检查文件大小
    if (file.size > 50 * 1024 * 1024) {
      Toast.show({ content: '文件过大，最大支持 50MB', icon: 'fail' })
      return
    }

    Toast.show({ icon: <DotLoading color='white' />, content: '上传中...' })
    const result = await dispatch(uploadDocument(file))

    if (uploadDocument.fulfilled.match(result)) {
      Toast.show({ content: '上传成功', icon: 'success' })
      dispatch(fetchDocuments())
      dispatch(fetchDocumentStats())
    } else {
      Toast.show({ content: result.payload || '上传失败', icon: 'fail' })
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  /**
   * 删除单个文档
   */
  const handleDelete = async (docId, filename) => {
    const result = await Dialog.confirm({
      content: `确定要删除"${filename}"吗？`,
      confirmText: '删除',
      cancelText: '取消'
    })

    if (result) {
      const deleteResult = await dispatch(deleteDocumentById(docId))
      if (deleteDocumentById.fulfilled.match(deleteResult)) {
        Toast.show({ content: '删除成功', icon: 'success' })
        dispatch(fetchDocumentStats())
      }
    }
  }

  /**
   * 清空所有文档
   */
  const handleClearAll = async () => {
    const result = await Dialog.confirm({
      content: '确定要清空所有文档吗？此操作不可恢复！',
      confirmText: '清空',
      cancelText: '取消'
    })

    if (result) {
      const clearResult = await dispatch(clearAllDocuments())
      if (clearAllDocuments.fulfilled.match(clearResult)) {
        Toast.show({ content: '已清空', icon: 'success' })
      }
    }
  }

  /**
   * 获取文件图标
   */
  const getFileIcon = (fileType) => {
    const icons = {
      pdf: '📕',
      docx: '📘',
      doc: '📘',
      txt: '📄',
      md: '📝',
      csv: '📊'
    }
    return icons[fileType] || '📄'
  }

  return (
    <div className="rag-manager">
      <NavBar back={null}>RAG 管理</NavBar>

      <div className="rag-content">
        {/* 统计信息 */}
        <Card title="📊 统计信息" className="rag-card">
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-value">{documentStats?.total_documents || 0}</span>
              <span className="stat-label">文档总数</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{documentStats?.collection_name || '-'}</span>
              <span className="stat-label">集合名称</span>
            </div>
          </div>
        </Card>

        {/* 文档管理 */}
        <Card title="📁 文档管理" className="rag-card">
          <div className="document-actions">
            <Button
              size="small"
              color="primary"
              onClick={() => fileInputRef.current?.click()}
              loading={isLoading}
            >
              <AddCircleOutline /> 上传文档
            </Button>
            {documents.length > 0 && (
              <Button
                size="small"
                color="danger"
                fill="outline"
                onClick={handleClearAll}
              >
                清空所有
              </Button>
            )}
          </div>

          {/* 文档列表 */}
          <div className="document-list">
            {documents.length === 0 ? (
              <Empty description="暂无文档" />
            ) : (
              <List>
                {documents.map((doc) => (
                  <List.Item
                    key={doc.id}
                    prefix={
                      <span className="document-icon">
                        {getFileIcon(doc.metadata?.file_type)}
                      </span>
                    }
                    description={`${doc.content?.substring(0, 50) || ''}...`}
                    extra={
                      <Button
                        size="mini"
                        fill="none"
                        onClick={() => handleDelete(doc.id, doc.metadata?.source || doc.id)}
                      >
                        <DeleteOutline fontSize={18} color="var(--adm-color-danger)" />
                      </Button>
                    }
                  >
                    <div className="document-name">
                      {doc.metadata?.source || `文档 ${doc.id.substring(0, 8)}`}
                    </div>
                  </List.Item>
                ))}
              </List>
            )}
          </div>
        </Card>

        {/* RAG 配置 */}
        <Card title="⚙️ RAG 配置" className="rag-card">
          <List>
            <List.Item
              description={`检索数量: ${ragConfig.k}`}
            >
              <div className="config-item">
                <span>检索数量 (K)</span>
                <Slider
                  value={ragConfig.k}
                  min={1}
                  max={20}
                  onChange={(value) => setRagConfig({ ...ragConfig, k: value })}
                  style={{ width: 150 }}
                />
              </div>
            </List.Item>
            <List.Item
              description={`分块大小: ${ragConfig.chunkSize}`}
            >
              <div className="config-item">
                <span>分块大小</span>
                <Slider
                  value={ragConfig.chunkSize}
                  min={100}
                  max={2000}
                  step={100}
                  onChange={(value) => setRagConfig({ ...ragConfig, chunkSize: value })}
                  style={{ width: 150 }}
                />
              </div>
            </List.Item>
            <List.Item
              description={`分块重叠: ${ragConfig.chunkOverlap}`}
            >
              <div className="config-item">
                <span>分块重叠</span>
                <Slider
                  value={ragConfig.chunkOverlap}
                  min={0}
                  max={200}
                  step={10}
                  onChange={(value) => setRagConfig({ ...ragConfig, chunkOverlap: value })}
                  style={{ width: 150 }}
                />
              </div>
            </List.Item>
          </List>
        </Card>

        {/* 高级设置 */}
        <Card title="🔧 高级设置" className="rag-card">
          <List>
            <List.Item
              extra={
                <Switch
                  checked={ragConfig.useRewrite}
                  onChange={(checked) => setRagConfig({ ...ragConfig, useRewrite: checked })}
                />
              }
            >
              查询重写
            </List.Item>
            <List.Item
              extra={
                <Switch
                  checked={ragConfig.useHybrid}
                  onChange={(checked) => setRagConfig({ ...ragConfig, useHybrid: checked })}
                />
              }
            >
              混合检索
            </List.Item>
            <List.Item
              extra={
                <Switch
                  checked={ragConfig.useRerank}
                  onChange={(checked) => setRagConfig({ ...ragConfig, useRerank: checked })}
                />
              }
            >
              重排序
            </List.Item>
          </List>
        </Card>

        {/* 支持格式 */}
        <div className="supported-formats">
          <p>支持格式: PDF, DOCX, TXT, Markdown, CSV</p>
        </div>
      </div>

      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        accept={SUPPORTED_TYPES.join(',')}
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      <TabBar />
    </div>
  )
}

export default RAGManager