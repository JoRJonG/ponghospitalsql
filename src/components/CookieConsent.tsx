import { useEffect, useState } from 'react'

const STORAGE_KEY = 'cookie-consent'
const CONSENT_VALUE = 'accepted'

export default function CookieConsent() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      if (stored !== CONSENT_VALUE) {
        setVisible(true)
      }
    } catch (error) {
      // localStorage not available (e.g. privacy settings)
      setVisible(true)
    }
  }, [])

  const accept = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, CONSENT_VALUE)
    } catch (error) {
      // Ignore storage write issues; consent banner will reappear next visit
    }
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-[9999] bg-slate-900/95 text-white shadow-lg">
      <div className="app-container flex flex-col gap-4 py-4 text-sm md:flex-row md:items-center md:justify-between">
        <p className="leading-relaxed">
          เราใช้คุกกี้เพื่อช่วยให้ไซต์ของเราทำงานได้อย่างถูกต้อง แสดงเนื้อหาและโฆษณาที่ตรงกับความสนใจของผู้ใช้ เปิดให้ใช้คุณสมบัติทางโซเชียลมีเดีย และเพื่อวิเคราะห์การเข้าถึงข้อมูลของเรา เรายังแบ่งปันข้อมูลการใช้งานไซต์กับพาร์ทเนอร์โซเชียลมีเดีย การโฆษณาและพาร์ทเนอร์การวิเคราะห์ของเราอีกด้วย{' '}
          <a className="underline decoration-emerald-400/70 decoration-2 underline-offset-4 hover:text-emerald-200" href="/privacy" target="_blank" rel="noopener noreferrer">
            ข้อมูลเพิ่มเติมเกี่ยวกับความเป็นส่วนตัวของคุณ
          </a>
        </p>
        <button onClick={accept} className="w-full rounded-md bg-emerald-500 px-5 py-2 text-center text-sm font-medium text-white transition hover:bg-emerald-600 md:w-auto">
          ยอมรับ
        </button>
      </div>
    </div>
  )
}
