// ─── Types สำหรับหน้า S11 ───────────────────────────────────

export type ThaiDateParts = {
  day: number
  monthIndex: number
  buddhistYear: number
}


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
  entryType: 'work' | 'study'
  hospital: string
  province: string
  classification?: string
  level: string
  startDate: string
  endDate: string
}

export type TrainingEntry = {
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
  startDate: string
  endDate: string
  unit: string
  startMonth: string
  startYear: number | ''
  amount: number | ''
  trainingRecords: TrainingEntry[]
  workHistory: WorkHistoryEntry[]
}

export type PositionOption = {
  value: string
  label: string
}
