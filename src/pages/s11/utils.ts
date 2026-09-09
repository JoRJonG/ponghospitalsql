// ─── Utility Functions สำหรับหน้า S11 ───────────────────────

import DOMPurify from 'dompurify'
import { months, THAI_MONTHS_FULL, THAI_MONTHS_SHORT, amountRates } from './constants'
import type { ThaiDateParts, TrainingValues, TrainingLine } from './types'

// ── Sanitize ──────────────────────────────────────────────────
export const sanitizeInput = (input: string): string =>
  DOMPurify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })

// ── Thai Number Conversion ────────────────────────────────────
export const convertToThaiNumber = (value: number | string | null | undefined): string => {
  if (value === null || value === undefined || value === '') return ''
  const thaiDigits = ['๐', '๑', '๒', '๓', '๔', '๕', '๖', '๗', '๘', '๙']
  return String(value)
    .split('')
    .map((char) => {
      if (char.trim() === '') return char
      const parsed = Number(char)
      return Number.isNaN(parsed) ? char : thaiDigits[parsed]
    })
    .join('')
}

/**
 * แสดงจำนวนเงินพร้อม comma ตามหลักพัน แล้วแปลงตัวเลขเป็นเลขไทย
 * เช่น 12500 → "๑๒,๕๐๐"
 */
export const formatThaiAmount = (value: number | string | null | undefined): string => {
  if (value === null || value === undefined || value === '') return ''
  const num = Number(value)
  if (!Number.isFinite(num)) return ''
  // จัดรูปแบบด้วย comma ก่อน แล้วแปลงเลขอารบิคเป็นเลขไทย
  const formatted = num.toLocaleString('th-TH')
  return convertToThaiNumber(formatted)
}

// ── Thai Date Utilities ───────────────────────────────────────
export const formatThaiDate = (isoDate: string): string => {
  if (!isoDate) return ''
  const date = new Date(isoDate)
  if (Number.isNaN(date.getTime())) return convertToThaiNumber(isoDate)
  const day = convertToThaiNumber(date.getDate())
  const monthName = months[date.getMonth()] ?? ''
  const buddhistYear = date.getFullYear() + 543
  const yearText = convertToThaiNumber(buddhistYear)
  return `${day} ${monthName} ${yearText}`.trim()
}

export const parseThaiDateParts = (isoDate: string): ThaiDateParts => {
  const fallbackYear = new Date().getFullYear() + 543
  const date = new Date(isoDate)
  if (Number.isNaN(date.getTime())) {
    return { day: 1, monthIndex: 0, buddhistYear: fallbackYear }
  }
  return {
    day: date.getDate(),
    monthIndex: date.getMonth(),
    buddhistYear: date.getFullYear() + 543,
  }
}

export const buildIsoDate = ({ day, monthIndex, buddhistYear }: ThaiDateParts): string => {
  const gregorianYear = buddhistYear - 543
  const candidate = new Date(gregorianYear, monthIndex, day)
  if (
    Number.isNaN(candidate.getTime()) ||
    candidate.getFullYear() !== gregorianYear ||
    candidate.getMonth() !== monthIndex ||
    candidate.getDate() !== day
  ) {
    return ''
  }
  const yearString = candidate.getFullYear()
  const monthString = String(candidate.getMonth() + 1).padStart(2, '0')
  const dayString = String(candidate.getDate()).padStart(2, '0')
  return `${yearString}-${monthString}-${dayString}`
}

export const getLastDayOfThaiMonth = (buddhistYear: number, monthIndex: number): number => {
  const gregorianYear = buddhistYear - 543
  return new Date(gregorianYear, monthIndex + 1, 0).getDate()
}

// ── ThaiDateInput helpers ─────────────────────────────────────
export const parseIsoToThai = (iso: string) => {
  if (!iso) return { day: '', month: '', year: '' }
  const d = new Date(iso)
  if (isNaN(d.getTime())) return { day: '', month: '', year: '' }
  return {
    day: String(d.getDate()),
    month: THAI_MONTHS_FULL[d.getMonth()],
    year: String(d.getFullYear() + 543),
  }
}

export const resolveMonthIndex = (month: string): number => {
  const m = month.trim()
  if (!m) return -1
  let idx = THAI_MONTHS_FULL.findIndex(x => x === m)
  if (idx >= 0) return idx
  idx = THAI_MONTHS_SHORT.findIndex(x => x === m)
  if (idx >= 0) return idx
  const num = parseInt(m, 10)
  if (!isNaN(num) && num >= 1 && num <= 12) return num - 1
  // Fallback ค้นหาบางส่วน (เช่น พิมพ์ "มกรา")
  idx = THAI_MONTHS_FULL.findIndex(x => x.startsWith(m))
  if (idx >= 0) return idx
  return -1
}

export const buildIsoFromThai = (day: string, month: string, year: string): string => {
  const dayNum = parseInt(day.trim(), 10)
  const monthIdx = resolveMonthIndex(month)
  const yearBE = parseInt(year.trim(), 10)
  // บังคับให้เป็นปี พ.ศ. 4 หลักที่สมเหตุสมผล เพื่อป้องกันอัปเดตผิดพลาดระหว่างพิมพ์
  if (isNaN(dayNum) || monthIdx < 0 || isNaN(yearBE) || yearBE < 2400 || yearBE > 2600) return ''
  const yearCE = yearBE - 543
  const d = new Date(yearCE, monthIdx, dayNum)
  if (d.getFullYear() !== yearCE || d.getMonth() !== monthIdx || d.getDate() !== dayNum) return ''
  return `${yearCE}-${String(monthIdx + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
}

// ── Training Line Builder ─────────────────────────────────────
export const buildTrainingLine = (
  label: string,
  placeholders: TrainingValues,
  values: TrainingValues,
  fallback: TrainingLine,
): TrainingLine => {
  const hospital = values.hospital?.trim() ?? ''
  const province = values.province?.trim() ?? ''
  const start = values.start?.trim() ?? ''
  const end = values.end?.trim() ?? ''

  const hasData = hospital || province || start || end
  if (!hasData) return fallback

  const hospitalText = hospital ? ` ${hospital}` : placeholders.hospital ?? ''
  const provinceText = province ? ` ${province}` : placeholders.province ?? ''
  const startText = start ? ` ${start}` : placeholders.start ?? ''
  const endText = end ? ` ${end}` : placeholders.end ?? ''

  return {
    main: `• ${label}${hospitalText} จังหวัด${provinceText}`,
    period: `ตั้งแต่${startText}ถึง${endText}`,
  }
}

// ── Number to Thai Text ───────────────────────────────────────
export const numberToThaiText = (num: number): string => {
  const thaiDigits = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า']
  const thaiPositions = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน']

  if (!Number.isFinite(num) || num < 0) return ''
  const integer = Math.floor(num)
  if (integer === 0) return 'ศูนย์บาทถ้วน'

  const convertSegment = (segment: string): string => {
    const digits = segment.split('')
    const len = digits.length
    let text = ''
    digits.forEach((digitChar, index) => {
      const digit = Number(digitChar)
      if (Number.isNaN(digit) || digit === 0) return
      const position = len - index - 1
      if (position === 0) {
        text += digit === 1 && len > 1 ? 'เอ็ด' : thaiDigits[digit]
        return
      }
      if (position === 1) {
        if (digit === 1) text += 'สิบ'
        else if (digit === 2) text += 'ยี่สิบ'
        else text += thaiDigits[digit] + thaiPositions[position]
        return
      }
      text += thaiDigits[digit] + thaiPositions[position]
    })
    return text
  }

  const segments: string[] = []
  let remaining = integer.toString()
  while (remaining.length > 0) {
    segments.unshift(remaining.slice(-6))
    remaining = remaining.slice(0, -6)
  }

  let result = ''
  segments.forEach((segment, index) => {
    const segmentText = convertSegment(segment)
    if (segmentText) result += segmentText
    if (index < segments.length - 1 && (segmentText || result)) result += 'ล้าน'
  })

  return `${result}บาทถ้วน`
}

// ── Position Title Resolver ───────────────────────────────────
/**
 * แปลงชื่อตำแหน่งแพทย์ตามคำนำหน้าชื่อ
 *   นาย        + แพทย์ → นายแพทย์[ระดับ]
 *   นาง/นางสาว + แพทย์ → แพทย์[ระดับ]  (คงเดิม)
 */
export const resolvePositionTitle = (
  title: string,
  position: string,
  positionLevel: string,
): string => {
  if (!position) return ''
  const base = (title === 'นาย' && position === 'แพทย์') ? 'นายแพทย์' : position
  return positionLevel ? `${base}${positionLevel}` : base
}

// ── Date/Month Utilities ──────────────────────────────────────
export const getNext12MonthsWithYear = (startMonth: string, startYear: number) => {
  const fallbackIndex = 0
  const startIndex = months.indexOf(startMonth)
  const safeIndex = startIndex === -1 ? fallbackIndex : startIndex
  const data = []
  for (let i = 0; i < 12; i += 1) {
    const monthIndex = (safeIndex + i) % 12
    const year = startYear + Math.floor((safeIndex + i) / 12)
    data.push({ month: months[monthIndex], year })
  }
  return data
}

/**
 * คำนวณผลต่างวันที่แบบ Inclusive (นับรวมทั้งวันเริ่มและวันสิ้นสุด)
 *
 * Algorithm: Calendar-based subtraction — ลบ ปี/เดือน/วัน โดยตรง
 * แล้ว borrow กลับเมื่อค่าติดลบ (ไม่ใช้การนับวันดิบ)
 *
 * ตัวอย่าง:
 *   1 มิ.ย. – 30 มิ.ย.   →  1 เดือน  0 วัน
 *   1 ม.ค. – 31 ธ.ค.   →  1 ปี  0 เดือน  0 วัน
 *   1 ส.ค. – 30 พ.ย. (ข้ามปี)  →  1 ปี  4 เดือน  0 วัน
 */
export const calculateDateDifference = (
  startDate: string,
  endDate: string,
  useNowIfEndEmpty = false,
): { years: number; months: number; days: number } => {
  const ZERO = { years: 0, months: 0, days: 0 }
  if (!startDate) return ZERO

  const s = new Date(startDate)
  if (Number.isNaN(s.getTime())) return ZERO

  let endResolved: Date
  if (!endDate) {
    if (useNowIfEndEmpty) endResolved = new Date()
    else return ZERO
  } else {
    endResolved = new Date(endDate)
    if (Number.isNaN(endResolved.getTime())) return ZERO
  }

  if (s > endResolved) return ZERO

  // Inclusive end → สร้าง exclusive end ใหม่ (ไม่ mutate ตัวแปรเดิม)
  // ใช้ Date constructor เพื่อให้ JS handle overflow เองอัตโนมัติ
  // เช่น new Date(2021, 5, 31) → 1 ก.ค. 2021 โดยอัตโนมัติ
  const excl = new Date(
    endResolved.getFullYear(),
    endResolved.getMonth(),
    endResolved.getDate() + 1,
  )

  let y = excl.getFullYear() - s.getFullYear()
  let m = excl.getMonth()    - s.getMonth()
  let d = excl.getDate()     - s.getDate()

  // Borrow จากเดือน ถ้าวันติดลบ
  if (d < 0) {
    m--
    // วันสุดท้ายของเดือนก่อนหน้าของ excl (ใช้ excl ที่ถูกต้อง ไม่ใช่ end ที่ถูก mutate)
    d += new Date(excl.getFullYear(), excl.getMonth(), 0).getDate()
  }
  // Borrow จากปี ถ้าเดือนติดลบ
  if (m < 0) {
    y--
    m += 12
  }

  return { years: Math.max(0, y), months: Math.max(0, m), days: Math.max(0, d) }
}

/**
 * รวมช่วงเวลาหลายช่วง พร้อม normalize แบบ Cascade ตามมาตรฐานราชการไทย
 *   30 วัน = 1 เดือน  |  12 เดือน = 1 ปี
 *
 * หมายเหตุ: ใช้ 30 วัน/เดือน ตามระเบียบกรมบัญชีกลาง
 * (ไม่ใช้จำนวนวันจริงของแต่ละเดือน เนื่องจากไม่มี reference date สำหรับ aggregate)
 */
export const aggregateDurations = (
  durations: { years: number; months: number; days: number }[],
): { years: number; months: number; days: number } => {
  let y = 0, m = 0, d = 0

  for (const { years, months, days } of durations) {
    y += years
    m += months
    d += days
  }

  // Cascade normalize: วัน → เดือน → ปี (ต้องทำตามลำดับ)
  m += Math.floor(d / 30); d %= 30
  y += Math.floor(m / 12); m %= 12

  return { years: y, months: m, days: d }
}

// ── Amount Calculator ─────────────────────────────────────────
export const getAmountForProfession = (
  profession: string,
  experience: { years: number; months: number; days: number } | number
): number | '' => {
  const rates = amountRates[profession as keyof typeof amountRates]
  if (!rates) return ''
  
  const y = typeof experience === 'number' ? experience : experience.years
  const m = typeof experience === 'number' ? 0 : experience.months

  // เรท 10+ (10 ปี 1 เดือนขึ้นไป)
  if (y > 10 || (y === 10 && m >= 1)) return rates['10+']
  
  // เรท 4-10 (3 ปี 1 เดือนขึ้นไป ถึง 10 ปี 0 เดือน)
  if (y > 3 || (y === 3 && m >= 1)) return rates['4-10']
  
  // เรท 1-3 (ไม่เกิน 3 ปี 0 เดือน)
  return rates['1-3']
}
