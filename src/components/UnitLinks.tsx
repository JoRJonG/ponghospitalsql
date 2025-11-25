import { useEffect, useRef, useState } from 'react'
import { responsiveImageProps } from '../utils/image'

type Unit = {
  _id: string
  name: string
  href?: string
  image?: { url: string; publicId?: string }
}

export default function UnitLinks({ embedded = false }: { embedded?: boolean }) {
  const [items, setItems] = useState<Unit[]>([])
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (abortRef.current) abortRef.current.abort()
    const ac = new AbortController(); abortRef.current = ac
    setError(null)
    fetch('/api/units', { signal: ac.signal })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('ไม่สามารถดึงลิงก์หน่วยงานได้')
        }
        return response.json()
      })
      .then((list: unknown) => {
        if (Array.isArray(list)) {
          setItems(list as Unit[])
          return
        }
        throw new Error('รูปแบบข้อมูลไม่ถูกต้อง')
      })
      .catch((thrown: unknown) => {
        if (thrown instanceof DOMException && thrown.name === 'AbortError') return
        setItems([])
        if (thrown instanceof Error) {
          setError(thrown.message || 'เกิดข้อผิดพลาด')
          return
        }
        setError('เกิดข้อผิดพลาด')
      })
    return () => ac.abort()
  }, [])

  return embedded ? (
    <>
      <div className="mb-10 text-center">
        <h2 className="text-2xl font-semibold text-slate-800">ระบบสารสนเทศภายใน</h2>
      </div>
      {error && (
        <div className="border border-red-200 bg-red-50 text-red-700 rounded p-3 mb-4">{error}</div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {items.map(u => {
          const src = u.image?.url
          const { src: rsrc, srcSet, sizes } = responsiveImageProps(src, { widths: [160, 240, 320], crop: 'fit' })
          const card = (
            <div className="group flex flex-col items-center justify-center py-6 px-6 bg-white border border-slate-200 rounded-xl hover:border-emerald-500 hover:shadow-lg transition duration-300 h-full">
              <div className="w-14 h-14 mb-3 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 text-2xl group-hover:scale-110 transition duration-300">
                {src ? (
                  <img
                    loading="lazy" decoding="async"
                    src={rsrc}
                    srcSet={srcSet}
                    sizes={sizes}
                    alt={u.name}
                    className="max-h-10 w-auto object-contain"
                    width={40} height={40}
                  />
                ) : (
                  <i className="fa-solid fa-building-user" />
                )}
              </div>
              <span className="font-bold text-slate-700 group-hover:text-emerald-700 text-center line-clamp-2">{u.name}</span>
            </div>
          )
          return u.href ? (
            <a key={u._id} href={u.href} target={/^https?:\/\//i.test(u.href) ? '_blank' : undefined} rel={/^https?:\/\//i.test(u.href) ? 'noopener noreferrer' : undefined} className="block">
              {card}
            </a>
          ) : (
            <div key={u._id}>{card}</div>
          )
        })}
        {items.length === 0 && !error && (
          <div className="text-gray-500">ยังไม่มีลิงก์หน่วยงาน</div>
        )}
      </div>
    </>
  ) : (
    <section className="py-8 bg-gray-50">
      <div className="container-narrow">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold">ลิงก์หน่วยงาน</h3>
            <p className="text-gray-600 text-sm">เชื่อมต่อไปยังหน่วยงาน/กลุ่มงานภายในที่เกี่ยวข้อง</p>
          </div>
        </div>
        {error && (
          <div className="border border-red-200 bg-red-50 text-red-700 rounded p-3 mb-4">{error}</div>
        )}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {items.map(u => {
            const src = u.image?.url
            const { src: rsrc, srcSet, sizes } = responsiveImageProps(src, { widths: [160, 240, 320], crop: 'fit' })
            const card = (
              <div className="group flex flex-col items-center justify-center py-6 px-6 bg-white border border-slate-200 rounded-xl hover:border-emerald-500 hover:shadow-lg transition duration-300 h-full">
                <div className="w-14 h-14 mb-3 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 text-2xl group-hover:scale-110 transition duration-300">
                  {src ? (
                    <img
                      loading="lazy" decoding="async"
                      src={rsrc}
                      srcSet={srcSet}
                      sizes={sizes}
                      alt={u.name}
                      className="max-h-10 w-auto object-contain"
                      width={40} height={40}
                    />
                  ) : (
                    <i className="fa-solid fa-building" />
                  )}
                </div>
                <span className="font-bold text-slate-700 group-hover:text-emerald-700 text-center line-clamp-2">{u.name}</span>
              </div>
            )
            return u.href ? (
              <a key={u._id} href={u.href} target={/^https?:\/\//i.test(u.href) ? '_blank' : undefined} rel={/^https?:\/\//i.test(u.href) ? 'noopener noreferrer' : undefined} className="block">
                {card}
              </a>
            ) : (
              <div key={u._id}>{card}</div>
            )
          })}
          {items.length === 0 && !error && (
            <div className="text-gray-500">ยังไม่มีลิงก์หน่วยงาน</div>
          )}
        </div>
      </div>
    </section>
  )
}
