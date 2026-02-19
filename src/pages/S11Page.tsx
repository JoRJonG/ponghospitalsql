import { useState, useEffect, Fragment, useMemo, useRef } from 'react'
import Select, { type StylesConfig, type CSSObjectWithLabel, type ControlProps, type OptionProps } from 'react-select'
import DOMPurify from 'dompurify'
import Swal from 'sweetalert2'

const MAX_WORK_HISTORY_ITEMS = 6
const MAX_INPUT_LENGTH = 100
const VALID_NAME_REGEX = /^[ก-๙a-zA-Z\s.-]*$/

const sanitizeInput = (input: string): string => {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [], // No HTML allowed
    ALLOWED_ATTR: [],
  })
}

const newCategory = 'สหสาขาวิชาชีพ'

const months = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
]

const convertToThaiNumber = (value: number | string): string => {
  const thaiDigits = ['๐', '๑', '๒', '๓', '๔', '๕', '๖', '๗', '๘', '๙']
  return String(value)
    .split('')
    .map((char) => {
      const parsed = Number(char)
      return Number.isNaN(parsed) ? char : thaiDigits[parsed]
    })
    .join('')
}

type ThaiDateParts = {
  day: number
  monthIndex: number
  buddhistYear: number
}

type TrainingDateField =
  | 'trainingRphStart'
  | 'trainingRphEnd'
  | 'trainingRhcStart'
  | 'trainingRhcEnd'

type TrainingDatePart = 'day' | 'monthIndex' | 'buddhistYear'

type TrainingValues = {
  hospital?: string
  province?: string
  start?: string
  end?: string
}

type TrainingLine = {
  main: string
  period: string
}

type WorkHistoryEntry = {
  id: string
  hospital: string
  province: string
  level: string
  startDate: string
  endDate: string
}

type FormDataState = {
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
  workHistory: WorkHistoryEntry[]
}

const positions = [
  // แพทย์และทันตแพทย์
  { name: 'ทันตแพทย์', category: 'แพทย์และทันตแพทย์' },
  { name: 'นายแพทย์', category: 'แพทย์และทันตแพทย์' },

  // เภสัชกร
  { name: 'เภสัชกร', category: 'เภสัชกร' },

  // พยาบาลวิชาชีพ
  { name: 'พยาบาลวิชาชีพ', category: newCategory },

  // สายงานระดับปริญญาตรีขึ้นไป (วิชาชีพเฉพาะ ก)
  { name: 'นักกายภาพบำบัด', category: newCategory },
  { name: 'นักกิจกรรมบำบัด', category: newCategory },
  { name: 'นักจิตวิทยาคลินิก', category: newCategory },
  { name: 'นักเทคนิคการแพทย์', category: newCategory },
  { name: 'นายสัตวแพทย์', category: 'สายงานระดับปริญญาตรีขึ้นไป' },
  { name: 'แพทย์แผนไทย', category: newCategory },
  { name: 'นักรังสีการแพทย์', category: newCategory },
  { name: 'นักเวชศาสตร์สื่อความหมาย', category: newCategory },
  { name: 'นักเทคโนโลยีหัวใจและทรวงอก', category: newCategory },
  { name: 'นักฟิสิกส์การแพทย์', category: 'สายงานระดับปริญญาตรีขึ้นไป' },
  { name: 'นักทัศนมาตร', category: 'สายงานระดับปริญญาตรีขึ้นไป' },
  { name: 'นักสาธารณสุข', category: 'สายงานระดับปริญญาตรีขึ้นไป' },
  { name: 'นักกายอุปกรณ์', category: newCategory },
  { name: 'วิศวกรไฟฟ้า', category: 'สายงานระดับปริญญาตรีขึ้นไป' },

  // สายงานระดับปริญญาตรีขึ้นไป (วิชาชีพเฉพาะ ข)
  { name: 'นักนิติวิทยาศาสตร์', category: 'สายงานระดับปริญญาตรีขึ้นไป' },
  { name: 'นักฟิสิกส์รังสี', category: 'สายงานระดับปริญญาตรีขึ้นไป' },
  { name: 'นักวิทยาศาสตร์', category: 'สายงานระดับปริญญาตรีขึ้นไป' },
  { name: 'นักจิตวิทยา', category: newCategory },
  { name: 'นักโภชนาการ', category: 'สายงานระดับปริญญาตรีขึ้นไป' },
  { name: 'นักวิชาการสาธารณสุข', category: newCategory },
  { name: 'นักอาชีวบำบัด', category: 'สายงานระดับปริญญาตรีขึ้นไป' },
  { name: 'นักวิชาการอาหารและยา', category: 'สายงานระดับปริญญาตรีขึ้นไป' },
  { name: 'นักวิทยาศาสตร์การแพทย์', category: 'สายงานระดับปริญญาตรีขึ้นไป' },
  { name: 'นักปฏิบัติการฉุกเฉินการแพทย์', category: 'สายงานระดับปริญญาตรีขึ้นไป' },
  { name: 'นักกำหนดอาหาร', category: 'สายงานระดับปริญญาตรีขึ้นไป' },
  { name: 'ช่างภาพการแพทย์', category: 'สายงานระดับปริญญาตรีขึ้นไป' },
  { name: 'นักวิชาการศึกษาพิเศษ', category: 'สายงานระดับปริญญาตรีขึ้นไป' },
  { name: 'นักสังคมสงเคราะห์', category: newCategory },

  // สายงานระดับปริญญาตรีขึ้นไป (บริหารทั่วไป)
  { name: 'นักวิชาการคอมพิวเตอร์', category: 'สายงานระดับปริญญาตรีขึ้นไป' },
  { name: 'นักจัดการงานทั่วไป', category: 'สายงานระดับปริญญาตรีขึ้นไป' },
  { name: 'นักทรัพยากรบุคคล', category: newCategory },
  { name: 'นิติกร', category: 'สายงานระดับปริญญาตรีขึ้นไป' },
  { name: 'นักวิเคราะห์นโยบายและแผน', category: newCategory },
  { name: 'นักเทคโนโลยีสารสนเทศ', category: 'สายงานระดับปริญญาตรีขึ้นไป' },
  { name: 'นักวิชาการพัสดุ', category: 'สายงานระดับปริญญาตรีขึ้นไป' },
  { name: 'นักวิชาการสถิติ', category: 'สายงานระดับปริญญาตรีขึ้นไป' },
  { name: 'นักวิเทศสัมพันธ์', category: 'สายงานระดับปริญญาตรีขึ้นไป' },
  { name: 'นักวิชาการเงินและบัญชี', category: 'สายงานระดับปริญญาตรีขึ้นไป' },
  { name: 'นักวิชาการตรวจสอบภายใน', category: 'สายงานระดับปริญญาตรีขึ้นไป' },
  { name: 'นักประชาสัมพันธ์', category: 'สายงานระดับปริญญาตรีขึ้นไป' },
  { name: 'นักวิชาการเผยแพร่', category: 'สายงานระดับปริญญาตรีขึ้นไป' },
  { name: 'นักวิชาการโสตทัศนศึกษา', category: 'สายงานระดับปริญญาตรีขึ้นไป' },
  { name: 'นักวิชาการเกษตร', category: 'สายงานระดับปริญญาตรีขึ้นไป' },
  { name: 'วิศวกร', category: 'สายงานระดับปริญญาตรีขึ้นไป' },
  { name: 'บรรณารักษ์', category: 'สายงานระดับปริญญาตรีขึ้นไป' },
  { name: 'นักวิชาการศึกษา', category: newCategory },
  { name: 'วิทยาจารย์', category: 'สายงานระดับปริญญาตรีขึ้นไป' },

  // สายงานระดับต่ำกว่าปริญญาตรี (เทคนิค)
  { name: 'เจ้าพนักงานธุรการ', category: 'สายงานระดับต่ำกว่าปริญญาตรี' },
  { name: 'เจ้าพนักงานพัสดุ', category: 'สายงานระดับต่ำกว่าปริญญาตรี' },
  { name: 'เจ้าพนักงานเวชสถิติ', category: 'สายงานระดับต่ำกว่าปริญญาตรี' },
  { name: 'เจ้าพนักงานสถิติ', category: 'สายงานระดับต่ำกว่าปริญญาตรี' },
  { name: 'เจ้าพนักงานการเงินและบัญชี', category: 'สายงานระดับต่ำกว่าปริญญาตรี' },
  { name: 'เจ้าพนักงานเผยแพร่ประชาสัมพันธ์', category: 'สายงานระดับต่ำกว่าปริญญาตรี' },
  { name: 'เจ้าพนักงานโสตทัศนศึกษา', category: 'สายงานระดับต่ำกว่าปริญญาตรี' },
  { name: 'เจ้าพนักงานการเกษตร', category: 'สายงานระดับต่ำกว่าปริญญาตรี' },
  { name: 'เจ้าพนักงานทันตสาธารณสุข', category: 'สายงานระดับต่ำกว่าปริญญาตรี' },
  { name: 'เจ้าพนักงานเภสัชกรรม', category: 'สายงานระดับต่ำกว่าปริญญาตรี' },
  { name: 'โภชนากร', category: 'สายงานระดับต่ำกว่าปริญญาตรี' },
  { name: 'เจ้าพนักงานรังสีการแพทย์', category: 'สายงานระดับต่ำกว่าปริญญาตรี' },
  { name: 'เจ้าพนักงานวิทยาศาสตร์การแพทย์', category: 'สายงานระดับต่ำกว่าปริญญาตรี' },
  { name: 'เจ้าพนักงานสาธารณสุข', category: 'สายงานระดับต่ำกว่าปริญญาตรี' },
  { name: 'เจ้าพนักงานอาชีวบำบัด', category: 'สายงานระดับต่ำกว่าปริญญาตรี' },
  { name: 'เจ้าพนักงานเวชกิจฉุกเฉิน', category: 'สายงานระดับต่ำกว่าปริญญาตรี' },
  { name: 'เจ้าพนักงานการแพทย์แผนไทย', category: 'สายงานระดับต่ำกว่าปริญญาตรี' },
  { name: 'นายช่างศิลป์', category: 'สายงานระดับต่ำกว่าปริญญาตรี' },
  { name: 'ช่างกายอุปกรณ์', category: 'สายงานระดับต่ำกว่าปริญญาตรี' },
  { name: 'เจ้าพนักงานเครื่องคอมพิวเตอร์', category: 'สายงานระดับต่ำกว่าปริญญาตรี' },
  { name: 'ช่างทันตกรรม', category: 'สายงานระดับต่ำกว่าปริญญาตรี' },
  { name: 'นายช่างเทคนิค', category: 'สายงานระดับต่ำกว่าปริญญาตรี' },
  { name: 'นายช่างไฟฟ้า', category: 'สายงานระดับต่ำกว่าปริญญาตรี' },
  { name: 'นายช่างโยธา', category: 'สายงานระดับต่ำกว่าปริญญาตรี' },
  { name: 'ครูการศึกษาพิเศษ', category: 'สายงานระดับต่ำกว่าปริญญาตรี' },
  { name: 'เจ้าพนักงานห้องสมุด', category: 'สายงานระดับต่ำกว่าปริญญาตรี' },

  // สายงานระดับต่ำกว่าปริญญาตรี (บริการ)
  { name: 'พนักงานประจำตึก', category: 'สายงานระดับต่ำกว่าปริญญาตรี' },
  { name: 'พนักงานเปล', category: 'สายงานระดับต่ำกว่าปริญญาตรี' },
  { name: 'พนักงานซักฟอก', category: 'สายงานระดับต่ำกว่าปริญญาตรี' },
  { name: 'พนักงานบริการ', category: 'สายงานระดับต่ำกว่าปริญญาตรี' },
  { name: 'พนักงานรับโทรศัพท์', category: 'สายงานระดับต่ำกว่าปริญญาตรี' },
  { name: 'พนักงานเกษตรพื้นฐาน', category: 'สายงานระดับต่ำกว่าปริญญาตรี' },
  { name: 'พนักงานเรือยนต์', category: 'สายงานระดับต่ำกว่าปริญญาตรี' },
  { name: 'พนักงานบริการเอกสารทั่วไป', category: 'สายงานระดับต่ำกว่าปริญญาตรี' },
  { name: 'พนักงานเก็บเอกสาร', category: 'สายงานระดับต่ำกว่าปริญญาตรี' },
  { name: 'พนักงานบริการสื่ออุปกรณ์การสอน', category: 'สายงานระดับต่ำกว่าปริญญาตรี' },
  { name: 'พนักงานเก็บเงิน', category: 'สายงานระดับต่ำกว่าปริญญาตรี' },
  { name: 'พนักงานโสตทัศนศึกษา', category: 'สายงานระดับต่ำกว่าปริญญาตรี' },
  { name: 'พนักงานผลิตน้ำประปา', category: 'สายงานระดับต่ำกว่าปริญญาตรี' },
  { name: 'พนักงานการเงินและบัญชี', category: 'สายงานระดับต่ำกว่าปริญญาตรี' },
  { name: 'พนักงานพัสดุ', category: 'สายงานระดับต่ำกว่าปริญญาตรี' },
  { name: 'พนักงานธุรการ', category: 'สายงานระดับต่ำกว่าปริญญาตรี' },
  { name: 'พนักงานพิมพ์', category: 'สายงานระดับต่ำกว่าปริญญาตรี' },
  { name: 'พนักงานประเมินผล', category: 'สายงานระดับต่ำกว่าปริญญาตรี' },
  { name: 'พนักงานการศึกษา', category: 'สายงานระดับต่ำกว่าปริญญาตรี' },
  { name: 'พนักงานห้องสมุด', category: 'สายงานระดับต่ำกว่าปริญญาตรี' },
  { name: 'พนักงานสื่อสาร', category: 'สายงานระดับต่ำกว่าปริญญาตรี' },
  { name: 'ล่ามภาษาต่างประเทศ', category: 'สายงานระดับต่ำกว่าปริญญาตรี' },
  { name: 'ครูพี่เลี้ยง', category: 'สายงานระดับต่ำกว่าปริญญาตรี' },
  { name: 'พี่เลี้ยง', category: 'สายงานระดับต่ำกว่าปริญญาตรี' },
  { name: 'พนักงานช่วยการพยาบาล', category: 'สายงานระดับต่ำกว่าปริญญาตรี' },
  { name: 'พนักงานช่วยเหลือคนไข้', category: 'สายงานระดับต่ำกว่าปริญญาตรี' },
  { name: 'ผู้ช่วยพยาบาล', category: 'สายงานระดับต่ำกว่าปริญญาตรี' },
  { name: 'ผู้ช่วยทันตแพทย์', category: 'สายงานระดับต่ำกว่าปริญญาตรี' },
  { name: 'พนักงานเภสัชกรรม', category: 'สายงานระดับต่ำกว่าปริญญาตรี' },
  { name: 'พนักงานประจำห้องยา', category: 'สายงานระดับต่ำกว่าปริญญาตรี' },
  { name: 'ผู้ช่วยพนักงานสุขศึกษา', category: 'สายงานระดับต่ำกว่าปริญญาตรี' },
  { name: 'ผู้ช่วยเจ้าหน้าที่อนามัย', category: 'สายงานระดับต่ำกว่าปริญญาตรี' },
  { name: 'ผู้ช่วยเจ้าหน้าที่สาธารณสุข', category: 'สายงานระดับต่ำกว่าปริญญาตรี' },
  { name: 'พนักงานการแพทย์และรังสีเทคนิค', category: 'สายงานระดับต่ำกว่าปริญญาตรี' },
  { name: 'พนักงานจุลทัศนกร', category: 'สายงานระดับต่ำกว่าปริญญาตรี' },
  { name: 'พนักงานห้องผ่าตัด', category: 'สายงานระดับต่ำกว่าปริญญาตรี' },
  { name: 'พนักงานผ่าและรักษาศพ', category: 'สายงานระดับต่ำกว่าปริญญาตรี' },
  { name: 'พนักงานขับรถยนต์', category: 'สายงานระดับต่ำกว่าปริญญาตรี' },
  { name: 'พนักงานประกอบอาหาร', category: 'สายงานระดับต่ำกว่าปริญญาตรี' },
  { name: 'พนักงานพิธีสงฆ์', category: 'สายงานระดับต่ำกว่าปริญญาตรี' },
  { name: 'พนักงานบัตรรายงานโรค', category: 'สายงานระดับต่ำกว่าปริญญาตรี' },
  { name: 'พนักงานปฏิบัติการทดลองพาหะนำโรค', category: 'สายงานระดับต่ำกว่าปริญญาตรี' },
  { name: 'ผู้ช่วยนักกายภาพบำบัด', category: 'สายงานระดับต่ำกว่าปริญญาตรี' },
  { name: 'พนักงานกู้ชีพ', category: 'สายงานระดับต่ำกว่าปริญญาตรี' },
  { name: 'พนักงานประจำห้องทดลอง', category: 'สายงานระดับต่ำกว่าปริญญาตรี' },
  { name: 'พนักงานวิทยาศาสตร์', category: 'สายงานระดับต่ำกว่าปริญญาตรี' },
  { name: 'ช่างไฟฟ้าและอิเล็กทรอนิกส์', category: 'สายงานระดับต่ำกว่าปริญญาตรี' },
  { name: 'ช่างเหล็ก', category: 'สายงานระดับต่ำกว่าปริญญาตรี' },
  { name: 'ช่างฝีมือทั่วไป', category: 'สายงานระดับต่ำกว่าปริญญาตรี' },
  { name: 'ช่างต่อท่อ', category: 'สายงานระดับต่ำกว่าปริญญาตรี' },
  { name: 'ช่างศิลป์', category: 'สายงานระดับต่ำกว่าปริญญาตรี' },
  { name: 'ช่างตัดเย็บผ้า', category: 'สายงานระดับต่ำกว่าปริญญาตรี' },
  { name: 'ช่างตัดผม', category: 'สายงานระดับต่ำกว่าปริญญาตรี' },
  { name: 'ช่างซ่อมเครื่องทำความเย็น', category: 'สายงานระดับต่ำกว่าปริญญาตรี' },
  { name: 'ช่างเครื่องช่วยคนพิการ', category: 'สายงานระดับต่ำกว่าปริญญาตรี' },
  { name: 'ผู้ช่วยช่างทั่วไป', category: 'สายงานระดับต่ำกว่าปริญญาตรี' },
]

const amountRates = {
  'แพทย์และทันตแพทย์': {
    '1-3': 10000,
    '4-10': 20000,
    '10+': 25000,
  },
  'เภสัชกร': {
    '1-3': 5500,
    '4-10': 5500,
    '10+': 6500,
  },
  'พยาบาลวิชาชีพ': {
    '1-3': 5500,
    '4-10': 5500,
    '10+': 6500,
  },
  'สหสาขาวิชาชีพ': {
    '1-3': 2200,
    '4-10': 2800,
    '10+': 3000,
  },
  'สายงานระดับปริญญาตรีขึ้นไป': {
    '1-3': 1700,
    '4-10': 2300,
    '10+': 2500,
  },
  'สายงานระดับต่ำกว่าปริญญาตรี': {
    '1-3': 1000,
    '4-10': 1200,
    '10+': 1500,
  },
}

const getAmountForProfession = (profession: string, years: number): number | '' => {
  const rates = amountRates[profession as keyof typeof amountRates]
  if (!rates) {
    return ''
  }
  if (years >= 10) {
    return rates['10+']
  }
  if (years >= 4) {
    return rates['4-10']
  }
  // Years 0-3
  if (years >= 0) {
    return rates['1-3']
  }
  return ''
}


type PositionOption = {
  value: string
  label: string
}

const numericFieldNames = new Set<keyof FormDataState>([
  'startYear',
  'trainingPracticeYears',
  'trainingPracticeMonths',
])

const formatThaiDate = (isoDate: string): string => {
  if (!isoDate) return ''
  const date = new Date(isoDate)
  if (Number.isNaN(date.getTime())) return convertToThaiNumber(isoDate)
  const day = convertToThaiNumber(date.getDate())
  const monthName = months[date.getMonth()] ?? ''
  const buddhistYear = date.getFullYear() + 543
  const yearText = convertToThaiNumber(buddhistYear)
  return `${day} ${monthName} ..${yearText}..`.trim()
}

const parseThaiDateParts = (isoDate: string): ThaiDateParts => {
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

const buildIsoDate = ({
  day,
  monthIndex,
  buddhistYear,
}: ThaiDateParts): string => {
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

const getLastDayOfThaiMonth = (
  buddhistYear: number,
  monthIndex: number,
): number => {
  const gregorianYear = buddhistYear - 543
  return new Date(gregorianYear, monthIndex + 1, 0).getDate()
}

const buildTrainingLine = (
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

  if (!hasData) {
    return fallback
  }

  const hospitalText = hospital ? ` ${hospital}` : placeholders.hospital ?? ''
  const provinceText = province ? ` ${province}` : placeholders.province ?? ''
  const startText = start ? ` ${start}` : placeholders.start ?? ''
  const endText = end ? ` ${end}` : placeholders.end ?? ''

  return {
    main: `• ${label}${hospitalText} จังหวัด${provinceText}`,
    period: `ตั้งแต่${startText}ถึง${endText}`,
  }
}

const numberToThaiText = (num: number): string => {
  const thaiDigits = [
    'ศูนย์',
    'หนึ่ง',
    'สอง',
    'สาม',
    'สี่',
    'ห้า',
    'หก',
    'เจ็ด',
    'แปด',
    'เก้า',
  ]
  const thaiPositions = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน']

  if (!Number.isFinite(num) || num < 0) {
    return ''
  }

  const integer = Math.floor(num)

  if (integer === 0) {
    return 'ศูนย์บาทถ้วน'
  }

  const convertSegment = (segment: string): string => {
    const digits = segment.split('')
    const len = digits.length
    let text = ''

    digits.forEach((digitChar, index) => {
      const digit = Number(digitChar)
      if (Number.isNaN(digit) || digit === 0) return

      const position = len - index - 1

      if (position === 0) {
        if (digit === 1 && len > 1) {
          text += 'เอ็ด'
        } else {
          text += thaiDigits[digit]
        }
        return
      }

      if (position === 1) {
        if (digit === 1) {
          text += 'สิบ'
        } else if (digit === 2) {
          text += 'ยี่สิบ'
        } else {
          text += thaiDigits[digit] + thaiPositions[position]
        }
        return
      }

      if (digit === 1) {
        text += 'หนึ่ง' + thaiPositions[position]
      } else {
        text += thaiDigits[digit] + thaiPositions[position]
      }
    })
    return text
  }

  const segments: string[] = []
  let remaining = integer.toString()
  while (remaining.length > 0) {
    const segment = remaining.slice(-6)
    segments.unshift(segment)
    remaining = remaining.slice(0, -6)
  }

  let result = ''
  segments.forEach((segment, index) => {
    const segmentText = convertSegment(segment)
    if (segmentText) {
      result += segmentText
    }
    if (index < segments.length - 1 && (segmentText || result)) {
      result += 'ล้าน'
    }
  })

  return `${result}บาทถ้วน`
}

const getNext12MonthsWithYear = (startMonth: string, startYear: number) => {
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

const calculateDateDifference = (
  startDate: string,
  endDate: string,
): { years: number; months: number } => {
  if (!startDate || !endDate) return { years: 0, months: 0 }
  const start = new Date(startDate)
  const end = new Date(endDate)

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { years: 0, months: 0 }
  }

  let years = end.getFullYear() - start.getFullYear()
  let monthsDiff = end.getMonth() - start.getMonth()

  if (end.getDate() < start.getDate()) {
    monthsDiff--
  }

  if (monthsDiff < 0) {
    years--
    monthsDiff += 12
  }

  return { years: Math.max(0, years), months: Math.max(0, monthsDiff) }
}

const S11Page = () => {
  const [formData, setFormData] = useState<FormDataState>({
    name: '',
    surname: '',
    position: '',
    currentWorkplace: 'โรงพยาบาลปง',
    province: 'พะเยา',
    level: '',
    trainingPracticeYears: '',
    trainingPracticeMonths: '',
    startDate: '',
    endDate: '',
    unit: 'โรงพยาบาลปง',
    startMonth: '',
    startYear: '',
    amount: '',
    trainingRphHospital: '',
    trainingRphProvince: '',
    trainingRphStart: '',
    trainingRphEnd: '',
    trainingRhcHospital: '',
    trainingRhcProvince: '',
    trainingRhcStart: '',
    trainingRhcEnd: '',
    workHistory: [],
  })

  const [generated, setGenerated] = useState(false)

  // Ref for Position Select
  const positionSelectRef = useRef<any>(null)

  const totalMonthsOfExperience = useMemo(() => {
    const { years: currentYears, months: currentMonths } =
      calculateDateDifference(formData.startDate, formData.endDate)
    let totalMonths = currentYears * 12 + currentMonths

    formData.workHistory.forEach((job) => {
      const { years, months } = calculateDateDifference(
        job.startDate,
        job.endDate,
      )
      totalMonths += years * 12 + months
    })

    const trainingYears = Number(formData.trainingPracticeYears) || 0
    const trainingMonths = Number(formData.trainingPracticeMonths) || 0
    totalMonths += trainingYears * 12 + trainingMonths

    return totalMonths
  }, [
    formData.startDate,
    formData.endDate,
    formData.workHistory,
    formData.trainingPracticeYears,
    formData.trainingPracticeMonths,
  ])

  const totalYearsOfExperience = useMemo(
    () => Math.floor(totalMonthsOfExperience / 12),
    [totalMonthsOfExperience],
  )

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
        {
          id: Date.now().toString(),
          hospital: '',
          province: '',
          level: '',
          startDate: '',
          endDate: '',
        },
      ],
    }))
  }

  const removeWorkHistory = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      workHistory: prev.workHistory.filter((entry) => entry.id !== id),
    }))
  }

  const handleWorkHistoryChange = (
    id: string,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const { name, value } = e.target

    // Sanitize input
    let sanitizedValue = sanitizeInput(value)

    // Length check
    if (sanitizedValue.length > MAX_INPUT_LENGTH) {
      return
    }

    setFormData((prev) => ({
      ...prev,
      workHistory: prev.workHistory.map((entry) =>
        entry.id === id ? { ...entry, [name]: sanitizedValue } : entry,
      ),
    }))
  }

  const handleWorkHistoryDateChange = (
    id: string,
    field: 'startDate' | 'endDate',
    part: keyof ThaiDateParts,
    rawValue: string,
  ) => {
    if (rawValue === '') {
      setFormData((prev) => ({
        ...prev,
        workHistory: prev.workHistory.map((entry) =>
          entry.id === id ? { ...entry, [field]: '' } : entry,
        ),
      }))
      return
    }

    const numericValue = Number(rawValue)
    if (Number.isNaN(numericValue)) return

    setFormData((prev) => ({
      ...prev,
      workHistory: prev.workHistory.map((entry) => {
        if (entry.id !== id) return entry
        const currentValue = entry[field] ?? ''
        const baseParts: ThaiDateParts = currentValue
          ? parseThaiDateParts(String(currentValue))
          : {
            day: 1,
            monthIndex: 0,
            buddhistYear: new Date().getFullYear() + 543,
          }
        const updatedParts: ThaiDateParts = {
          ...baseParts,
          [part]: numericValue,
        }
        const lastDay = getLastDayOfThaiMonth(
          updatedParts.buddhistYear,
          updatedParts.monthIndex,
        )
        const safeParts: ThaiDateParts = {
          ...updatedParts,
          day: Math.min(updatedParts.day, lastDay),
        }
        const isoDate = buildIsoDate(safeParts)
        if (!isoDate) return entry
        return { ...entry, [field]: isoDate }
      }),
    }))
  }

  const updateThaiDateField = (
    field: 'startDate' | 'endDate',
    updates: Partial<ThaiDateParts>,
  ) => {
    setFormData((prev) => {
      const currentParts = parseThaiDateParts(prev[field])
      const merged: ThaiDateParts = { ...currentParts, ...updates }
      const lastDay = getLastDayOfThaiMonth(
        merged.buddhistYear,
        merged.monthIndex,
      )
      const safeParts: ThaiDateParts = {
        ...merged,
        day: Math.min(merged.day, lastDay),
      }
      const isoDate = buildIsoDate(safeParts)
      if (!isoDate) return prev
      return { ...prev, [field]: isoDate }
    })
  }

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target
    const fieldName = name as keyof FormDataState

    // Specialized validation for Name and Surname
    if (fieldName === 'name' || fieldName === 'surname') {
      if (!VALID_NAME_REGEX.test(value)) {
        return // Ignore invalid characters
      }
    }

    // Sanitize input
    let sanitizedValue = sanitizeInput(value)

    // Length Validation
    if (sanitizedValue.length > MAX_INPUT_LENGTH && !numericFieldNames.has(fieldName)) { // Allow numeric fields to handle their own parsing, but text fields abide by max length
      return
    }

    setFormData((prev) => {
      const newFormData = {
        ...prev,
        [fieldName]: numericFieldNames.has(fieldName)
          ? value === ''
            ? ''
            : Number(value)
          : sanitizedValue,
      }

      // Auto-calculate amount when position or trainingPracticeYears changes
      if (fieldName === 'position' || fieldName === 'trainingPracticeYears') {
        const position = fieldName === 'position' ? value : newFormData.position
        const years =
          fieldName === 'trainingPracticeYears'
            ? value === ''
              ? 0
              : Number(value)
            : Number(newFormData.trainingPracticeYears) || 0

        const category = positions.find((p) => p.name === position)?.category
        if (category) {
          const calculatedAmount = getAmountForProfession(category, years)
          newFormData.amount =
            calculatedAmount === '' ? '' : calculatedAmount
        }
      }

      return newFormData
    })
  }

  const handlePrimaryDateSelectChange = (
    field: 'startDate' | 'endDate',
    part: keyof ThaiDateParts,
    rawValue: string,
  ) => {
    if (rawValue === '') {
      setFormData((prev) => ({ ...prev, [field]: '' }))
      return
    }
    updateThaiDateField(field, { [part]: Number(rawValue) })
  }

  const currentBuddhistYear = new Date().getFullYear() + 543

  const handleTrainingDateChange = (
    field: TrainingDateField,
    part: TrainingDatePart,
    rawValue: string,
  ) => {
    if (rawValue === '') {
      setFormData((prev) => ({ ...prev, [field]: '' }))
      return
    }

    const numericValue = Number(rawValue)
    if (Number.isNaN(numericValue)) return

    setFormData((prev) => {
      const currentValue = prev[field] ?? ''
      const baseParts: ThaiDateParts = currentValue
        ? parseThaiDateParts(String(currentValue))
        : { day: 1, monthIndex: 0, buddhistYear: currentBuddhistYear }

      const updatedParts: ThaiDateParts = { ...baseParts, [part]: numericValue }
      const lastDay = getLastDayOfThaiMonth(
        updatedParts.buddhistYear,
        updatedParts.monthIndex,
      )
      const safeParts: ThaiDateParts = {
        ...updatedParts,
        day: Math.min(updatedParts.day, lastDay),
      }

      const isoDate = buildIsoDate(safeParts)
      if (!isoDate) return prev
      return { ...prev, [field]: isoDate }
    })
  }

  useEffect(() => {
    if (formData.position) {
      const selectedPosition = positions.find(
        (p) => p.name === formData.position,
      )
      if (selectedPosition) {
        const newAmount = getAmountForProfession(
          selectedPosition.category,
          totalYearsOfExperience,
        )
        setFormData((prev) => ({ ...prev, amount: newAmount }))
      }
    } else {
      setFormData((prev) => ({ ...prev, amount: '' }))
    }
  }, [formData.position, totalYearsOfExperience])

  const positionOptions: PositionOption[] = positions.map((p) => ({
    value: p.name,
    label: p.name,
  }))

  const selectedPositionOption =
    positionOptions.find((opt) => opt.value === formData.position) ?? null

  const handlePositionChange = (option: PositionOption | null) => {
    setFormData((prev) => ({ ...prev, position: option ? option.value : '' }))
  }

  const resolvedStartYear =
    typeof formData.startYear === 'number' && Number.isFinite(formData.startYear)
      ? formData.startYear
      : currentBuddhistYear
  const resolvedStartMonth = months.includes(formData.startMonth)
    ? formData.startMonth
    : months[0]

  const monthsData = getNext12MonthsWithYear(
    resolvedStartMonth,
    resolvedStartYear,
  )

  const trainingPracticeYearsValue =
    typeof formData.trainingPracticeYears === 'number' &&
      Number.isFinite(formData.trainingPracticeYears)
      ? formData.trainingPracticeYears
      : null
  const trainingPracticeMonthsValue =
    typeof formData.trainingPracticeMonths === 'number' &&
      Number.isFinite(formData.trainingPracticeMonths)
      ? formData.trainingPracticeMonths
      : null

  const trainingPracticeYearsDisplay =
    trainingPracticeYearsValue !== null
      ? convertToThaiNumber(trainingPracticeYearsValue)
      : '..............'
  const trainingPracticeMonthsDisplay =
    trainingPracticeMonthsValue !== null
      ? convertToThaiNumber(trainingPracticeMonthsValue)
      : '..............'

  const baseTotalMonths = totalMonthsOfExperience

  const startDateParts = parseThaiDateParts(formData.startDate)
  const endDateParts = parseThaiDateParts(formData.endDate)

  const yearOptions = Array.from(
    { length: currentBuddhistYear - 2500 + 1 },
    (_, index) => 2500 + index,
  )
  const dayOptions = Array.from({ length: 31 }, (_, index) => index + 1)

  const amountValue =
    typeof formData.amount === 'number' && Number.isFinite(formData.amount)
      ? formData.amount
      : NaN
  const amountDisplayText = Number.isFinite(amountValue)
    ? convertToThaiNumber(amountValue)
    : ''
  const amountThaiText = Number.isFinite(amountValue)
    ? numberToThaiText(amountValue)
    : ''

  const trainingRphStartParts = parseThaiDateParts(formData.trainingRphStart)
  const trainingRphEndParts = parseThaiDateParts(formData.trainingRphEnd)
  const trainingRhcStartParts = parseThaiDateParts(formData.trainingRhcStart)
  const trainingRhcEndParts = parseThaiDateParts(formData.trainingRhcEnd)

  const trainingRphLine = buildTrainingLine(
    'รพศ/รพท',
    {
      hospital: '.....................',
      province: '....................',
      start: '.................................',
      end: '.....................................',
    },
    {
      hospital: formData.trainingRphHospital,
      province: formData.trainingRphProvince,
      start: formData.trainingRphStart
        ? formatThaiDate(formData.trainingRphStart)
        : '',
      end: formData.trainingRphEnd
        ? formatThaiDate(formData.trainingRphEnd)
        : '',
    },
    {
      main: '• รพศ/รพท..................... จังหวัด....................',
      period:
        'ตั้งแต่.................................ถึง.....................................',
    },
  )

  const trainingRhcLine = buildTrainingLine(
    'รพช',
    {
      hospital: '...........................',
      province: '....................',
      start: '..................................',
      end: '.....................................',
    },
    {
      hospital: formData.trainingRhcHospital,
      province: formData.trainingRhcProvince,
      start: formData.trainingRhcStart
        ? formatThaiDate(formData.trainingRhcStart)
        : '',
      end: formData.trainingRhcEnd
        ? formatThaiDate(formData.trainingRhcEnd)
        : '',
    },
    {
      main: '• รพช........................... จังหวัด....................',
      period:
        'ตั้งแต่..................................ถึง.....................................',
    },
  )


  const customSelectStyles: StylesConfig<PositionOption, false> = {
    control: (base: CSSObjectWithLabel, state: ControlProps<PositionOption, false>) => ({
      ...base,
      borderColor: state.isFocused ? '#10b981' : '#d1d5db', // emerald-500 : gray-300
      boxShadow: state.isFocused ? '0 0 0 1px #10b981' : 'none',
      '&:hover': {
        borderColor: '#10b981',
      },
      borderRadius: '0.5rem',
      paddingTop: '0.1rem',
      paddingBottom: '0.1rem',
    }),
    option: (
      base: CSSObjectWithLabel,
      state: OptionProps<PositionOption, false>,
    ) => ({
      ...base,
      backgroundColor: state.isSelected
        ? '#10b981' // emerald-500
        : state.isFocused
          ? '#d1fae5' // emerald-100
          : undefined,
      color: state.isSelected ? 'white' : '#1f2937',
      cursor: 'pointer',
    }),
    input: (base: CSSObjectWithLabel) => ({
      ...base,
      'input:focus': {
        boxShadow: 'none',
      },
    }),
  }

  if (!generated) {
    return (
      <div className="min-h-screen bg-emerald-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-xl overflow-hidden">
            <div className="bg-emerald-600 px-6 sm:px-8 py-8 sm:py-12">
              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2 drop-shadow">
                ใบขอรับเงินค่าตอบแทน
              </h1>
              <p className="text-emerald-100 text-sm sm:text-base">
                เบี้ยเลี้ยงเหมาจ่ายสำหรับเจ้าหน้าที่ที่ปฏิบัติงานในหน่วยบริการสังกัดกระทรวงสาธารณสุข
              </p>
            </div>
            <form
              noValidate
              onSubmit={(e) => {
                e.preventDefault()



                // Helper: scroll into view + focus
                const focusField = (el: HTMLElement | null) => {
                  if (!el) return
                  el.scrollIntoView({ behavior: 'smooth', block: 'center' })
                  setTimeout(() => el.focus(), 300)
                }

                // 1. ชื่อ
                if (!formData.name || formData.name.trim() === '') {
                  focusField(document.querySelector<HTMLElement>('input[name="name"]'))
                  return
                }

                // 2. นามสกุล
                if (!formData.surname || formData.surname.trim() === '') {
                  focusField(document.querySelector<HTMLElement>('input[name="surname"]'))
                  return
                }

                // 3. ตำแหน่ง (react-select) — ใช้ ref.focus() เปิด dropdown
                if (!selectedPositionOption) {
                  positionSelectRef.current?.focus()
                  return
                }

                // 4. งาน/กลุ่มงาน
                if (!formData.level || formData.level.trim() === '') {
                  focusField(document.getElementById('level-input'))
                  return
                }

                // 5. วันที่เริ่ม
                if (!formData.startDate) {
                  focusField(document.getElementById('startDate-day'))
                  return
                }

                // 6. ถึงวันที่
                if (!formData.endDate) {
                  focusField(document.getElementById('endDate-day'))
                  return
                }

                // 7. เดือนเริ่มต้น
                if (!formData.startMonth) {
                  focusField(document.getElementById('startMonth-select'))
                  return
                }

                // 8. ปีเริ่มต้น (พ.ศ.)
                if (!formData.startYear) {
                  focusField(document.getElementById('startYear-select'))
                  return
                }

                setGenerated(true)
                window.scrollTo(0, 0)
              }}
              className="px-6 sm:px-8 py-8 space-y-6"
            >
              <div>
                <h2 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b-2 border-gray-200">
                  ข้อมูลส่วนตัว
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-800 mb-1.5">
                      ชื่อ
                    </label>
                    <input
                      type="text"
                      name="name"
                      maxLength={MAX_INPUT_LENGTH}
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="เช่น นายสมชาย"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-800 mb-1.5">
                      นามสกุล
                    </label>
                    <input
                      type="text"
                      name="surname"
                      maxLength={MAX_INPUT_LENGTH}
                      value={formData.surname}
                      onChange={handleInputChange}
                      placeholder="เช่น ใจดี"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition outline-none"
                      required
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-800 mb-1.5">
                    ตำแหน่ง
                  </label>
                  <Select
                    ref={positionSelectRef}
                    inputId="s11-position-select"
                    name="position"
                    value={selectedPositionOption}
                    options={positionOptions}
                    onChange={(opt) =>
                      handlePositionChange(opt as PositionOption | null)
                    }
                    placeholder="เลือกตำแหน่ง"
                    isClearable
                    styles={customSelectStyles}
                    classNamePrefix="react-select"
                  />
                </div>
              </div>

              <div>
                <h2 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b-2 border-gray-200">
                  สถานที่ปฏิบัติงาน
                </h2>
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-1.5">
                    ปัจจุบันปฏิบัติงานที่
                  </label>
                  <input
                    type="text"
                    name="currentWorkplace"
                    maxLength={MAX_INPUT_LENGTH}
                    value={formData.currentWorkplace}
                    onChange={handleInputChange}
                    placeholder="เช่น โรงพยาบาลตัวอย่าง"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition outline-none"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-800 mb-1.5">
                      จังหวัด
                    </label>
                    <input
                      type="text"
                      name="province"
                      maxLength={MAX_INPUT_LENGTH}
                      value={formData.province}
                      onChange={handleInputChange}
                      placeholder="เช่น กรุงเทพมหานคร"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-800 mb-1.5">
                      หน่วยบริการ
                    </label>
                    <input
                      type="text"
                      name="unit"
                      maxLength={MAX_INPUT_LENGTH}
                      value={formData.unit}
                      onChange={handleInputChange}
                      placeholder="เช่น โรงพยาบาลตัวอย่าง"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition outline-none"
                      required
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-800 mb-1.5">
                    งาน/กลุ่มงาน
                  </label>
                  <input
                    id="level-input"
                    type="text"
                    name="level"
                    maxLength={MAX_INPUT_LENGTH}
                    value={formData.level}
                    onChange={handleInputChange}
                    placeholder="เช่น ดิจิทัลทางการแพทย์และสุขภาพ"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <h2 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b-2 border-gray-200">
                  ข้อมูลการปฏิบัติงาน
                </h2>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-800 mb-1.5">
                      จำนวนเงินที่คำนวณ (บาท)
                    </label>
                    <div className="w-full px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 font-medium">
                      {formData.amount ||
                        'กรุณาเลือกตำแหน่งและกรอกข้อมูลการทำงาน'}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-800 mb-1.5">
                      วันที่เริ่ม
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <select
                        id="startDate-day"
                        value={
                          formData.startDate
                            ? String(startDateParts.day)
                            : ''
                        }
                        onChange={(e) =>
                          handlePrimaryDateSelectChange(
                            'startDate',
                            'day',
                            e.target.value,
                          )
                        }
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition outline-none"
                      >
                        <option value="">วัน</option>
                        {dayOptions.map((day) => (
                          <option key={`sd-${day}`} value={String(day)}>
                            {day}
                          </option>
                        ))}
                      </select>
                      <select
                        value={
                          formData.startDate
                            ? String(startDateParts.monthIndex)
                            : ''
                        }
                        onChange={(e) =>
                          handlePrimaryDateSelectChange(
                            'startDate',
                            'monthIndex',
                            e.target.value,
                          )
                        }
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition outline-none"
                      >
                        <option value="">เดือน</option>
                        {months.map((m, i) => (
                          <option key={`sm-${m}`} value={String(i)}>
                            {m}
                          </option>
                        ))}
                      </select>
                      <select
                        value={
                          formData.startDate
                            ? String(startDateParts.buddhistYear)
                            : ''
                        }
                        onChange={(e) =>
                          handlePrimaryDateSelectChange(
                            'startDate',
                            'buddhistYear',
                            e.target.value,
                          )
                        }
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition outline-none"
                      >
                        <option value="">พ.ศ.</option>
                        {yearOptions.map((y) => (
                          <option key={`sy-${y}`} value={String(y)}>
                            {y}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-800 mb-1.5">
                      ถึงวันที่
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <select
                        id="endDate-day"
                        value={
                          formData.endDate ? String(endDateParts.day) : ''
                        }
                        onChange={(e) =>
                          handlePrimaryDateSelectChange(
                            'endDate',
                            'day',
                            e.target.value,
                          )
                        }
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition outline-none"
                      >
                        <option value="">วัน</option>
                        {dayOptions.map((day) => (
                          <option key={`ed-${day}`} value={String(day)}>
                            {day}
                          </option>
                        ))}
                      </select>
                      <select
                        value={
                          formData.endDate
                            ? String(endDateParts.monthIndex)
                            : ''
                        }
                        onChange={(e) =>
                          handlePrimaryDateSelectChange(
                            'endDate',
                            'monthIndex',
                            e.target.value,
                          )
                        }
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition outline-none"
                      >
                        <option value="">เดือน</option>
                        {months.map((m, i) => (
                          <option key={`em-${m}`} value={String(i)}>
                            {m}
                          </option>
                        ))}
                      </select>
                      <select
                        value={
                          formData.endDate
                            ? String(endDateParts.buddhistYear)
                            : ''
                        }
                        onChange={(e) =>
                          handlePrimaryDateSelectChange(
                            'endDate',
                            'buddhistYear',
                            e.target.value,
                          )
                        }
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition outline-none"
                      >
                        <option value="">พ.ศ.</option>
                        {yearOptions.map((y) => (
                          <option key={`ey-${y}`} value={String(y)}>
                            {y}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b-2 border-gray-200">
                  ประวัติการปฏิบัติงาน (ถ้ามี)
                </h2>
                <div className="space-y-4">
                  {formData.workHistory.map((entry, index) => {
                    const whStart = parseThaiDateParts(entry.startDate)
                    const whEnd = parseThaiDateParts(entry.endDate)
                    return (
                      <div
                        key={entry.id}
                        className="border border-emerald-200 rounded-lg p-4 relative bg-emerald-50/50"
                      >
                        <p className="text-sm font-medium text-emerald-800 mb-3">
                          สถานที่ทำงานที่ {index + 1}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <input
                            type="text"
                            name="hospital"
                            maxLength={MAX_INPUT_LENGTH}
                            value={entry.hospital}
                            onChange={(e) =>
                              handleWorkHistoryChange(entry.id, e)
                            }
                            placeholder="โรงพยาบาล"
                            className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition outline-none"
                          />
                          <input
                            type="text"
                            name="province"
                            maxLength={MAX_INPUT_LENGTH}
                            value={entry.province}
                            onChange={(e) =>
                              handleWorkHistoryChange(entry.id, e)
                            }
                            placeholder="จังหวัด"
                            className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition outline-none"
                          />
                        </div>
                        <div className="mt-4">
                          <input
                            type="text"
                            name="level"
                            maxLength={MAX_INPUT_LENGTH}
                            value={entry.level}
                            onChange={(e) =>
                              handleWorkHistoryChange(entry.id, e)
                            }
                            placeholder="ระดับ"
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition outline-none"
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-800 mb-1.5">
                              วันที่เริ่ม
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                              <select
                                value={
                                  entry.startDate
                                    ? String(whStart.day)
                                    : ''
                                }
                                onChange={(e) =>
                                  handleWorkHistoryDateChange(
                                    entry.id,
                                    'startDate',
                                    'day',
                                    e.target.value,
                                  )
                                }
                                className="px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                              >
                                <option value="">วัน</option>
                                {dayOptions.map((d) => (
                                  <option key={d} value={String(d)}>
                                    {d}
                                  </option>
                                ))}
                              </select>
                              <select
                                value={
                                  entry.startDate
                                    ? String(whStart.monthIndex)
                                    : ''
                                }
                                onChange={(e) =>
                                  handleWorkHistoryDateChange(
                                    entry.id,
                                    'startDate',
                                    'monthIndex',
                                    e.target.value,
                                  )
                                }
                                className="px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                              >
                                <option value="">เดือน</option>
                                {months.map((m, i) => (
                                  <option key={m} value={String(i)}>
                                    {m}
                                  </option>
                                ))}
                              </select>
                              <select
                                value={
                                  entry.startDate
                                    ? String(whStart.buddhistYear)
                                    : ''
                                }
                                onChange={(e) =>
                                  handleWorkHistoryDateChange(
                                    entry.id,
                                    'startDate',
                                    'buddhistYear',
                                    e.target.value,
                                  )
                                }
                                className="px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                              >
                                <option value="">พ.ศ.</option>
                                {yearOptions.map((y) => (
                                  <option key={y} value={String(y)}>
                                    {y}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-800 mb-1.5">
                              ถึงวันที่
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                              <select
                                value={
                                  entry.endDate ? String(whEnd.day) : ''
                                }
                                onChange={(e) =>
                                  handleWorkHistoryDateChange(
                                    entry.id,
                                    'endDate',
                                    'day',
                                    e.target.value,
                                  )
                                }
                                className="px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                              >
                                <option value="">วัน</option>
                                {dayOptions.map((d) => (
                                  <option key={d} value={String(d)}>
                                    {d}
                                  </option>
                                ))}
                              </select>
                              <select
                                value={
                                  entry.endDate
                                    ? String(whEnd.monthIndex)
                                    : ''
                                }
                                onChange={(e) =>
                                  handleWorkHistoryDateChange(
                                    entry.id,
                                    'endDate',
                                    'monthIndex',
                                    e.target.value,
                                  )
                                }
                                className="px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                              >
                                <option value="">เดือน</option>
                                {months.map((m, i) => (
                                  <option key={m} value={String(i)}>
                                    {m}
                                  </option>
                                ))}
                              </select>
                              <select
                                value={
                                  entry.endDate
                                    ? String(whEnd.buddhistYear)
                                    : ''
                                }
                                onChange={(e) =>
                                  handleWorkHistoryDateChange(
                                    entry.id,
                                    'endDate',
                                    'buddhistYear',
                                    e.target.value,
                                  )
                                }
                                className="px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                              >
                                <option value="">พ.ศ.</option>
                                {yearOptions.map((y) => (
                                  <option key={y} value={String(y)}>
                                    {y}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeWorkHistory(entry.id)}
                          className="absolute top-2 right-2 flex items-center justify-center w-8 h-8 rounded-full bg-red-100 hover:bg-red-200 text-red-600 hover:text-red-800 transition-colors shadow-sm"
                          title="ลบรายการนี้"
                        >
                          <span className="text-xl font-bold leading-none translate-y-[-1px]">&times;</span>
                        </button>
                      </div>
                    )
                  })}
                </div>
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={addWorkHistory}
                    className="w-full bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-semibold py-2 px-4 rounded-lg transition duration-200 border border-emerald-200"
                  >
                    + เพิ่มประวัติการทำงาน
                  </button>
                </div>
              </div>

              <div className="mt-6">
                <h3 className="text-base font-semibold text-gray-800 mb-3">
                  รายละเอียดการฝึกเพิ่มพูนทักษะ
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-800 mb-1.5">
                      รวมระยะเวลาการปฏิบัติงาน (ปี)
                    </label>
                    <input
                      type="number"
                      name="trainingPracticeYears"
                      value={formData.trainingPracticeYears}
                      onChange={handleInputChange}
                      placeholder="เช่น 1"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-800 mb-1.5">
                      รวมระยะเวลาการปฏิบัติงาน (เดือน)
                    </label>
                    <input
                      type="number"
                      name="trainingPracticeMonths"
                      value={formData.trainingPracticeMonths}
                      onChange={handleInputChange}
                      placeholder="เช่น 6"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                    <p className="text-sm font-medium text-gray-700">
                      รพศ/รพท
                    </p>
                    <div className="space-y-3 mt-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <input
                          type="text"
                          name="trainingRphHospital"
                          maxLength={MAX_INPUT_LENGTH}
                          value={formData.trainingRphHospital}
                          onChange={handleInputChange}
                          placeholder="ชื่อหน่วย"
                          className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                        <input
                          type="text"
                          name="trainingRphProvince"
                          maxLength={MAX_INPUT_LENGTH}
                          value={formData.trainingRphProvince}
                          onChange={handleInputChange}
                          placeholder="จังหวัด"
                          className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="grid grid-cols-3 gap-2">
                          <select
                            value={
                              formData.trainingRphStart
                                ? String(trainingRphStartParts.day)
                                : ''
                            }
                            onChange={(e) =>
                              handleTrainingDateChange(
                                'trainingRphStart',
                                'day',
                                e.target.value,
                              )
                            }
                            className="px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                          >
                            <option value="">วัน</option>
                            {dayOptions.map((d) => (
                              <option key={d} value={String(d)}>
                                {d}
                              </option>
                            ))}
                          </select>
                          <select
                            value={
                              formData.trainingRphStart
                                ? String(trainingRphStartParts.monthIndex)
                                : ''
                            }
                            onChange={(e) =>
                              handleTrainingDateChange(
                                'trainingRphStart',
                                'monthIndex',
                                e.target.value,
                              )
                            }
                            className="px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                          >
                            <option value="">เดือน</option>
                            {months.map((m, i) => (
                              <option key={m} value={String(i)}>
                                {m}
                              </option>
                            ))}
                          </select>
                          <select
                            value={
                              formData.trainingRphStart
                                ? String(trainingRphStartParts.buddhistYear)
                                : ''
                            }
                            onChange={(e) =>
                              handleTrainingDateChange(
                                'trainingRphStart',
                                'buddhistYear',
                                e.target.value,
                              )
                            }
                            className="px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                          >
                            <option value="">พ.ศ.</option>
                            {yearOptions.map((y) => (
                              <option key={y} value={String(y)}>
                                {y}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <select
                            value={
                              formData.trainingRphEnd
                                ? String(trainingRphEndParts.day)
                                : ''
                            }
                            onChange={(e) =>
                              handleTrainingDateChange(
                                'trainingRphEnd',
                                'day',
                                e.target.value,
                              )
                            }
                            className="px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                          >
                            <option value="">วัน</option>
                            {dayOptions.map((d) => (
                              <option key={d} value={String(d)}>
                                {d}
                              </option>
                            ))}
                          </select>
                          <select
                            value={
                              formData.trainingRphEnd
                                ? String(trainingRphEndParts.monthIndex)
                                : ''
                            }
                            onChange={(e) =>
                              handleTrainingDateChange(
                                'trainingRphEnd',
                                'monthIndex',
                                e.target.value,
                              )
                            }
                            className="px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                          >
                            <option value="">เดือน</option>
                            {months.map((m, i) => (
                              <option key={m} value={String(i)}>
                                {m}
                              </option>
                            ))}
                          </select>
                          <select
                            value={
                              formData.trainingRphEnd
                                ? String(trainingRphEndParts.buddhistYear)
                                : ''
                            }
                            onChange={(e) =>
                              handleTrainingDateChange(
                                'trainingRphEnd',
                                'buddhistYear',
                                e.target.value,
                              )
                            }
                            className="px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                          >
                            <option value="">พ.ศ.</option>
                            {yearOptions.map((y) => (
                              <option key={y} value={String(y)}>
                                {y}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                    <p className="text-sm font-medium text-gray-700">รพช</p>
                    <div className="space-y-3 mt-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <input
                          type="text"
                          name="trainingRhcHospital"
                          maxLength={MAX_INPUT_LENGTH}
                          value={formData.trainingRhcHospital}
                          onChange={handleInputChange}
                          placeholder="ชื่อหน่วย"
                          className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                        <input
                          type="text"
                          name="trainingRhcProvince"
                          maxLength={MAX_INPUT_LENGTH}
                          value={formData.trainingRhcProvince}
                          onChange={handleInputChange}
                          placeholder="จังหวัด"
                          className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="grid grid-cols-3 gap-2">
                          <select
                            value={
                              formData.trainingRhcStart
                                ? String(trainingRhcStartParts.day)
                                : ''
                            }
                            onChange={(e) =>
                              handleTrainingDateChange(
                                'trainingRhcStart',
                                'day',
                                e.target.value,
                              )
                            }
                            className="px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                          >
                            <option value="">วัน</option>
                            {dayOptions.map((d) => (
                              <option key={d} value={String(d)}>
                                {d}
                              </option>
                            ))}
                          </select>
                          <select
                            value={
                              formData.trainingRhcStart
                                ? String(trainingRhcStartParts.monthIndex)
                                : ''
                            }
                            onChange={(e) =>
                              handleTrainingDateChange(
                                'trainingRhcStart',
                                'monthIndex',
                                e.target.value,
                              )
                            }
                            className="px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                          >
                            <option value="">เดือน</option>
                            {months.map((m, i) => (
                              <option key={m} value={String(i)}>
                                {m}
                              </option>
                            ))}
                          </select>
                          <select
                            value={
                              formData.trainingRhcStart
                                ? String(trainingRhcStartParts.buddhistYear)
                                : ''
                            }
                            onChange={(e) =>
                              handleTrainingDateChange(
                                'trainingRhcStart',
                                'buddhistYear',
                                e.target.value,
                              )
                            }
                            className="px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                          >
                            <option value="">พ.ศ.</option>
                            {yearOptions.map((y) => (
                              <option key={y} value={String(y)}>
                                {y}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <select
                            value={
                              formData.trainingRhcEnd
                                ? String(trainingRhcEndParts.day)
                                : ''
                            }
                            onChange={(e) =>
                              handleTrainingDateChange(
                                'trainingRhcEnd',
                                'day',
                                e.target.value,
                              )
                            }
                            className="px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                          >
                            <option value="">วัน</option>
                            {dayOptions.map((d) => (
                              <option key={d} value={String(d)}>
                                {d}
                              </option>
                            ))}
                          </select>
                          <select
                            value={
                              formData.trainingRhcEnd
                                ? String(trainingRhcEndParts.monthIndex)
                                : ''
                            }
                            onChange={(e) =>
                              handleTrainingDateChange(
                                'trainingRhcEnd',
                                'monthIndex',
                                e.target.value,
                              )
                            }
                            className="px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                          >
                            <option value="">เดือน</option>
                            {months.map((m, i) => (
                              <option key={m} value={String(i)}>
                                {m}
                              </option>
                            ))}
                          </select>
                          <select
                            value={
                              formData.trainingRhcEnd
                                ? String(trainingRhcEndParts.buddhistYear)
                                : ''
                            }
                            onChange={(e) =>
                              handleTrainingDateChange(
                                'trainingRhcEnd',
                                'buddhistYear',
                                e.target.value,
                              )
                            }
                            className="px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                          >
                            <option value="">พ.ศ.</option>
                            {yearOptions.map((y) => (
                              <option key={y} value={String(y)}>
                                {y}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b-2 border-gray-200">
                  ช่วงเดือนขอรับ
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-800 mb-1.5">
                      เดือนเริ่มต้น
                    </label>
                    <select
                      id="startMonth-select"
                      name="startMonth"
                      value={formData.startMonth}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                      required
                    >
                      <option value="">เลือกเดือน</option>
                      {months.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-800 mb-1.5">
                      ปีเริ่มต้น (พ.ศ.)
                    </label>
                    <select
                      id="startYear-select"
                      name="startYear"
                      value={formData.startYear}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                      required
                    >
                      <option value="">เลือกปี</option>
                      {yearOptions.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="pt-6">
                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 shadow-md hover:shadow-lg"
                >
                  สร้างเอกสาร 12 เดือน
                </button>
              </div>
            </form>
          </div>
        </div>
      </div >
    )
  }

  return (
    <div className="bg-white min-h-screen p-0 print:p-0">
      <div className="fixed top-4 right-4 flex gap-2 z-50 print:hidden">
        <button
          onClick={() => setGenerated(false)}
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
        const totalMonthsWithOffset = baseTotalMonths + index
        const yearsWithOffset = Math.floor(totalMonthsWithOffset / 12)
        const monthsWithOffset = totalMonthsWithOffset % 12

        return (
          <div
            key={`${item.month}-${item.year}`}
            className="flex flex-col items-center"
          >
            <div
              className="mx-auto bg-white"
              style={{
                width: '210mm',
                minHeight: '297mm',
                padding: '22mm',
                fontFamily:
                  '"TH SarabunPSK", "Sarabun", "Leelawadee UI", "Tahoma", "Times New Roman", serif',
                fontSize: '16pt',
                lineHeight: '1.1',
                color: '#111',
                boxSizing: 'border-box',
                pageBreakAfter: isLast ? 'auto' : 'always',
                pageBreakBefore: index === 0 ? 'auto' : 'always',
              }}
            >
              <div className="text-center mb-3">
                <p
                  style={{
                    fontSize: '16pt',
                    marginBottom: 0,
                    fontWeight: 'bold',
                    fontFamily:
                      '"TH SarabunPSK", "Sarabun", "Leelawadee UI", "Tahoma", "Times New Roman", serif',
                  }}
                >
                  ใบขอรับเงินค่าตอบแทนเบี้ยเลี้ยงเหมาจ่ายสำหรับเจ้าหน้าที่
                </p>
                <p
                  style={{
                    fontSize: '16pt',
                    marginTop: 0,
                    fontWeight: 'bold',
                    fontFamily:
                      '"TH SarabunPSK", "Sarabun", "Leelawadee UI", "Tahoma", "Times New Roman", serif',
                  }}
                >
                  ที่ปฏิบัติงานในหน่วยบริการสังกัดกระทรวงสาธารณสุข
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-right">
                  หน่วยบริการ...........{formData.unit}.................
                </p>
                <p className="text-right">
                  ประจำเดือน.....{item.month}.....พ.ศ.....
                  {convertToThaiNumber(item.year)}
                </p>

                <div style={{ marginBottom: '8pt', whiteSpace: 'pre-line' }}>
                  <span>
                    ข้าพเจ้าชื่อ.....{formData.name || '.............'}.
                    .นามสกุล.....{formData.surname || '.............'}.
                    .ตำแหน่ง.....{formData.position || '.............'}. .
                  </span>
                  <br />
                  <span>
                    ปัจจุบันปฏิบัติงานที่..
                    {formData.currentWorkplace || '.............'}.จังหวัด..
                    {formData.province || '.............'}..งาน/กลุ่มงาน..
                    {formData.level || '.............'}...
                  </span>
                  <br />
                  <span>
                    ปฏิบัติงานในหน่วยบริการ.....
                    {convertToThaiNumber(yearsWithOffset) || '..............'}.
                    ..ปี.....
                    {convertToThaiNumber(monthsWithOffset) || '..............'}.
                    ..เดือน (นับถึงสิ้นเดือนที่เบิกจ่าย)
                  </span>
                  <br />
                  <span>
                    โดยมีรายละเอียดการปฏิบัติงาน ดังนี้ (เฉพาะสายแพทย์ตอบข้อ ๑
                    ด้วย)
                  </span>
                </div>

                <p>
                  ๑. ฝึกเพิ่มพูนทักษะ (ปีที่ ๑) รวมระยะเวลาการปฏิบัติงาน
                  {trainingPracticeYearsDisplay}ปี{trainingPracticeMonthsDisplay}
                  เดือน ดังนี้
                </p>
                <ul className="pl-8 space-y-1 list-none">
                  <li className="leading-tight">
                    <span>{trainingRphLine.main}</span>
                    <span className="block pl-6">{trainingRphLine.period}</span>
                  </li>
                  <li className="leading-tight">
                    <span>{trainingRhcLine.main}</span>
                    <span className="block pl-6">{trainingRhcLine.period}</span>
                  </li>
                </ul>

                <p>
                  ๒. ปฏิบัติงานที่โรงพยาบาล...
                  {formData.currentWorkplace ||
                    '............................'}
                  ..จังหวัด...
                  {formData.province || '..........................'}...จัดระดับ
                  ปกติ ระดับ {convertToThaiNumber(2)}
                </p>
                <p className="pl-6">
                  ตั้งแต่วันที่...
                  {formatThaiDate(formData.startDate) ||
                    '.....................................'}
                  ..ถึงวันที่...
                  {formatThaiDate(formData.endDate) ||
                    '..............................'}
                  ...รวม {convertToThaiNumber(yearsWithOffset) ||
                    '..............'}{' '}
                  ปี {convertToThaiNumber(monthsWithOffset) || '.........'}{' '}
                  เดือน .....วัน
                </p>

                {(() => {
                  const workHistorySlots = 5
                  const uniqueWorkHistory: WorkHistoryEntry[] = []
                  const seen = new Set<string>()

                  for (const job of formData.workHistory) {
                    const key = [
                      job.hospital,
                      job.province,
                      job.level,
                      job.startDate,
                      job.endDate,
                    ].join('|')
                    if (!seen.has(key)) {
                      seen.add(key)
                      uniqueWorkHistory.push(job)
                    }
                  }

                  return Array.from({ length: workHistorySlots }, (_, idx) => {
                    const job = uniqueWorkHistory[idx]
                    if (job) {
                      const { years, months: jobMonths } =
                        calculateDateDifference(job.startDate, job.endDate)
                      return (
                        <Fragment key={job.id}>
                          <p>
                            {convertToThaiNumber(idx + 3)}.
                            ปฏิบัติงานที่โรงพยาบาล...
                            {job.hospital || '............................'}
                            ...จังหวัด...
                            {job.province || '..........................'}
                            ...จัดระดับ...
                            {job.level || '..................................'}
                          </p>
                          <p className="pl-6">
                            ตั้งแต่วันที่..
                            {formatThaiDate(job.startDate) ||
                              '.....................................'}
                            ...ถึงวันที่...
                            {formatThaiDate(job.endDate) ||
                              '..............................'}{' '}
                            รวม{' '}
                            {convertToThaiNumber(years) || '..............'}{' '}
                            ปี{' '}
                            {convertToThaiNumber(jobMonths) || '.........'}{' '}
                            เดือน ...........วัน
                          </p>
                        </Fragment>
                      )
                    }
                    return (
                      <Fragment key={`empty-${idx}`}>
                        <p>
                          {convertToThaiNumber(idx + 3)}.
                          ปฏิบัติงานที่โรงพยาบาล............................จังหวัด..........................จัดระดับ..................................
                        </p>
                        <p className="pl-6">
                          ตั้งแต่วันที่.....................................
                          ถึงวันที่ ..............................
                          รวม..............ปี.........เดือน...........วัน
                        </p>
                      </Fragment>
                    )
                  })
                })()}

                <p>
                  รวมทั้งสิ้น.....{convertToThaiNumber(yearsWithOffset)}
                  .....ปี.....{convertToThaiNumber(monthsWithOffset)}
                  .....เดือน.....วัน จำนวนที่ขอเบิก.....{amountDisplayText}
                  .....บาท (...{amountThaiText}...)
                </p>
                <p className="indent-10">
                  ข้าพเจ้าขอรับรองข้อมูลดังกล่าวเป็นความจริงทุกประการ
                  และหากมีการเรียกเงินคืน
                  ข้าพเจ้าขอรับผิดชอบคืนเงินแต่เพียงผู้เดียว
                </p>

                <div className="pt-8">
                  <div className="flex justify-end mt-4">
                    <div className="text-center" style={{ minWidth: '220px' }}>
                      <p>
                        ({formData.name} {formData.surname})
                      </p>
                      <p>ตำแหน่ง {formData.position}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {!isLast && (
              <div
                className="print:hidden w-full flex justify-center"
                style={{ pageBreakBefore: 'auto' }}
              >
                <div className="w-[210mm] border-t border-dashed border-emerald-300 my-8 opacity-70" />
              </div>
            )}
          </div>
        )
      })}

      <style>
        {`
          @media print {
            @page {
              margin: 0;
              size: auto;
            }
            body {
              -webkit-print-color-adjust: exact;
            }
          }
        `}
      </style>
    </div>
  )
}

export default S11Page
