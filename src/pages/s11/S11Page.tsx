// ─── S11Page — ตัวหลัก (state + orchestration) ───────────────
import { useState, useEffect, useMemo, useRef } from 'react'
import type { SelectInstance } from 'react-select'
import Swal from 'sweetalert2'

import type { FormDataState, TrainingDateField, TrainingExtraEntry, PositionOption } from './types'
import {
  months,
  positions,
  MAX_WORK_HISTORY_ITEMS,
  MAX_INPUT_LENGTH,
  VALID_NAME_REGEX,
} from './constants'
import {
  sanitizeInput,
  convertToThaiNumber,
  calculateDateDifference,
  aggregateDurations,
  getAmountForProfession,
  getNext12MonthsWithYear,
  numberToThaiText,
} from './utils'
import S11FormPage from './S11FormPage'
import S11PrintView from './S11PrintView'

// ── Numeric fields ───────────────────────────────────────────
const numericFieldNames = new Set<keyof FormDataState>([
  'startYear',
  'trainingPracticeYears',
  'trainingPracticeMonths',
])

const INITIAL_FORM: FormDataState = {
  name: '',
  surname: '',
  position: '',
  currentWorkplace: 'โรงพยาบาลปง',
  province: 'พะเยา',
  level: '',
  trainingPracticeYears: '',
  trainingPracticeMonths: '',
  startDate: '',
  endDate: new Date(Date.UTC(new Date().getFullYear(), 8, 30)).toISOString(),
  unit: 'โรงพยาบาลปง',
  startMonth: 'กันยายน',
  startYear: new Date().getFullYear() + 543,
  amount: '',
  trainingRphHospital: '',
  trainingRphProvince: '',
  trainingRphStart: '',
  trainingRphEnd: '',
  trainingRhcHospital: '',
  trainingRhcProvince: '',
  trainingRhcStart: '',
  trainingRhcEnd: '',
  extraTraining: [],
  workHistory: [],
}

const S11Page = () => {
  const [formData, setFormData] = useState<FormDataState>(INITIAL_FORM)
  const [generated, setGenerated] = useState(false)
  const positionSelectRef = useRef<SelectInstance<PositionOption> | null>(null)

  // ── Duration calculations ────────────────────────────────
  const currentWorkDuration = useMemo(
    () => calculateDateDifference(formData.startDate, formData.endDate, false),
    [formData.startDate, formData.endDate],
  )

  const historyWorkDuration = useMemo(
    () =>
      formData.workHistory.reduce(
        (sum, job) => {
          const diff = calculateDateDifference(job.startDate, job.endDate, false)
          return {
            years: sum.years + diff.years,
            months: sum.months + diff.months,
            days: sum.days + diff.days,
          }
        },
        { years: 0, months: 0, days: 0 },
      ),
    [formData.workHistory],
  )

  const trainingDuration = useMemo(
    () => ({
      years: Number(formData.trainingPracticeYears) || 0,
      months: Number(formData.trainingPracticeMonths) || 0,
      days: 0,
    }),
    [formData.trainingPracticeYears, formData.trainingPracticeMonths],
  )

  const totalExperienceDuration = useMemo(
    () => aggregateDurations([currentWorkDuration, historyWorkDuration, trainingDuration]),
    [currentWorkDuration, historyWorkDuration, trainingDuration],
  )

  const totalYearsOfExperience = totalExperienceDuration.years

  // ── Auto-calculate amount ────────────────────────────────
  useEffect(() => {
    if (formData.position) {
      const sel = positions.find((p) => p.name === formData.position)
      if (sel) {
        setFormData((prev) => ({
          ...prev,
          amount: getAmountForProfession(sel.category, totalYearsOfExperience),
        }))
      }
    } else {
      setFormData((prev) => ({ ...prev, amount: '' }))
    }
  }, [formData.position, totalYearsOfExperience])

  // ── Handlers ─────────────────────────────────────────────
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    const fieldName = name as keyof FormDataState
    if (fieldName === 'name' || fieldName === 'surname') {
      if (!VALID_NAME_REGEX.test(value)) return
    }
    const sanitizedValue = sanitizeInput(value)
    if (sanitizedValue.length > MAX_INPUT_LENGTH && !numericFieldNames.has(fieldName)) return
    setFormData((prev) => ({
      ...prev,
      [fieldName]: numericFieldNames.has(fieldName)
        ? value === '' ? '' : Number(value)
        : sanitizedValue,
    }))
  }

  const handlePrimaryDateChange = (field: 'startDate' | 'endDate', isoDate: string) => {
    setFormData((prev) => ({ ...prev, [field]: isoDate }))
  }

  const handleTrainingDateChange = (field: TrainingDateField, isoDate: string) => {
    setFormData((prev) => ({ ...prev, [field]: isoDate }))
  }

  const handlePositionChange = (option: PositionOption | null) => {
    setFormData((prev) => ({ ...prev, position: option ? option.value : '' }))
  }

  const addWorkHistory = () => {
    if (formData.workHistory.length >= MAX_WORK_HISTORY_ITEMS) {
      Swal.fire({
        icon: 'warning',
        title: 'เกินขีดจำกัด',
        text: `สามารถเพิ่มประวัติการทำงานได้สูงสุด ${MAX_WORK_HISTORY_ITEMS} รายการ`,
        confirmButtonColor: '#10b981',
      })
      return
    }
    setFormData((prev) => ({
      ...prev,
      workHistory: [
        ...prev.workHistory,
        { id: Date.now().toString(), hospital: '', province: '', classification: '', level: '', startDate: '', endDate: '' },
      ],
    }))
  }

  const removeWorkHistory = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      workHistory: prev.workHistory.filter((e) => e.id !== id),
    }))
  }

  const handleWorkHistoryChange = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    const sanitized = sanitizeInput(value)
    if (sanitized.length > MAX_INPUT_LENGTH) return
    setFormData((prev) => ({
      ...prev,
      workHistory: prev.workHistory.map((entry) =>
        entry.id === id ? { ...entry, [name]: sanitized } : entry,
      ),
    }))
  }

  const handleWorkHistoryDateChange = (id: string, field: 'startDate' | 'endDate', isoDate: string) => {
    setFormData((prev) => ({
      ...prev,
      workHistory: prev.workHistory.map((entry) =>
        entry.id === id ? { ...entry, [field]: isoDate } : entry,
      ),
    }))
  }

  const addExtraTraining = () => {
    if (formData.extraTraining.length >= 3) {
      Swal.fire({
        icon: 'warning',
        title: 'จำกัดจำนวน',
        text: 'เพิ่มการฝึกเพิ่มพูนทักษะอื่นๆ ได้สูงสุด 3 รายการเท่านั้น',
        confirmButtonColor: '#10b981',
      })
      return
    }
    setFormData((prev) => ({
      ...prev,
      extraTraining: [
        ...prev.extraTraining,
        { id: Date.now().toString(), type: 'รพศ/รพท', hospital: '', province: '', startDate: '', endDate: '' },
      ],
    }))
  }

  const removeExtraTraining = (index: number) => {
    setFormData((prev) => {
      const newList = [...prev.extraTraining]
      newList.splice(index, 1)
      return { ...prev, extraTraining: newList }
    })
  }

  const handleExtraTrainingChange = (index: number, field: keyof TrainingExtraEntry, value: string) => {
    setFormData((prev) => {
      const newList = [...prev.extraTraining]
      newList[index] = { ...newList[index], [field]: value }
      return { ...prev, extraTraining: newList }
    })
  }

  // ── Derived display values ───────────────────────────────
  const currentBuddhistYear = new Date().getFullYear() + 543

  const resolvedStartYear =
    typeof formData.startYear === 'number' && Number.isFinite(formData.startYear)
      ? formData.startYear
      : currentBuddhistYear
  const resolvedStartMonth = months.includes(formData.startMonth) ? formData.startMonth : months[0]
  const monthsData = getNext12MonthsWithYear(resolvedStartMonth, resolvedStartYear)

  const totalMonthsOfExperience = totalExperienceDuration.years * 12 + totalExperienceDuration.months
  const historyWorkMonths = historyWorkDuration.years * 12 + historyWorkDuration.months
  const trainingMonthsTotal = trainingDuration.years * 12 + trainingDuration.months

  const trainingPracticeYearsDisplay =
    typeof formData.trainingPracticeYears === 'number' && Number.isFinite(formData.trainingPracticeYears)
      ? convertToThaiNumber(formData.trainingPracticeYears)
      : '..............'
  const trainingPracticeMonthsDisplay =
    typeof formData.trainingPracticeMonths === 'number' && Number.isFinite(formData.trainingPracticeMonths)
      ? convertToThaiNumber(formData.trainingPracticeMonths)
      : '..............'

  const amountValue =
    typeof formData.amount === 'number' && Number.isFinite(formData.amount) ? formData.amount : NaN
  const amountDisplayText = Number.isFinite(amountValue) ? convertToThaiNumber(amountValue) : ''
  const amountThaiText = Number.isFinite(amountValue) ? numberToThaiText(amountValue) : ''




  const addedTrainingLines = formData.extraTraining.length

  // ── Form submit validation ───────────────────────────────
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const focusField = (el: HTMLElement | null) => {
      if (!el) return
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setTimeout(() => el.focus(), 300)
    }

    const checkRequired = (condition: boolean, action: () => void, message: string) => {
      if (!condition) {
        Swal.fire({
          icon: 'warning',
          title: 'ข้อมูลไม่ครบถ้วน',
          text: message,
          confirmButtonColor: '#10b981',
        }).then(() => {
          action()
        })
        return false
      }
      return true
    }

    if (!checkRequired(!!formData.name?.trim(), () => focusField(document.querySelector<HTMLElement>('input[name="name"]')), 'กรุณากรอกชื่อ')) return
    if (!checkRequired(!!formData.surname?.trim(), () => focusField(document.querySelector<HTMLElement>('input[name="surname"]')), 'กรุณากรอกนามสกุล')) return
    if (!checkRequired(!!formData.position, () => positionSelectRef.current?.focus(), 'กรุณาเลือกตำแหน่ง')) return
    if (!checkRequired(!!formData.level?.trim(), () => focusField(document.getElementById('level-input')), 'กรุณากรอกงาน/กลุ่มงาน')) return
    if (!checkRequired(!!formData.startDate, () => focusField(document.getElementById('startDate-input-day')), 'กรุณากรอกวันที่เริ่มปฏิบัติงาน (ปัจจุบัน)')) return
    if (!checkRequired(!!formData.endDate, () => focusField(document.getElementById('endDate-input-day')), 'กรุณากรอกวันที่สิ้นสุดปฏิบัติงาน (ปัจจุบัน)')) return

    const validateDateRange = (start: string, end: string, label: string) => {
      if (start && end) {
        const d1 = new Date(start)
        const d2 = new Date(end)
        if (!isNaN(d1.getTime()) && !isNaN(d2.getTime()) && d1 > d2) {
          Swal.fire({
            icon: 'error',
            title: 'วันที่ไม่ถูกต้อง',
            text: `วันที่สิ้นสุดของ "${label}" ต้องไม่น้อยกว่าวันที่เริ่มต้น กรุณาตรวจสอบเดือนและปี พ.ศ. อีกครั้ง`,
            confirmButtonColor: '#10b981',
          })
          return false
        }
      }
      return true
    }

    if (!validateDateRange(formData.startDate, formData.endDate, 'สถานที่ปฏิบัติงานปัจจุบัน')) return

    for (let i = 0; i < formData.workHistory.length; i++) {
      const job = formData.workHistory[i]
      if (!validateDateRange(job.startDate, job.endDate, `ประวัติการปฏิบัติงานที่ ${i + 1}`)) return

      if (i > 0) {
        const prevJob = formData.workHistory[i - 1]
        if (job.startDate && prevJob.endDate) {
          const currentStart = new Date(job.startDate)
          const prevEnd = new Date(prevJob.endDate)
          if (!isNaN(currentStart.getTime()) && !isNaN(prevEnd.getTime()) && currentStart < prevEnd) {
            Swal.fire({
              icon: 'error',
              title: 'ลำดับวันที่ไม่ถูกต้อง',
              text: `วันที่เริ่มต้นของ "สถานที่ทำงานที่ ${i + 1}" ต้องไม่น้อยกว่าวันที่สิ้นสุดของ "สถานที่ทำงานที่ ${i}"`,
              confirmButtonColor: '#10b981',
            })
            return
          }
        }
      }
    }

    if (formData.workHistory.length > 0) {
      const lastJob = formData.workHistory[formData.workHistory.length - 1]
      if (formData.startDate && lastJob.endDate) {
        const currentStart = new Date(formData.startDate)
        const lastEnd = new Date(lastJob.endDate)
        if (!isNaN(currentStart.getTime()) && !isNaN(lastEnd.getTime()) && currentStart < lastEnd) {
          Swal.fire({
            icon: 'error',
            title: 'ลำดับวันที่ไม่ถูกต้อง',
            text: `วันที่เริ่มต้นของ "สถานที่ปฏิบัติงานปัจจุบัน" ต้องไม่น้อยกว่าวันที่สิ้นสุดของ "สถานที่ทำงานที่ ${formData.workHistory.length}"`,
            confirmButtonColor: '#10b981',
          })
          return
        }
      }
    }

    if (!validateDateRange(formData.trainingRphStart, formData.trainingRphEnd, 'ฝึกเพิ่มพูนทักษะ รพศ/รพท')) return
    if (!validateDateRange(formData.trainingRhcStart, formData.trainingRhcEnd, 'ฝึกเพิ่มพูนทักษะ รพช')) return

    for (let i = 0; i < formData.extraTraining.length; i++) {
      const extra = formData.extraTraining[i]
      if (!validateDateRange(extra.startDate, extra.endDate, `การฝึกเพิ่มพูนทักษะ ${extra.type}`)) return
    }

    setGenerated(true)
    window.scrollTo(0, 0)
  }

  // ── Render ───────────────────────────────────────────────
  if (!generated) {
    return (
      <S11FormPage
        formData={formData}
        positionSelectRef={positionSelectRef}
        currentWorkDuration={currentWorkDuration}
        historyWorkDuration={historyWorkDuration}
        historyWorkMonths={historyWorkMonths}
        trainingDuration={trainingDuration}
        trainingMonthsTotal={trainingMonthsTotal}
        totalExperienceDuration={totalExperienceDuration}
        totalYearsOfExperience={totalYearsOfExperience}
        numberToThaiText={numberToThaiText}
        onInputChange={handleInputChange}
        onPrimaryDateChange={handlePrimaryDateChange}
        onTrainingDateChange={handleTrainingDateChange}
        onPositionChange={handlePositionChange}
        onAddWorkHistory={addWorkHistory}
        onRemoveWorkHistory={removeWorkHistory}
        onWorkHistoryChange={handleWorkHistoryChange}
        onWorkHistoryDateChange={handleWorkHistoryDateChange}
        onAddExtraTraining={addExtraTraining}
        onRemoveExtraTraining={removeExtraTraining}
        onExtraTrainingChange={handleExtraTrainingChange}
        onSubmit={handleFormSubmit}
      />
    )
  }

  return (
    <S11PrintView
      formData={formData}
      monthsData={monthsData}
      baseTotalMonths={totalMonthsOfExperience}
      totalExperienceDuration={totalExperienceDuration}
      currentWorkDuration={currentWorkDuration}
      trainingPracticeYearsDisplay={trainingPracticeYearsDisplay}
      trainingPracticeMonthsDisplay={trainingPracticeMonthsDisplay}
      addedTrainingLines={addedTrainingLines}
      amountDisplayText={amountDisplayText}
      amountThaiText={amountThaiText}
      onBack={() => setGenerated(false)}
    />
  )
}

export default S11Page
