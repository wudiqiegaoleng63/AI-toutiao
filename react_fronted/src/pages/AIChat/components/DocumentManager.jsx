/**
 * 文档管理组件 (DocumentManager.jsx)
 *
 * 该组件提供用户文档管理功能，支持：
 * - 显示已上传的文档列表
 * - 上传新文档（PDF、DOCX、TXT、MD）
 * - 删除文档
 * - 显示文档处理状态
 *
 * 上传的文档会被向量化存储到 Milvus，
 * 用于 RAG 检索增强生成。
 *
 * 作者：Claude AI
 * 日期：2024
 */

import React, { useEffect, useRef } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import {
  Popup,
  Button,
  List,
  Dialog,
  Toast,
  DotLoading
} from 'antd-mobile'
import {
  FileOutline,
  DeleteOutline,
  AddCircleOutline,
  CheckCircleFill
} from 'antd-mobile-icons'
import {
  fetchDocuments,
  uploadDocument,
  deleteDocumentById
} from '../../../store/aiChatSlice'
import './DocumentManager.css'

// 支持的文件类型
const SUPPORTED_TYPES = ['.pdf', '.docx', '.doc', '.txt', '.md']

const DocumentManager = () => {
  const dispatch = useDispatch()
  const fileInputRef = useRef(null)

  // 从 Redux 获取状态
  const { documents, isLoading, documentManagerOpen } = useSelector(
    (state) => state.aiChat
  )
  const { isLogin } = useSelector((state) => state.user)

  // 打开时加载文档列表
  useEffect(() => {
    if (documentManagerOpen && isLogin) {
      dispatch(fetchDocuments())
    }
  }, [dispatch, documentManagerOpen, isLogin])

  /**
   * 触发文件选择
   */
  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  /**
   * 处理文件上传
   * @param {Event} e - 文件选择事件
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

    // 检查文件大小 (最大 10MB)
    if (file.size > 10 * 1024 * 1024) {
      Toast.show({
        content: '文件过大，最大支持 10MB',
        icon: 'fail'
      })
      return
    }

    // 上传文件
    Toast.show({ icon: <DotLoading color='white' />, content: '上传中...' })
    const result = await dispatch(uploadDocument(file))

    if (uploadDocument.fulfilled.match(result)) {
      Toast.show({ content: '上传成功', icon: 'success' })
      // 刷新列表
      dispatch(fetchDocuments())
    } else {
      Toast.show({ content: result.payload || '上传失败', icon: 'fail' })
    }

    // 清空文件输入
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  /**
   * 删除文档
   * @param {number} documentId - 文档 ID
   * @param {string} filename - 文件名
   */
  const handleDelete = async (documentId, filename) => {
    const result = await Dialog.confirm({
      content: `确定要删除"${filename}"吗？删除后将无法恢复。`,
      confirmText: '删除',
      cancelText: '取消'
    })

    if (result) {
      const deleteResult = await dispatch(deleteDocumentById(documentId))
      if (deleteDocumentById.fulfilled.match(deleteResult)) {
        Toast.show({ content: '删除成功', icon: 'success' })
      } else {
        Toast.show({ content: deleteResult.payload || '删除失败', icon: 'fail' })
      }
    }
  }

  /**
   * 获取文件图标
   * @param {string} fileType - 文件类型
   * @returns {string} emoji 图标
   */
  const getFileIcon = (fileType) => {
    const icons = {
      pdf: '📕',
      docx: '📘',
      doc: '📘',
      txt: '📄',
      md: '📝',
      markdown: '📝'
    }
    return icons[fileType] || '📄'
  }

  /**
   * 格式化文件大小
   * @param {number} bytes - 字节数
   * @returns {string} 格式化后的大小
   */
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  /**
   * 格式化日期
   * @param {string} dateString - ISO 时间字符串
   * @returns {string} 格式化后的日期
   */
  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <Popup
      position="bottom"
      visible={documentManagerOpen}
      onMaskClick={() => dispatch({ type: 'aiChat/toggleDocumentManager' })}
      bodyStyle={{ height: '70vh', borderRadius: '16px 16px 0 0' }}
    >
      <div className="document-manager">
        {/* 头部 */}
        <div className="document-manager-header">
          <h3>我的文档</h3>
          <Button
            size="small"
            color="primary"
            onClick={handleUploadClick}
            loading={isLoading}
          >
            <AddCircleOutline /> 上传
          </Button>
        </div>

        {/* 说明 */}
        <div className="document-manager-hint">
          上传文档后，AI 可以基于文档内容回答问题。
          支持 PDF、Word、TXT、Markdown 格式。
        </div>

        {/* 文档列表 */}
        <div className="document-list">
          {documents.length === 0 ? (
            <div className="document-empty">
              <FileOutline fontSize={40} />
              <p>暂无文档</p>
              <p className="document-empty-hint">点击上方按钮上传文档</p>
            </div>
          ) : (
            <List>
              {documents.map((doc) => (
                <List.Item
                  key={doc.id}
                  prefix={
                    <span className="document-icon">
                      {getFileIcon(doc.file_type)}
                    </span>
                  }
                  description={
                    <div className="document-meta">
                      <span>{doc.chunk_count} 个片段</span>
                      <span>{formatDate(doc.created_at)}</span>
                    </div>
                  }
                  extra={
                    <Button
                      size="mini"
                      fill="none"
                      onClick={() => handleDelete(doc.id, doc.filename)}
                    >
                      <DeleteOutline fontSize={18} color="var(--adm-color-danger)" />
                    </Button>
                  }
                >
                  <div className="document-name">
                    {doc.filename}
                    {doc.chunk_count > 0 && (
                      <CheckCircleFill
                        fontSize={14}
                        color="var(--adm-color-success)"
                        style={{ marginLeft: 4 }}
                      />
                    )}
                  </div>
                </List.Item>
              ))}
            </List>
          )}
        </div>

        {/* 隐藏的文件输入 */}
        <input
          ref={fileInputRef}
          type="file"
          accept={SUPPORTED_TYPES.join(',')}
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </div>
    </Popup>
  )
}

export default DocumentManager