import { useEffect, useMemo, useRef } from 'react'
import Quill from 'quill'
import 'quill/dist/quill.snow.css'

type Props = {
  value?: string
  onChange?: (html: string) => void
  placeholder?: string
  className?: string
  modules?: EditorModules
  formats?: string[]
}

type EditorModules = Record<string, unknown>

const defaultModules: EditorModules = {
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
  const onChangeRef = useRef(onChange)

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  const modulesConfig = useMemo<EditorModules>(() => modules ?? defaultModules, [modules])
  const formatsConfig = useMemo(() => formats ?? defaultFormats, [formats])

  // init once
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    // Create an element for the editor root
    if (!editorRef.current) {
      editorRef.current = document.createElement('div')
      container.appendChild(editorRef.current)
    }
    const editorElement = editorRef.current
    const q = new Quill(editorElement, {
      theme: 'snow',
      placeholder,
      modules: modulesConfig,
      formats: formatsConfig,
    })
    quillRef.current = q

    const handler = () => {
      const html = editorRef.current?.querySelector('.ql-editor')?.innerHTML ?? ''
      onChangeRef.current?.(html)
    }
    q.on('text-change', handler)
    return () => {
      q.off('text-change', handler)
      quillRef.current = null
      if (container.contains(editorElement)) {
        container.removeChild(editorElement)
      }
      editorRef.current = null
    }
  }, [formatsConfig, modulesConfig, placeholder])

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

  return (
    <div className={className} ref={containerRef}>
      {/* Inject styles to force height constraints if the specific class is used */}
      {className?.includes('rich-text-editor-constrained') && (
        <style>{`
          .rich-text-editor-constrained .ql-container {
            height: auto !important;
            min-height: 0 !important;
          }
          .rich-text-editor-constrained .ql-editor {
            height: auto !important;
            min-height: 120px !important;
            max-height: 400px !important;
            overflow-y: auto !important;
          }
        `}</style>
      )}
    </div>
  )
}
