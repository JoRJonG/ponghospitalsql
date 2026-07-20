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
  amountDisplayText: string
  amountThaiText: string
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
  amountDisplayText,
  amountThaiText,
  onBack,
}: Props) => {
  return (
    <div className="bg-white min-h-screen p-0 print:p-0 print:min-h-0 print:bg-transparent">
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
            amountDisplayText={amountDisplayText}
            amountThaiText={amountThaiText}
          />
        )
      })}

      <style>
        {`
          @media print {
            @page {
              margin: 0;
              size: A4 portrait;
            }
            body {
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
