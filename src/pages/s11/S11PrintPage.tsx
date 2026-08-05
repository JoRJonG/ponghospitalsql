// ─── S11PrintPage — หน้าเอกสารพิมพ์แต่ละเดือน ─────────────────

import { Fragment } from 'react'
import type { FormDataState } from './types'
import { positions } from './constants'
import {
  convertToThaiNumber,
  formatThaiDate,
  buildTrainingLine,
  calculateDateDifference,
  parseThaiDateParts,
  buildIsoDate,
  getLastDayOfThaiMonth,
  getAmountForProfession,
  numberToThaiText,
} from './utils'

type Props = {
  item: { month: string; year: number }
  index: number
  isLast: boolean
  formData: FormDataState
  baseTotalMonths: number
  totalExperienceDuration: { years: number; months: number; days: number }
  currentWorkDuration: { years: number; months: number; days: number }
  trainingPracticeYearsDisplay: string
  trainingPracticeMonthsDisplay: string
  addedTrainingLines: number
}

const S11PrintPage = ({
  item,
  index,
  isLast,
  formData,
  baseTotalMonths,
  totalExperienceDuration,
  currentWorkDuration,
  trainingPracticeYearsDisplay,
  trainingPracticeMonthsDisplay,
  addedTrainingLines,
}: Props) => {
  // เลื่อน endDate ตาม index เดือน (คำนวณก่อน เพื่อให้ได้ days ที่ถูกต้องตามปฏิทินจริง)
  let advancedEndDate = ''
  if (formData.endDate) {
    const ep = parseThaiDateParts(formData.endDate)
    const totalM = ep.monthIndex + index
    const newMonthIndex = totalM % 12
    const newBuddhistYear = ep.buddhistYear + Math.floor(totalM / 12)
    const lastDay = getLastDayOfThaiMonth(newBuddhistYear, newMonthIndex)
    advancedEndDate = buildIsoDate({
      day: Math.min(ep.day, lastDay),
      monthIndex: newMonthIndex,
      buddhistYear: newBuddhistYear,
    })
  }

  // days ของสถานที่ปัจจุบัน: คำนวณใหม่จาก advancedEndDate ของหน้านี้ (เปลี่ยนตามเดือน)
  const advancedCurrentDays = advancedEndDate
    ? calculateDateDifference(formData.startDate, advancedEndDate).days
    : currentWorkDuration.days

  const totalMonthsWithOffset = baseTotalMonths + index
  const yearsWithOffset = Math.floor(totalMonthsWithOffset / 12)
  const monthsWithOffset = totalMonthsWithOffset % 12
  // days รวมทั้งสิ้น = current (advanced) + history + training (fixed)
  const nonCurrentDays = totalExperienceDuration.days - currentWorkDuration.days
  const daysWithOffset = advancedCurrentDays + nonCurrentDays

  // คำนวณ amount ตาม yearsWithOffset/monthsWithOffset ของหน้านี้
  const positionCategory = positions.find((p) => p.name === formData.position)?.category ?? ''
  const pageAmountRaw = positionCategory
    ? getAmountForProfession(positionCategory, { years: yearsWithOffset, months: monthsWithOffset, days: daysWithOffset })
    : ''
  const pageAmountDisplay = typeof pageAmountRaw === 'number' ? convertToThaiNumber(pageAmountRaw) : ''
  const pageAmountText = typeof pageAmountRaw === 'number' ? numberToThaiText(pageAmountRaw) : ''

  const currentWorkMonthsWithOffset =
    currentWorkDuration.years * 12 + currentWorkDuration.months + index
  const currentJobYears = Math.floor(currentWorkMonthsWithOffset / 12)
  const currentJobMonths = currentWorkMonthsWithOffset % 12
  const currentJobDays = advancedCurrentDays  // ← เปลี่ยนตามเดือนจริง





  const renderHospital = (name: string) => {
    if (!name) return 'โรงพยาบาล............................'
    const trimmed = name.trim()
    if (
      trimmed.startsWith('โรงพยาบาล') ||
      trimmed.startsWith('รพ.') ||
      trimmed.startsWith('สำนักงาน') ||
      trimmed.startsWith('สสจ.') ||
      trimmed.startsWith('สสอ.') ||
      trimmed.startsWith('รพ.สต.')
    ) {
      return ` ${trimmed} `
    }
    return ` โรงพยาบาล${trimmed} `
  }

  // ── Work History Items ──────────────────────────────────────
  const uniqueWorkHistory = (() => {
    const seen = new Set<string>()
    return formData.workHistory.filter((job) => {
      const key = [job.hospital, job.province, job.classification, job.level, job.startDate, job.endDate].join('|')
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  })()

  // ตรวจสอบว่ามีรายการใดมีแนวโน้มขึ้นบรรทัดใหม่หรือกินพื้นที่เพิ่มหรือไม่
  const hasWrappedLine = (() => {
    if (formData.trainingRecords.length > 0) return true
    if (formData.currentWorkplace && formData.currentWorkplace.length > 35) return true
    return uniqueWorkHistory.some((job) => {
      const hospitalName = job.hospital ? job.hospital.trim() : ''
      return hospitalName.length > 35 || (job.entryType === 'study' && hospitalName.length > 32)
    })
  })()

  // ถ้าขึ้นบรรทัดใหม่/เกินหน้า ให้ตัดเหลือ 4 สล็อต (สุดที่ข้อ ๖) ถ้าปกติให้ 5 สล็อต (สุดที่ข้อ ๗)
  const maxAllowedHistorySlots = hasWrappedLine ? 4 : 5
  const baseWorkHistorySlots = hasWrappedLine ? 4 : 5

  const calculatedSlots = Math.max(
    baseWorkHistorySlots - addedTrainingLines,
    uniqueWorkHistory.length,
  )
  const workHistorySlots = Math.min(maxAllowedHistorySlots, calculatedSlots)
  const filledCount = Math.min(uniqueWorkHistory.length, workHistorySlots)
  const workItems = []
  let itemIndex = 2

  for (let i = 0; i < filledCount; i++) {
    const job = uniqueWorkHistory[i]
    const { years, months: jobMonths, days: jobDays } = calculateDateDifference(job.startDate, job.endDate)
    const isStudy = job.entryType === 'study'

    if (isStudy) {
      workItems.push(
        <Fragment key={job.id}>
          <p>
            {convertToThaiNumber(itemIndex)}. ลาไปศึกษาต่อ{job.hospital ? ` ${job.hospital.trim()} ` : '............................'}จังหวัด{job.province ? ` ${job.province} ` : '..........................'}
          </p>
          <p className="pl-6">
            ตั้งแต่วันที่{job.startDate ? ` ${formatThaiDate(job.startDate)} ` : '.....................................'}ถึงวันที่{job.endDate ? ` ${formatThaiDate(job.endDate)} ` : '..............................'}รวม {convertToThaiNumber(years)} ปี {convertToThaiNumber(jobMonths)} เดือน {convertToThaiNumber(jobDays)} วัน
          </p>
        </Fragment>
      )
    } else {
      workItems.push(
        <Fragment key={job.id}>
          <p>
            {convertToThaiNumber(itemIndex)}. ปฏิบัติงานที่{renderHospital(job.hospital)}จังหวัด{job.province ? ` ${job.province} ` : '..........................'}จัดระดับ{job.classification ? ` ${job.classification} ` : '...................'}ระดับ{job.level ? ` ${convertToThaiNumber(job.level)} ` : '..................'}
          </p>
          <p className="pl-6">
            ตั้งแต่วันที่{job.startDate ? ` ${formatThaiDate(job.startDate)} ` : '.....................................'}ถึงวันที่{job.endDate ? ` ${formatThaiDate(job.endDate)} ` : '..............................'}รวม {convertToThaiNumber(years)} ปี {convertToThaiNumber(jobMonths)} เดือน {convertToThaiNumber(jobDays)} วัน
          </p>
        </Fragment>
      )
    }
    itemIndex++
  }

  // ปัจจุบัน
  workItems.push(
    <Fragment key="current-work">
      <p>
        {convertToThaiNumber(itemIndex)}. ปฏิบัติงานที่{renderHospital(formData.currentWorkplace)}จังหวัด{formData.province ? ` ${formData.province} ` : '..........................'}จัดระดับ ปกติ ระดับ {convertToThaiNumber(formData.hospitalLevel || '2.1')}
      </p>
      <p className="pl-6">
        ตั้งแต่วันที่{formData.startDate ? ` ${formatThaiDate(formData.startDate)} ` : '.....................................'}ถึงวันที่{advancedEndDate ? ` ${formatThaiDate(advancedEndDate)} ` : '..............................'}รวม {convertToThaiNumber(currentJobYears)} ปี {convertToThaiNumber(currentJobMonths)} เดือน {convertToThaiNumber(currentJobDays)} วัน
      </p>
    </Fragment>
  )
  itemIndex++

  // ช่องว่าง
  for (let i = filledCount; i < workHistorySlots; i++) {
    workItems.push(
      <Fragment key={`empty-${i}`}>
        <p>
          {convertToThaiNumber(itemIndex)}. ปฏิบัติงานที่โรงพยาบาล............................จังหวัด..........................จัดระดับ.....................ระดับ..................
        </p>
        <p className="pl-6">
          ตั้งแต่วันที่..................................... ถึงวันที่.............................. รวม..............ปี.........เดือน...........วัน
        </p>
      </Fragment>
    )
    itemIndex++
  }

  return (
    <div className="flex flex-col items-center print:block print:!m-0">
      <div
        className="mx-auto bg-white print:!w-full print:!min-h-0 print:!m-0 print:!p-[15mm]"
        style={{
          width: '210mm',
          minHeight: '297mm',
          padding: '20mm',
          fontFamily: '"TH SarabunPSK", "Sarabun", "Leelawadee UI", "Tahoma", "Times New Roman", serif',
          fontSize: '16pt',
          lineHeight: '1.1',
          color: '#111',
          boxSizing: 'border-box',
          pageBreakAfter: isLast ? 'auto' : 'always',
          breakAfter: isLast ? 'auto' : 'always',
        }}
      >
        {/* หัวเรื่อง */}
        <div className="text-center mb-3">
          <p style={{ fontSize: '18pt', marginBottom: 0, fontWeight: 'bold', fontFamily: '"TH SarabunPSK", "Sarabun", "Leelawadee UI", "Tahoma", "Times New Roman", serif' }}>
            ใบขอรับเงินค่าตอบแทนเบี้ยเลี้ยงเหมาจ่ายสำหรับเจ้าหน้าที่
          </p>
          <p style={{ fontSize: '18pt', marginTop: 0, fontWeight: 'bold', fontFamily: '"TH SarabunPSK", "Sarabun", "Leelawadee UI", "Tahoma", "Times New Roman", serif' }}>
            ที่ปฏิบัติงานในหน่วยบริการสังกัดกระทรวงสาธารณสุข
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-right">
            หน่วยบริการ{formData.unit ? ` ${formData.unit} ` : '........................................'}
          </p>
          <p className="text-right">
            ประจำเดือน {item.month} พ.ศ. {convertToThaiNumber(item.year)}
          </p>

          <div style={{ marginBottom: '8pt', whiteSpace: 'pre-line' }}>
            <span>
              ข้าพเจ้าชื่อ{formData.name ? ` ${formData.title}${formData.name} ` : '.............'}นามสกุล{formData.surname ? ` ${formData.surname} ` : '.............'}ตำแหน่ง{formData.position ? ` ${formData.position} ` : '.............'}
            </span>
            <br />
            <span>
              ปัจจุบันปฏิบัติงานที่{formData.currentWorkplace ? ` ${formData.currentWorkplace} ` : '.............'}จังหวัด{formData.province ? ` ${formData.province} ` : '.............'}ระดับ/กลุ่ม{formData.hospitalLevel ? ` ปกติ ${convertToThaiNumber(formData.hospitalLevel)} ` : '.............'}
            </span>
            <br />
            <span>
              ปฏิบัติงานในหน่วยบริการ {convertToThaiNumber(yearsWithOffset)} ปี {convertToThaiNumber(monthsWithOffset)} เดือน (นับถึงสิ้นเดือนที่เบิกจ่าย)
            </span>
            <br />
            <span>โดยมีรายละเอียดการปฏิบัติงาน ดังนี้ (เฉพาะสายแพทย์ตอบข้อ ๑ ด้วย)</span>
          </div>

          {/* ข้อ ๑ ฝึกเพิ่มพูนทักษะ */}
          {(() => {
            let durationText = `${trainingPracticeYearsDisplay} ปี ${trainingPracticeMonthsDisplay} เดือน`
            if ((trainingPracticeYearsDisplay === '..............' || trainingPracticeYearsDisplay === '๐') && trainingPracticeMonthsDisplay !== '..............' && trainingPracticeMonthsDisplay !== '๐') {
              durationText = `${trainingPracticeMonthsDisplay} เดือน`
            } else if (trainingPracticeYearsDisplay !== '..............' && trainingPracticeYearsDisplay !== '๐' && (trainingPracticeMonthsDisplay === '..............' || trainingPracticeMonthsDisplay === '๐')) {
              durationText = `${trainingPracticeYearsDisplay} ปี`
            }
            return (
              <p>
                ๑. ฝึกเพิ่มพูนทักษะ (ปีที่ ๑) รวมระยะเวลาการปฏิบัติงาน {durationText} ดังนี้
              </p>
            )
          })()}
          {(() => {
            const hasAnyTrainingData = formData.trainingRecords.length > 0

            return (
              <ul className="pl-8 space-y-1 list-none">
                {!hasAnyTrainingData && (
                  <>
                    <li className="leading-tight">
                      <span>• รพศ/รพท..................... จังหวัด....................</span>
                      <span className="block pl-6">ตั้งแต่.................................ถึง.....................................</span>
                    </li>
                    <li className="leading-tight">
                      <span>• รพช........................... จังหวัด....................</span>
                      <span className="block pl-6">ตั้งแต่..................................ถึง.....................................</span>
                    </li>
                  </>
                )}
                {formData.trainingRecords.map((record) => {
                  const recordLine = buildTrainingLine(
                    record.type,
                    { hospital: '.....................', province: '....................', start: '.................................', end: '.....................................' },
                    { hospital: record.hospital, province: record.province, start: record.startDate ? formatThaiDate(record.startDate) : '', end: record.endDate ? formatThaiDate(record.endDate) : '' },
                    { main: `• ${record.type}..................... จังหวัด....................`, period: 'ตั้งแต่.................................ถึง.....................................' }
                  )
                  return (
                    <li key={record.id} className="leading-tight">
                      <span>{recordLine.main}</span>
                      <span className="block pl-6">{recordLine.period}</span>
                    </li>
                  )
                })}
              </ul>
            )
          })()}

          {/* ข้อ ๒+ ประวัติการทำงาน */}
          {workItems}

          {/* รวมทั้งสิ้น */}
          <p>
            รวมทั้งสิ้น {convertToThaiNumber(yearsWithOffset)} ปี {convertToThaiNumber(monthsWithOffset)} เดือน {convertToThaiNumber(daysWithOffset)} วัน จำนวนที่ขอเบิก{pageAmountDisplay ? ` ${pageAmountDisplay} ` : '................'}บาท ({pageAmountText || '................................................'})
          </p>
          <p className="indent-10">
            ข้าพเจ้าขอรับรองข้อมูลดังกล่าวเป็นความจริงทุกประการ และหากมีการเรียกเงินคืน ข้าพเจ้าขอรับผิดชอบคืนเงินแต่เพียงผู้เดียว
          </p>

          {/* ลายเซ็น */}
          <div className={hasWrappedLine ? 'pt-16 print:pt-16' : 'pt-4 print:pt-4'}>
            <div className="flex justify-end mt-4">
              <div className="text-center" style={{ minWidth: '220px' }}>
                <p>({formData.title}{formData.name} {formData.surname})</p>
                <p>ตำแหน่ง {formData.position}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* เส้นแบ่งหน้า (เฉพาะ screen) */}
      {!isLast && (
        <div className="print:hidden w-full flex justify-center" style={{ pageBreakBefore: 'auto' }}>
          <div className="w-[210mm] border-t border-dashed border-emerald-300 my-8 opacity-70" />
        </div>
      )}
    </div>
  )
}

export default S11PrintPage
