import { useEffect, useRef } from 'react'
import Quill from 'quill'
import 'quill/dist/quill.snow.css'

type Props = {
  value?: string
  onChange?: (html: string) => void
  placeholder?: string
  className?: string
  modules?: any
  formats?: string[]
}

const defaultModules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['link'],
    ['clean'],
  ],
}

const defaultFormats = ['header', 'bold', 'italic', 'underline', 'list', 'link']

export default function RichTextEditor({ value, onChange, placeholder, className, modules, formats }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const editorRef = useRef<HTMLDivElement | null>(null)
  const quillRef = useRef<Quill | null>(null)

  // init once
  useEffect(() => {
    if (!containerRef.current) return
    // Create an element for the editor root
    if (!editorRef.current) {
      editorRef.current = document.createElement('div')
      containerRef.current.appendChild(editorRef.current)
    }
    const q = new Quill(editorRef.current!, {
      theme: 'snow',
      placeholder,
      modules: modules || defaultModules,
      formats: formats || defaultFormats,
    })
    quillRef.current = q

    // Set initial value
    if (value) {
      const delta = q.clipboard.convert({ html: value })
      q.setContents(delta, 'silent')
    }

    const handler = () => {
      const html = editorRef.current?.querySelector('.ql-editor')?.innerHTML ?? ''
      onChange?.(html)
    }
    q.on('text-change', handler)
    return () => {
      q.off('text-change', handler)
      quillRef.current = null
      if (containerRef.current && editorRef.current) {
        containerRef.current.removeChild(editorRef.current)
      }
      editorRef.current = null
    }
  }, [])

  // keep prop value in sync
  useEffect(() => {
    const q = quillRef.current
    if (!q) return
    const root = q.root as HTMLElement
    const current = root.innerHTML
    const next = value || ''
    if (current !== next) {
      const delta = q.clipboard.convert({ html: next })
      q.setContents(delta, 'silent')
    }
  }, [value])

  return <div className={className} ref={containerRef} />
}
