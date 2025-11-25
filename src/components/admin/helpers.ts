// Editor config and helpers for admin forms
export const quillModules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['link'],
    ['clean'],
  ],
}
export const quillFormats = ['header', 'bold', 'italic', 'underline', 'list', 'link']

export const toDateTimeLocalValue = (iso?: string | null) => {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
export const fromDateTimeLocalValue = (v: string) => {
  const s = (v || '').trim()
  if (!s) return undefined
  const d = new Date(s)
  if (isNaN(d.getTime())) return undefined
  return d.toISOString()
}

export const stripHtml = (s?: string) => (s || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()
