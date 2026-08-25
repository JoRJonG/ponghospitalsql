import { ItaItem, saveItaPdf, getItaPdf, getItaPdfByFilename, attachPdfToItem, listItemPdfs, deletePdf } from '../models/mysql/ItaItem.js'
import { fileTypeFromFile } from 'file-type'
import { cleanTempFile } from '../middleware/upload.js'
import { decodeUploadFilename } from '../utils/filename.js'
import { purgeCachePrefix } from '../middleware/cache.js'

export const ItaService = {
  async getTree(includeUnpublished) {
    return await ItaItem.findTree({ includeUnpublished })
  },

  async getFlatList(includeUnpublished) {
    return await ItaItem.findAll({ includeUnpublished, excludeContent: true })
  },

  async getItemDetail(id, includeUnpublished) {
    const item = await ItaItem.findById(id)
    if (!item) return null
    if (!includeUnpublished && item.isPublished === false) return null

    const children = await ItaItem.findByParentId(id, { includeUnpublished })
    const pdfs = await listItemPdfs(id)
    return { item, children, pdfs }
  },

  async createItem(payload) {
    const { title, parentId, slug, content, isPublished, pdfUrl, pdfFileId } = payload
    if (!title) throw new Error('Missing title')
    
    const finalPdfUrl = pdfFileId ? `/api/ita/pdf/${pdfFileId}` : pdfUrl
    
    const item = await ItaItem.create({ 
      title, 
      parentId: parentId || null, 
      slug, 
      content, 
      pdfUrl: finalPdfUrl, 
      isPublished 
    })
    
    purgeCachePrefix('/api/ita')
    return item
  },

  async updateItem(id, payload) {
    if (payload.pdfFileId) {
      payload.pdfUrl = `/api/ita/pdf/${payload.pdfFileId}`
    }
    const item = await ItaItem.updateById(id, payload)
    if (!item) throw new Error('Not found')
    
    purgeCachePrefix('/api/ita')
    return item
  },

  async deleteItem(id) {
    const item = await ItaItem.deleteById(id)
    if (!item) throw new Error('Not found')
    
    purgeCachePrefix('/api/ita')
    return true
  },

  async reorderItems(items) {
    if (!Array.isArray(items)) throw new Error('Invalid payload')
    
    await ItaItem.reorder(items)
    purgeCachePrefix('/api/ita')
    return true
  },

  async uploadSinglePdf(file, description) {
    if (!file) throw new Error('No file uploaded')

    try {
      let kind = null
      try { kind = await fileTypeFromFile(file.path) } catch (e) {}
      
      const sniff = kind?.mime
      const declared = file.mimetype
      const decodedName = decodeUploadFilename(file.originalname)
      const looksPdf = declared === 'application/pdf' || sniff === 'application/pdf' || decodedName.toLowerCase().endsWith('.pdf')
      
      if (!looksPdf) throw new Error('Only PDF files are allowed')

      const saved = await saveItaPdf({ 
        filename: decodedName, 
        mimetype: 'application/pdf', 
        tempFilePath: file.path, 
        description 
      })

      if (!saved?.id) throw new Error('Insert failed')
      return { id: saved.id, url: `/api/ita/pdf/${encodeURIComponent(decodedName)}` }
    } finally {
      await cleanTempFile(file)
    }
  },

  async attachItemPdf(itemId, file, description) {
    if (!itemId) throw new Error('Invalid item id')
    if (!file) throw new Error('No file uploaded')

    try {
      let kind = null
      try { kind = await fileTypeFromFile(file.path) } catch {}
      
      const sniff = kind?.mime
      const declared = file.mimetype
      const decodedName = decodeUploadFilename(file.originalname)
      const looksPdf = declared === 'application/pdf' || sniff === 'application/pdf' || decodedName.toLowerCase().endsWith('.pdf')
      
      if (!looksPdf) throw new Error('Only PDF files are allowed')

      const saved = await attachPdfToItem(itemId, { 
        filename: decodedName, 
        mimetype: 'application/pdf', 
        tempFilePath: file.path, 
        description 
      })

      return { id: saved.id, url: `/api/ita/pdf/${encodeURIComponent(decodedName)}` }
    } finally {
      await cleanTempFile(file)
    }
  },

  async getItemPdfs(itemId) {
    return await listItemPdfs(itemId)
  },

  async deletePdfFile(fileId) {
    return await deletePdf(fileId)
  },

  async servePdf(idParam) {
    let file = null
    if (/^\d+$/.test(idParam)) {
      file = await getItaPdf(Number(idParam))
    }
    if (!file) {
      file = await getItaPdfByFilename(idParam)
    }
    if (!file) throw new Error('Not found')
    if (!file.bytes) throw new Error('Corrupt PDF (no data)')
    return file
  }
}
