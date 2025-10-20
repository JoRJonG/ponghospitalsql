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
      .then(async r => { if (!r.ok) throw new Error('ไม่สามารถดึงลิงก์หน่วยงานได้'); return r.json() })
      .then((list: Unit[]) => setItems(list))
      .catch((e) => { if ((e as any).name !== 'AbortError') { setItems([]); setError((e as any)?.message || 'เกิดข้อผิดพลาด') } })
    return () => ac.abort()
  }, [])

  return embedded ? (
    <>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-800 mb-2">
          แผนกและหน่วยงาน
        </h2>
        <p className="text-sm text-gray-600">ค้นหาและติดต่อแผนกต่างๆ ของโรงพยาบาล</p>
      </div>
      {error && (
        <div className="border border-red-200 bg-red-50 text-red-700 rounded p-3 mb-4">{error}</div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {items.map(u => {
          const src = u.image?.url
          const { src: rsrc, srcSet, sizes } = responsiveImageProps(src, { widths: [160, 240, 320], crop: 'fit' })
          const card = (
            <div className="card h-full transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
              <div className="card-body flex flex-col items-center text-center gap-2">
                <div className="h-16 flex items-center justify-center">
                  {src ? (
                    <img
                      loading="lazy" decoding="async"
                      src={rsrc}
                      srcSet={srcSet}
                      sizes={sizes}
                      alt={u.name}
                      className="max-h-16 w-auto object-contain"
                      width={160} height={64}
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                      <i className="fa-solid fa-building" />
                    </div>
                  )}
                </div>
                <div className="text-sm font-medium text-gray-800 line-clamp-2">{u.name}</div>
              </div>
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
    <section className="py-12 bg-gray-50">
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
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {items.map(u => {
            const src = u.image?.url
            const { src: rsrc, srcSet, sizes } = responsiveImageProps(src, { widths: [160, 240, 320], crop: 'fit' })
            const card = (
              <div className="card h-full transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                <div className="card-body flex flex-col items-center text-center gap-2">
                  <div className="h-16 flex items-center justify-center">
                    {src ? (
                      <img
                        loading="lazy" decoding="async"
                        src={rsrc}
                        srcSet={srcSet}
                        sizes={sizes}
                        alt={u.name}
                        className="max-h-16 w-auto object-contain"
                        width={160} height={64}
                      />
                    ) : (
                      <div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                        <i className="fa-solid fa-building" />
                      </div>
                    )}
                  </div>
                  <div className="text-sm font-medium text-gray-800 line-clamp-2">{u.name}</div>
                </div>
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
