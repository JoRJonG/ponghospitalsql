import type { ChangeEvent, FormEvent } from 'react'
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { apiRequest } from '../../utils/api'
import { invalidateCache } from '../../utils/fastFetch'
import { useToast } from '../../contexts/ToastContext'

export type PopupsManagerHandle = {
  refresh: () => Promise<void>
}

const DAY_MS = 86_400_000

type PopupRecord = {
  id: number
  title: string
  body: string
  startAt: string | null
  endAt: string | null
  dismissForDays: number
  isActive: boolean
  ctaLabel?: string | null
  ctaUrl?: string | null
  imageUrl?: string | null
  image?: {
    url: string
    mimeType?: string | null
    size?: number | null
    fileName?: string | null
  } | null
  createdAt?: string | null
  updatedAt?: string | null
}

type PopupFormState = {
  title: string
  body: string
  startAt: string
  endAt: string
  dismissForDays: number
  isActive: boolean
  ctaLabel: string
  ctaUrl: string
  imageUrl: string
}

type ImageSource = {
  url: string
  fileName?: string | null
  mimeType?: string | null
  size?: number | null
}

const defaultForm: PopupFormState = {
  title: '',
  body: '',
  startAt: '',
  endAt: '',
  dismissForDays: 1,
  isActive: true,
  ctaLabel: '',
  ctaUrl: '',
  imageUrl: '',
}

function toDateValue(iso?: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function fromDateValue(value: string, isEnd = false) {
  const v = (value || '').trim()
  if (!v) return null
  // Return a local datetime string (SQL DATETIME style)
  // If isEnd is true, set time to 23:59:59, else 00:00:00
  return `${v} ${isEnd ? '23:59:59' : '00:00:00'}`
}

const PopupsManager = forwardRef<PopupsManagerHandle>((_props, ref) => {
  const [popups, setPopups] = useState<PopupRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<PopupFormState>(defaultForm)
  const [existingImage, setExistingImage] = useState<ImageSource | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [removeImage, setRemoveImage] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const { showToast } = useToast()

  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview)
      }
    }
  }, [imagePreview])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await apiRequest('/api/popups')
      const json = await response.json().catch(() => ({}))
      if (!response.ok || json?.success === false) {
        throw new Error(json?.error || 'ไม่สามารถโหลดข้อมูลป๊อปอัปได้')
      }
      const list: PopupRecord[] = Array.isArray(json?.data) ? json.data : []
      setPopups(list)
    } catch (thrown: unknown) {
      console.error('Failed to load popups', thrown)
      if (thrown instanceof Error) {
        setError(thrown.message || 'เกิดข้อผิดพลาด')
      } else {
        setError('เกิดข้อผิดพลาด')
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useImperativeHandle(ref, () => ({ refresh: load }), [load])

  useEffect(() => {
    load()
  }, [load])

  const resetForm = () => {
    setForm(defaultForm)
    setEditingId(null)
    setExistingImage(null)
    setRemoveImage(false)
    setImageFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    setImagePreview(prev => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
  }

  const handleEdit = (popup: PopupRecord) => {
    setEditingId(popup.id)
    setForm({
      title: popup.title || '',
      body: popup.body || '',
      startAt: toDateValue(popup.startAt),
      endAt: toDateValue(popup.endAt),
      dismissForDays: Number.isFinite(popup.dismissForDays) ? popup.dismissForDays : 1,
      isActive: Boolean(popup.isActive),
      ctaLabel: popup.ctaLabel || '',
      ctaUrl: popup.ctaUrl || '',
      imageUrl: popup.imageUrl || '',
    })
    const preview = popup.image?.url || popup.imageUrl || ''
    setExistingImage(preview ? { url: preview, fileName: popup.image?.fileName, mimeType: popup.image?.mimeType, size: popup.image?.size } : null)
    setImageFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    setImagePreview(prev => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
    setRemoveImage(false)
    setShowForm(true)
    window.scrollTo({ top: 130, behavior: 'smooth' })
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('ยืนยันการลบป๊อปอัปนี้หรือไม่?')) return
    try {
      const response = await apiRequest(`/api/popups/${id}`, { method: 'DELETE' })
      const json = await response.json().catch(() => ({}))
      if (!response.ok || json?.success === false) {
        throw new Error(json?.error || 'ไม่สามารถลบป๊อปอัปได้')
      }
      invalidateCache('/api/popups/active')
      await load()
      showToast('ลบป๊อปอัปสำเร็จ', undefined, 'success', 2500)
      if (editingId === id) {
        resetForm()
        setShowForm(false)
      }
    } catch (thrown: unknown) {
      console.error('Failed to delete popup', thrown)
      const message = thrown instanceof Error ? thrown.message : 'ลบป๊อปอัปไม่สำเร็จ'
      showToast(message, undefined, 'error', 3000)
    }
  }

  const handleToggleActive = async (popup: PopupRecord) => {
    try {
      const title = (popup.title || '').trim()
      const bodyText = (popup.body || '').trim()
      if (!title || !bodyText) {
        throw new Error('กรุณาระบุหัวข้อและรายละเอียดของป๊อปอัป')
      }

      const formData = new FormData()
      formData.append('title', title)
      formData.append('body', bodyText)
      formData.append('dismissForDays', String(Number.isFinite(popup.dismissForDays) ? Math.max(0, popup.dismissForDays) : 1))
      formData.append('isActive', (!popup.isActive).toString())
      if (popup.startAt) formData.append('startAt', popup.startAt)
      if (popup.endAt) formData.append('endAt', popup.endAt)
      if (popup.ctaLabel) formData.append('ctaLabel', popup.ctaLabel)
      if (popup.ctaUrl) formData.append('ctaUrl', popup.ctaUrl)
      if (popup.imageUrl) formData.append('imageUrl', popup.imageUrl)

      const response = await apiRequest(`/api/popups/${popup.id}`, {
        method: 'PUT',
        body: formData,
      })
      const json = await response.json().catch(() => ({}))
      if (!response.ok || json?.success === false) {
        throw new Error(json?.error || 'ไม่สามารถอัปเดตสถานะได้')
      }
      invalidateCache('/api/popups/active')
      await load()
      showToast('อัปเดตสถานะป๊อปอัปเรียบร้อย', undefined, 'success', 2500)
    } catch (thrown: unknown) {
      console.error('Failed to toggle popup', thrown)
      const message = thrown instanceof Error ? thrown.message : 'อัปเดตสถานะไม่สำเร็จ'
      showToast(message, undefined, 'error', 3000)
    }
  }

  const handleImageFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      setImageFile(null)
      setImagePreview(prev => {
        if (prev) URL.revokeObjectURL(prev)
        return null
      })
      if (!existingImage) {
        setRemoveImage(false)
      }
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('ขนาดรูปภาพต้องไม่เกิน 5MB', undefined, 'error', 3000)
      if (event.target) {
        event.target.value = ''
      }
      return
    }

    const previewUrl = URL.createObjectURL(file)
    setImageFile(file)
    setImagePreview(prev => {
      if (prev) URL.revokeObjectURL(prev)
      return previewUrl
    })
    setRemoveImage(false)
    setForm(prev => ({ ...prev, imageUrl: '' }))
  }

  const handleRemoveImage = () => {
    const prevImage = existingImage
    const hadStoredImage = Boolean(prevImage) && !imageFile
    if (hadStoredImage) {
      setExistingImage(null)
    }
    setImageFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    setImagePreview(prev => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
    setRemoveImage(hadStoredImage)
    const shouldRestoreRemote = !hadStoredImage && prevImage?.url && /^https?:/i.test(prevImage.url)
    setForm(prev => ({ ...prev, imageUrl: shouldRestoreRemote ? prevImage.url : '' }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    try {
      const payload = {
        title: form.title.trim(),
        body: form.body.trim(),
        startAt: fromDateValue(form.startAt),
        endAt: fromDateValue(form.endAt, true),
        dismissForDays: Number.isFinite(form.dismissForDays) ? Math.max(0, Math.floor(form.dismissForDays)) : 1,
        isActive: form.isActive,
        ctaLabel: form.ctaLabel.trim() || null,
        ctaUrl: form.ctaUrl.trim() || null,
      }

      const method = editingId ? 'PUT' : 'POST'
      const path = editingId ? `/api/popups/${editingId}` : '/api/popups'

      if (!payload.title) {
        throw new Error('กรุณาระบุหัวข้อป๊อปอัป')
      }
      if (!payload.body) {
        throw new Error('กรุณาระบุรายละเอียด')
      }

      const formData = new FormData()
      formData.append('title', payload.title)
      formData.append('body', payload.body)
      formData.append('dismissForDays', String(payload.dismissForDays))
      formData.append('isActive', payload.isActive ? '1' : '0')
      if (payload.startAt) formData.append('startAt', payload.startAt)
      if (payload.endAt) formData.append('endAt', payload.endAt)
      if (payload.ctaLabel) formData.append('ctaLabel', payload.ctaLabel)
      if (payload.ctaUrl) formData.append('ctaUrl', payload.ctaUrl)

      const trimmedImageUrl = form.imageUrl.trim()
      if (trimmedImageUrl) {
        formData.append('imageUrl', trimmedImageUrl)
      }
      if (imageFile) {
        formData.append('image', imageFile, imageFile.name)
      }
      if (removeImage && !imageFile) {
        formData.append('removeImage', '1')
      }

      const response = await apiRequest(path, {
        method,
        body: formData,
      })
      const json = await response.json().catch(() => ({}))
      if (!response.ok || json?.success === false) {
        throw new Error(json?.error || 'ไม่สามารถบันทึกป๊อปอัปได้')
      }

      invalidateCache('/api/popups/active')
      await load()
      resetForm()
      setShowForm(false)
      showToast('บันทึกป๊อปอัปสำเร็จ', undefined, 'success', 2500)
    } catch (thrown: unknown) {
      console.error('Failed to save popup', thrown)
      const message = thrown instanceof Error ? thrown.message : 'บันทึกป๊อปอัปไม่สำเร็จ'
      showToast(message, undefined, 'error', 3000)
    } finally {
      setSaving(false)
    }
  }

  const upcomingPopups = useMemo(() => {
    const now = Date.now()
    return popups.filter(popup => {
      if (!popup.startAt) return true
      const start = new Date(popup.startAt).getTime()
      return Number.isFinite(start) && start >= now - DAY_MS
    })
  }, [popups])

  const previewName = imageFile?.name || existingImage?.fileName || ''
  const previewSizeKb = imageFile ? (imageFile.size / 1024).toFixed(1) : existingImage?.size ? (existingImage.size / 1024).toFixed(1) : null

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">ป๊อปอัปหน้าแรก</h2>
            <p className="text-sm text-slate-500">จัดการข้อความสำคัญที่ต้องการแสดงก่อนเข้าสู่เว็บไซต์</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {showForm && (
              <button
                type="button"
                onClick={resetForm}
                className="admin-btn admin-btn--outline"
              >
                {editingId ? 'เริ่มสร้างใหม่' : 'ล้างฟอร์ม'}
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (showForm) {
                  resetForm()
                  setShowForm(false)
                } else {
                  resetForm()
                  setShowForm(true)
                  window.scrollTo({ top: 130, behavior: 'smooth' })
                }
              }}
              className="admin-btn"
            >
              <span>{showForm ? '✕' : '+'}</span>
              {showForm ? 'ปิดฟอร์มเพิ่มป๊อปอัป' : 'เพิ่มป๊อปอัปใหม่'}
            </button>
          </div>
        </div>

        {showForm ? (
          <form onSubmit={handleSubmit} className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-slate-700">
                หัวข้อป๊อปอัป
                <input
                  required
                  value={form.title}
                  onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                  placeholder="เช่น วันเฉลิมพระชนมพรรษา"
                />
              </label>
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-medium text-slate-700">
                รายละเอียด
                <textarea
                  required
                  rows={4}
                  value={form.body}
                  onChange={e => setForm(prev => ({ ...prev, body: e.target.value }))}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                  placeholder="ข้อความที่ต้องการให้ผู้ใช้อ่านก่อนเข้าหน้าเว็บ"
                />
              </label>
            </div>

            <label className="text-sm font-medium text-slate-700">
              เริ่มแสดงตั้งแต่
              <input
                type="date"
                value={form.startAt}
                onChange={e => setForm(prev => ({ ...prev, startAt: e.target.value }))}
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              />
            </label>

            <label className="text-sm font-medium text-slate-700">
              แสดงถึงวันที่
              <input
                type="date"
                value={form.endAt}
                onChange={e => setForm(prev => ({ ...prev, endAt: e.target.value }))}
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              />
            </label>

            <label className="text-sm font-medium text-slate-700">
              ซ่อนหลังจากปิด (วัน)
              <input
                type="number"
                min={0}
                value={form.dismissForDays}
                onChange={e => setForm(prev => ({ ...prev, dismissForDays: Number(e.target.value) }))}
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              />
            </label>

            <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={e => setForm(prev => ({ ...prev, isActive: e.target.checked }))}
                className="h-4 w-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-400"
              />
              เปิดใช้งานป๊อปอัปนี้ทันที
            </label>

            <label className="text-sm font-medium text-slate-700">
              ปุ่มลิงก์ (ข้อความ)
              <input
                value={form.ctaLabel}
                onChange={e => setForm(prev => ({ ...prev, ctaLabel: e.target.value }))}
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                placeholder="เช่น ดูรายละเอียด"
              />
            </label>

            <label className="text-sm font-medium text-slate-700">
              ปุ่มลิงก์ (URL)
              <input
                value={form.ctaUrl}
                onChange={e => setForm(prev => ({ ...prev, ctaUrl: e.target.value }))}
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                placeholder="https://"
              />
            </label>

            <div className="md:col-span-2 space-y-3">
              <label className="block text-sm font-medium text-slate-700">
                รูปภาพประกอบ (URL)
                <input
                  value={form.imageUrl}
                  onChange={e => setForm(prev => ({ ...prev, imageUrl: e.target.value }))}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                  placeholder="ลิงก์รูปภาพที่จะนำมาแสดง"
                />
              </label>
              <p className="text-xs text-slate-500">หรืออัปโหลดไฟล์ด้านล่าง ระบบจะเก็บรูปไว้ในฐานข้อมูลและแสดงอัตโนมัติ</p>
              <label className="block text-sm font-medium text-slate-700">
                อัปโหลดรูปภาพ (สูงสุด 5MB)
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileChange}
                  className="mt-2 w-full rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-2.5 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                />
              </label>
              {(imagePreview || existingImage) && (
                <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="h-16 w-16 overflow-hidden rounded-lg bg-white shadow-inner">
                    <img
                      src={imagePreview || existingImage?.url || ''}
                      alt="ตัวอย่างรูปป๊อปอัป"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="flex-1 text-xs text-slate-600">
                    <div className="font-medium text-slate-700">จะแสดงรูปภาพนี้</div>
                    {previewName && <div>ไฟล์: {previewName}</div>}
                    {previewSizeKb && <div>ขนาด: {previewSizeKb} KB</div>}
                    {!imageFile && existingImage?.url && <div className="truncate text-slate-500">URL: {existingImage.url}</div>}
                    {imageFile && <div className="text-emerald-600">ไฟล์ใหม่จะถูกบันทึกเมื่อกดบันทึก</div>}
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="mt-2 inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1 text-xs text-red-600 hover:border-red-300 hover:bg-red-50"
                    >
                      ลบรูปภาพนี้
                    </button>
                  </div>
                </div>
              )}
              {removeImage && !imagePreview && !existingImage && (
                <div className="rounded-lg border border-dashed border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                  จะลบรูปภาพเดิมออกเมื่อบันทึก
                </div>
              )}
            </div>

            <div className="md:col-span-2 flex items-center justify-end gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="admin-btn"
              >
                {saving ? 'กำลังบันทึก...' : editingId ? 'บันทึกการแก้ไข' : 'สร้างป๊อปอัป'}
              </button>
            </div>
          </form>
        ) : (
          <div className="mt-6 rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/60 px-4 py-6 text-center text-sm text-emerald-700">
            กดปุ่ม "เพิ่มป๊อปอัปใหม่" เพื่อเปิดฟอร์มเพิ่มรายละเอียดป๊อปอัปหน้าแรก
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">รายการป๊อปอัปที่ตั้งไว้</h3>
        <p className="text-sm text-slate-500">แสดง {popups.length} รายการ • กำลังจะมาถึง {upcomingPopups.length} รายการ</p>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">หัวข้อ</th>
                <th className="px-4 py-3">ช่วงเวลา</th>
                <th className="px-4 py-3">สถานะ</th>
                <th className="px-4 py-3 text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                    กำลังโหลดข้อมูล...
                  </td>
                </tr>
              )}

              {!loading && error && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-red-500">
                    {error}
                  </td>
                </tr>
              )}

              {!loading && !error && popups.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                    ยังไม่มีป๊อปอัป
                  </td>
                </tr>
              )}

              {!loading && !error && popups.map(popup => {
                const start = popup.startAt ? new Date(popup.startAt) : null
                const end = popup.endAt ? new Date(popup.endAt) : null
                const startText = start && !Number.isNaN(start.getTime()) ? start.toLocaleString('th-TH') : '-'
                const endText = end && !Number.isNaN(end.getTime()) ? end.toLocaleString('th-TH') : '-'
                const thumbSrc = popup.image?.url || popup.imageUrl || ''
                return (
                  <tr key={popup.id} className="text-slate-700">
                    <td className="max-w-sm px-4 py-3 align-top">
                      {thumbSrc && (
                        <a
                          href={thumbSrc}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group mb-3 block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-emerald-200 hover:shadow-md"
                        >
                          <div className="relative flex h-40 w-full items-center justify-center bg-slate-50">
                            <img
                              src={thumbSrc}
                              alt="รูปป๊อปอัป"
                              className="max-h-full max-w-full object-contain transition duration-200 group-hover:scale-105"
                            />
                            <div className="absolute bottom-2 right-2 hidden rounded-full bg-emerald-500/90 px-3 py-1 text-[11px] font-semibold text-white shadow-sm group-hover:flex">
                              เปิดภาพเต็ม
                            </div>
                          </div>
                        </a>
                      )}
                      <div className="font-semibold text-slate-900 line-clamp-2">{popup.title}</div>
                      <div className="text-xs text-slate-500 line-clamp-2">{popup.body}</div>
                      <div className="mt-1 text-xs text-slate-400">
                        {popup.image ? 'ใช้รูปภาพที่อัปโหลดแล้ว' : popup.imageUrl ? 'ใช้ลิงก์รูปภาพภายนอก' : 'ไม่มีรูปภาพ'}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top text-xs text-slate-500">
                      <div>เริ่ม {startText}</div>
                      <div>สิ้นสุด {endText}</div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${popup.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                        {popup.isActive ? 'เปิดใช้งาน' : 'ปิดอยู่'}
                      </span>
                      <div className="mt-1 text-xs text-slate-500">ปิด {popup.dismissForDays} วัน</div>
                    </td>
                    <td className="px-4 py-3 align-top text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => handleToggleActive(popup)}
                          className="admin-btn admin-btn--outline admin-btn--sm"
                        >
                          {popup.isActive ? (
                            <>
                              <span>🚫</span>
                              <span>ปิดการแสดง</span>
                            </>
                          ) : (
                            <>
                              <span>✅</span>
                              <span>เปิดใช้งาน</span>
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleEdit(popup)}
                          className="admin-btn admin-btn--outline admin-btn--sm"
                        >
                          <span>✏️</span>
                          <span>แก้ไข</span>
                        </button>
                        <button
                          onClick={() => handleDelete(popup.id)}
                          className="admin-btn admin-btn--outline admin-btn--sm"
                        >
                          <span>🗑️</span>
                          <span>ลบ</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
})

PopupsManager.displayName = 'PopupsManager'

export default PopupsManager
