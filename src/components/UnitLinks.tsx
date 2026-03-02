import { useSWR } from '../hooks/useSWR'
import { responsiveImageProps } from '../utils/image'

type Unit = {
  _id: string
  name: string
  href?: string
  image?: { url: string; publicId?: string }
}

export default function UnitLinks({ embedded = false }: { embedded?: boolean }) {
  // ใช้ useSWR สำหรับ data fetching พร้อม caching
  // ข้อมูล units ไม่ค่อยเปลี่ยน เหมาะกับการ cache นานๆ
  const { data: items, error: fetchError } = useSWR<Unit[]>(
    '/api/units',
    async () => {
      const response = await fetch('/api/units')
      if (!response.ok) {
        throw new Error('ไม่สามารถดึงลิงก์หน่วยงานได้')
      }
      const list = await response.json()
      if (!Array.isArray(list)) {
        throw new Error('รูปแบบข้อมูลไม่ถูกต้อง')
      }
      return list as Unit[]
    },
    {
      // ข้อมูลถือว่าสดภายใน 5 นาที (ไม่ค่อยเปลี่ยน)
      staleTime: 300000,
      // เก็บ cache ไว้ 30 นาที
      cacheTime: 1800000,
      // ไม่ต้อง revalidate เมื่อ focus window
      revalidateOnFocus: false,
    }
  )

  const error = fetchError?.message || null

  return embedded ? (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 text-balance">ระบบสารสนเทศภายใน</h2>
          <p className="text-gray-600 text-sm">เชื่อมต่อไปยังหน่วยงานและระบบสารสนเทศต่างๆ ภายในโรงพยาบาล</p>
        </div>
      </div>
      {fetchError ? (
        <div className="border border-red-200 bg-red-50 text-red-700 rounded p-3 mb-4">{error}</div>
      ) : null}
      {!items && !fetchError ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="group flex flex-col items-center justify-center py-6 px-6 bg-white border border-slate-200 rounded-xl animate-pulse h-[138px]">
              <div className="w-14 h-14 mb-3 rounded-full bg-slate-100"></div>
              <div className="h-4 w-20 bg-slate-200 rounded"></div>
            </div>
          ))}
        </div>
      ) : null}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {Array.isArray(items) && items.map(u => {
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
              <span className="font-bold text-slate-700 group-hover:text-emerald-500 text-center line-clamp-2">{u.name}</span>
            </div>
          )
          return u.href ? (
            <a key={u._id} href={u.href} target={/^https?:\/\//i.test(u.href) ? '_blank' : undefined} rel={/^https?:\/\//i.test(u.href) ? 'noopener noreferrer' : undefined} className="block focus-visible:ring-2 focus-visible:ring-emerald-500 focus:outline-none rounded-xl">
              {card}
            </a>
          ) : (
            <div key={u._id}>{card}</div>
          )
        })}
        {(!items || items.length === 0) && !error ? (
          <div className="text-gray-500">ยังไม่มีลิงก์หน่วยงาน</div>
        ) : null}
      </div>
    </>
  ) : (
    <section className="py-8 bg-gray-50">
      <div className="container-narrow">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold text-balance">ลิงก์หน่วยงาน</h3>
            <p className="text-gray-600 text-sm">เชื่อมต่อไปยังหน่วยงาน/กลุ่มงานภายในที่เกี่ยวข้อง</p>
          </div>
        </div>
        {fetchError ? (
          <div className="border border-red-200 bg-red-50 text-red-700 rounded p-3 mb-4">{error}</div>
        ) : null}
        {!items && !fetchError ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="group flex flex-col items-center justify-center py-6 px-6 bg-white border border-slate-200 rounded-xl animate-pulse h-[138px]">
                <div className="w-14 h-14 mb-3 rounded-full bg-slate-100"></div>
                <div className="h-4 w-20 bg-slate-200 rounded"></div>
              </div>
            ))}
          </div>
        ) : null}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {Array.isArray(items) && items.map(u => {
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
                <span className="font-bold text-slate-700 group-hover:text-emerald-600 text-center line-clamp-2">{u.name}</span>
              </div>
            )
            return u.href ? (
              <a key={u._id} href={u.href} target={/^https?:\/\//i.test(u.href) ? '_blank' : undefined} rel={/^https?:\/\//i.test(u.href) ? 'noopener noreferrer' : undefined} className="block focus-visible:ring-2 focus-visible:ring-emerald-500 focus:outline-none rounded-xl">
                {card}
              </a>
            ) : (
              <div key={u._id}>{card}</div>
            )
          })}
          {(!items || items.length === 0) && !error ? (
            <div className="text-gray-500">ยังไม่มีลิงก์หน่วยงาน</div>
          ) : null}
        </div>
      </div>
    </section>
  )
}
