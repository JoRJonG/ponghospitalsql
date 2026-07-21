// ─── ThaiDateInput Component ──────────────────────────────────

import { useState, useEffect } from 'react'
import { THAI_MONTHS_FULL } from './constants'
import { parseIsoToThai, buildIsoFromThai } from './utils'

const inputClass = (disabled?: boolean) =>
  `w-full px-2 py-2 border border-gray-300 rounded-lg outline-none text-sm ${
    disabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white focus:ring-2 focus:ring-emerald-500'
  }`

const ThaiDateInput = ({
  value,
  onChange,
  id,
  disabled,
}: {
  value: string
  onChange: (isoDate: string) => void
  id?: string
  disabled?: boolean
}) => {
  const currentBE = new Date().getFullYear() + 543
  const yearList = Array.from({ length: currentBE - 2499 }, (_, i) => String(2500 + i))
  const dayList = Array.from({ length: 31 }, (_, i) => String(i + 1))
  const uid = id ?? Math.random().toString(36).slice(2)

  const [dayVal, setDayVal] = useState('')
  const [monthVal, setMonthVal] = useState('')
  const [yearVal, setYearVal] = useState('')

  useEffect(() => {
    const parts = parseIsoToThai(value)
    setDayVal(parts.day)
    setMonthVal(parts.month)
    setYearVal(parts.year)
  }, [value])

  const commit = (d: string, m: string, y: string) => {
    const iso = buildIsoFromThai(d, m, y)
    if (iso) {
      onChange(iso)
    } else if (!d.trim() && !m.trim() && !y.trim()) {
      onChange('')
    }
  }

  const handleBlur = () => {
    // จัดการปี 2 หลักให้กลายเป็น 4 หลักเฉพาะตอนพิมพ์เสร็จแล้ว
    let y = yearVal.trim()
    const parsedY = parseInt(y, 10)
    if (!isNaN(parsedY) && parsedY > 0 && parsedY < 100) {
      y = String(parsedY + 2500)
    }
    const iso = buildIsoFromThai(dayVal, monthVal, y)
    if (iso) {
      const parts = parseIsoToThai(iso)
      setDayVal(parts.day)
      setMonthVal(parts.month)
      setYearVal(parts.year)
      commit(parts.day, parts.month, parts.year)
    } else {
      commit(dayVal, monthVal, yearVal)
    }
  }



  return (
    <div className="flex flex-col gap-1">
      <div className="grid grid-cols-3 gap-2">
        {/* วัน */}
        <div>
          <input
            id={`${uid}-day`}
            list={`${uid}-day-list`}
            value={dayVal}
            onChange={(e) => { setDayVal(e.target.value); commit(e.target.value, monthVal, yearVal) }}
            onBlur={handleBlur}
            placeholder="วัน"
            className={inputClass(disabled)}
            autoComplete="off"
            disabled={disabled}
          />
          <datalist id={`${uid}-day-list`}>
            {dayList.map(d => <option key={d} value={d} />)}
          </datalist>
        </div>
        {/* เดือน */}
        <div>
          <input
            id={`${uid}-month`}
            list={`${uid}-month-list`}
            value={monthVal}
            onChange={(e) => { setMonthVal(e.target.value); commit(dayVal, e.target.value, yearVal) }}
            onBlur={handleBlur}
            placeholder="เดือน"
            className={inputClass(disabled)}
            autoComplete="off"
            disabled={disabled}
          />
          <datalist id={`${uid}-month-list`}>
            {THAI_MONTHS_FULL.map(m => <option key={m} value={m} />)}
          </datalist>
        </div>
        {/* ปี พ.ศ. */}
        <div>
          <input
            id={`${uid}-year`}
            list={`${uid}-year-list`}
            value={yearVal}
            onChange={(e) => { setYearVal(e.target.value); commit(dayVal, monthVal, e.target.value) }}
            onBlur={handleBlur}
            placeholder="พ.ศ."
            className={inputClass(disabled)}
            autoComplete="off"
            disabled={disabled}
          />
          <datalist id={`${uid}-year-list`}>
            {yearList.map(y => <option key={y} value={y} />)}
          </datalist>
        </div>
      </div>
    </div>
  )
}

export default ThaiDateInput
