// ─── Types สำหรับหน้า S11 ───────────────────────────────────

export type ThaiDateParts = {
  day: number
  monthIndex: number
  buddhistYear: number
}

export type TrainingDateField =
  | 'trainingRphStart'
  | 'trainingRphEnd'
  | 'trainingRhcStart'
  | 'trainingRhcEnd'

export type TrainingValues = {
  hospital?: string
  province?: string
  start?: string
  end?: string
}

export type TrainingLine = {
  main: string
  period: string
}

export type WorkHistoryEntry = {
  id: string
  hospital: string
  province: string
  classification?: string
  level: string
  startDate: string
  endDate: string
}

export type TrainingExtraEntry = {
  id: string
  type: 'รพศ/รพท' | 'รพช'
  hospital: string
  province: string
  startDate: string
  endDate: string
}

export type FormDataState = {
  title: string
  name: string
  surname: string
  position: string
  currentWorkplace: string
  province: string
  level: string
  trainingPracticeYears: number | ''
  trainingPracticeMonths: number | ''
  startDate: string
  endDate: string
  unit: string
  startMonth: string
  startYear: number | ''
  amount: number | ''
  trainingRphHospital: string
  trainingRphProvince: string
  trainingRphStart: string
  trainingRphEnd: string
  trainingRhcHospital: string
  trainingRhcProvince: string
  trainingRhcStart: string
  trainingRhcEnd: string
  extraTraining: TrainingExtraEntry[]
  workHistory: WorkHistoryEntry[]
}

export type PositionOption = {
  value: string
  label: string
}
