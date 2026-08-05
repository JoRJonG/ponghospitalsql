import { useState, useEffect } from 'react'
import S11PrintPage from './S11PrintPage'
import type { FormDataState } from './types'

type Props = {
  formData: FormDataState
  monthsData: { month: string; year: number }[]
  baseTotalMonths: number
  totalExperienceDuration: { years: number; months: number; days: number }
  currentWorkDuration: { years: number; months: number; days: number }
  trainingPracticeYearsDisplay: string
  trainingPracticeMonthsDisplay: string

  addedTrainingLines: number
  onBack: () => void
}

const S11PrintView = ({
  formData,
  monthsData,
  baseTotalMonths,
  totalExperienceDuration,
  currentWorkDuration,
  trainingPracticeYearsDisplay,
  trainingPracticeMonthsDisplay,

  addedTrainingLines,
  onBack,
}: Props) => {
  // ── Auto-zoom สำหรับหน้าจอเล็กที่แคบกว่า A4 (210mm ≈ 794px) ──
  const [screenZoom, setScreenZoom] = useState(1)

  useEffect(() => {
    const A4_WIDTH_PX = 794 // 210mm at 96dpi
    const updateZoom = () => {
      const available = window.innerWidth - 8
      setScreenZoom(
        available < A4_WIDTH_PX
          ? parseFloat((available / A4_WIDTH_PX).toFixed(4))
          : 1
      )
    }
    updateZoom()
    window.addEventListener('resize', updateZoom)
    return () => window.removeEventListener('resize', updateZoom)
  }, [])

  return (
    <div className="bg-white min-h-screen p-0 print:p-0 print:min-h-0 print:bg-transparent">
      {/* ปุ่มควบคุม — อยู่นอก zoom container เพื่อป้องกัน fixed layout เพี้ยน */}
      <div className="fixed top-4 right-4 flex gap-2 z-50 print:hidden">
        <button
          onClick={onBack}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm shadow transition"
        >
          ← แก้ไขข้อมูล
        </button>
        <button
          onClick={() => window.print()}
          className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm shadow transition"
        >
          พิมพ์เอกสาร
        </button>
      </div>

      {/* Pages container — zoom เฉพาะหน้า screen, print ใช้ zoom: 1 */}
      <div id="s11-pages-container" style={{ zoom: screenZoom }}>
        {monthsData.map((item, index) => {
          const isLast = index === monthsData.length - 1
          return (
            <S11PrintPage
              key={`${item.month}-${item.year}`}
              item={item}
              index={index}
              isLast={isLast}
              formData={formData}
              baseTotalMonths={baseTotalMonths}
              totalExperienceDuration={totalExperienceDuration}
              currentWorkDuration={currentWorkDuration}
              trainingPracticeYearsDisplay={trainingPracticeYearsDisplay}
              trainingPracticeMonthsDisplay={trainingPracticeMonthsDisplay}

              addedTrainingLines={addedTrainingLines}
            />
          )
        })}
      </div>

      <style>
        {`
          @media print {
            /* รีเซ็ต zoom กลับเป็น 1 ตอนพิมพ์ — A4 ยังคง 210mm เสมอ */
            #s11-pages-container {
              zoom: 1 !important;
            }
            @page {
              margin: 0;
              size: A4 portrait;
            }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              background-color: white;
            }
          }
        `}
      </style>
    </div>
  )
}

export default S11PrintView
