import type { Ref } from 'react'
import Select, { type SelectInstance, type StylesConfig, type CSSObjectWithLabel, type ControlProps, type OptionProps } from 'react-select'
import type { FormDataState, TrainingDateField, TrainingExtraEntry, PositionOption } from './types'
import { positions, months, MAX_INPUT_LENGTH } from './constants'
import ThaiDateInput from './ThaiDateInput'

type Props = {
  formData: FormDataState
  positionSelectRef: Ref<SelectInstance<PositionOption>>
  currentWorkDuration: { years: number; months: number; days: number }
  historyWorkDuration: { years: number; months: number; days: number }
  historyWorkMonths: number
  trainingDuration: { years: number; months: number; days: number }
  trainingMonthsTotal: number
  totalExperienceDuration: { years: number; months: number; days: number }
  totalYearsOfExperience: number
  yearOptions: number[]
  numberToThaiText: (num: number) => string
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void
  onPrimaryDateChange: (field: 'startDate' | 'endDate', isoDate: string) => void
  onTrainingDateChange: (field: TrainingDateField, isoDate: string) => void
  onPositionChange: (option: PositionOption | null) => void
  onStartMonthBlur: () => void
  onStartYearBlur: () => void
  onAddWorkHistory: () => void
  onRemoveWorkHistory: (id: string) => void
  onWorkHistoryChange: (id: string, e: React.ChangeEvent<HTMLInputElement>) => void
  onWorkHistoryDateChange: (id: string, field: 'startDate' | 'endDate', isoDate: string) => void
  onAddExtraTraining: () => void
  onRemoveExtraTraining: (index: number) => void
  onExtraTrainingChange: (index: number, field: keyof TrainingExtraEntry, value: string) => void
  onSubmit: (e: React.FormEvent) => void
}

const customSelectStyles: StylesConfig<PositionOption, false> = {
  control: (base: CSSObjectWithLabel, state: ControlProps<PositionOption, false>) => ({
    ...base,
    borderColor: state.isFocused ? '#10b981' : '#d1d5db',
    boxShadow: state.isFocused ? '0 0 0 1px #10b981' : 'none',
    '&:hover': {
      borderColor: '#10b981',
    },
    borderRadius: '0.5rem',
    paddingTop: '0.1rem',
    paddingBottom: '0.1rem',
  }),
  option: (base: CSSObjectWithLabel, state: OptionProps<PositionOption, false>) => ({
    ...base,
    backgroundColor: state.isSelected
      ? '#10b981'
      : state.isFocused
      ? '#d1fae5'
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

const S11FormPage = ({
  formData,
  positionSelectRef,
  currentWorkDuration,
  historyWorkDuration,
  historyWorkMonths,
  trainingDuration,
  trainingMonthsTotal,
  totalExperienceDuration,
  totalYearsOfExperience,
  yearOptions,
  numberToThaiText,
  onInputChange,
  onPrimaryDateChange,
  onTrainingDateChange,
  onPositionChange,
  onStartMonthBlur,
  onStartYearBlur,
  onAddWorkHistory,
  onRemoveWorkHistory,
  onWorkHistoryChange,
  onWorkHistoryDateChange,
  onAddExtraTraining,
  onRemoveExtraTraining,
  onExtraTrainingChange,
  onSubmit,
}: Props) => {
  const positionOptions: PositionOption[] = positions.map((p) => ({ value: p.name, label: p.name }))
  const selectedPositionOption = positionOptions.find((opt) => opt.value === formData.position) ?? null

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
          <form noValidate onSubmit={onSubmit} className="px-6 sm:px-8 py-8 space-y-6">
            {/* ข้อมูลส่วนตัว */}
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b-2 border-gray-200">
                ข้อมูลส่วนตัว
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-1.5">ชื่อ</label>
                  <input
                    type="text"
                    name="name"
                    maxLength={MAX_INPUT_LENGTH}
                    value={formData.name}
                    onChange={onInputChange}
                    placeholder="เช่น นายสมชาย"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-1.5">นามสกุล</label>
                  <input
                    type="text"
                    name="surname"
                    maxLength={MAX_INPUT_LENGTH}
                    value={formData.surname}
                    onChange={onInputChange}
                    placeholder="เช่น ใจดี"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition outline-none"
                    required
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-800 mb-1.5">ตำแหน่ง</label>
                <Select
                  ref={positionSelectRef}
                  inputId="s11-position-select"
                  name="position"
                  value={selectedPositionOption}
                  options={positionOptions}
                  onChange={(opt) => onPositionChange(opt as PositionOption | null)}
                  placeholder="เลือกตำแหน่ง"
                  isClearable
                  styles={customSelectStyles}
                  classNamePrefix="react-select"
                />
              </div>
            </div>

            {/* สถานที่ปฏิบัติงาน */}
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b-2 border-gray-200">
                สถานที่ปฏิบัติงาน
              </h2>
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1.5">ปัจจุบันปฏิบัติงานที่</label>
                <input
                  type="text"
                  name="currentWorkplace"
                  maxLength={MAX_INPUT_LENGTH}
                  value={formData.currentWorkplace}
                  onChange={onInputChange}
                  placeholder="เช่น โรงพยาบาลตัวอย่าง"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition outline-none"
                  required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-1.5">จังหวัด</label>
                  <input
                    type="text"
                    name="province"
                    maxLength={MAX_INPUT_LENGTH}
                    value={formData.province}
                    onChange={onInputChange}
                    placeholder="เช่น กรุงเทพมหานคร"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-1.5">หน่วยบริการ</label>
                  <input
                    type="text"
                    name="unit"
                    maxLength={MAX_INPUT_LENGTH}
                    value={formData.unit}
                    onChange={onInputChange}
                    placeholder="เช่น โรงพยาบาลตัวอย่าง"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition outline-none"
                    required
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-800 mb-1.5">งาน/กลุ่มงาน</label>
                <input
                  id="level-input"
                  type="text"
                  name="level"
                  maxLength={MAX_INPUT_LENGTH}
                  value={formData.level}
                  onChange={onInputChange}
                  placeholder="เช่น ดิจิทัลทางการแพทย์และสุขภาพ"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition outline-none"
                  required
                />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-1.5">วันที่เริ่ม</label>
                  <ThaiDateInput id="startDate-input" value={formData.startDate} onChange={(iso) => onPrimaryDateChange('startDate', iso)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-1.5">ถึงวันที่</label>
                  <ThaiDateInput id="endDate-input" value={formData.endDate} onChange={(iso) => onPrimaryDateChange('endDate', iso)} />
                </div>
              </div>
            </div>

            {/* ประวัติการปฏิบัติงาน */}
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b-2 border-gray-200">
                ประวัติการปฏิบัติงาน (ถ้ามี)
              </h2>
              <div className="space-y-4">
                {formData.workHistory.map((entry, index) => (
                  <div key={entry.id} className="border border-emerald-200 rounded-lg p-4 relative bg-emerald-50/50">
                    <p className="text-sm font-medium text-emerald-800 mb-3">สถานที่ทำงานที่ {index + 1}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <input
                        type="text"
                        name="hospital"
                        maxLength={MAX_INPUT_LENGTH}
                        value={entry.hospital}
                        onChange={(e) => onWorkHistoryChange(entry.id, e)}
                        placeholder="โรงพยาบาล"
                        className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition outline-none"
                      />
                      <input
                        type="text"
                        name="province"
                        maxLength={MAX_INPUT_LENGTH}
                        value={entry.province}
                        onChange={(e) => onWorkHistoryChange(entry.id, e)}
                        placeholder="จังหวัด"
                        className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                      <input
                        type="text"
                        name="classification"
                        maxLength={MAX_INPUT_LENGTH}
                        value={entry.classification || ''}
                        onChange={(e) => onWorkHistoryChange(entry.id, e)}
                        placeholder="จัดระดับ (เช่น ปกติ)"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition outline-none"
                      />
                      <input
                        type="text"
                        name="level"
                        maxLength={MAX_INPUT_LENGTH}
                        value={entry.level}
                        onChange={(e) => onWorkHistoryChange(entry.id, e)}
                        placeholder="ระดับ (เช่น 2)"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-800 mb-1.5">วันที่เริ่ม</label>
                        <ThaiDateInput value={entry.startDate} onChange={(iso) => onWorkHistoryDateChange(entry.id, 'startDate', iso)} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-800 mb-1.5">ถึงวันที่</label>
                        <ThaiDateInput value={entry.endDate} onChange={(iso) => onWorkHistoryDateChange(entry.id, 'endDate', iso)} />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemoveWorkHistory(entry.id)}
                      className="absolute top-2 right-2 flex items-center justify-center w-8 h-8 rounded-full bg-red-100 hover:bg-red-200 text-red-600 hover:text-red-800 transition-colors shadow-sm"
                      title="ลบรายการนี้"
                    >
                      <span className="text-xl font-bold leading-none translate-y-[-1px]">&times;</span>
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={onAddWorkHistory}
                  className="w-full bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-semibold py-2 px-4 rounded-lg transition duration-200 border border-emerald-200"
                >
                  + เพิ่มประวัติการทำงาน
                </button>
              </div>
            </div>

            {/* รายละเอียดการฝึกเพิ่มพูนทักษะ */}
            <div className="mt-6">
              <h3 className="text-base font-semibold text-gray-800 mb-3">รายละเอียดการฝึกเพิ่มพูนทักษะ</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-1.5">รวมระยะเวลาการปฏิบัติงาน (ปี)</label>
                  <input
                    type="number"
                    name="trainingPracticeYears"
                    value={formData.trainingPracticeYears}
                    onChange={onInputChange}
                    placeholder="เช่น 1"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-1.5">รวมระยะเวลาการปฏิบัติงาน (เดือน)</label>
                  <input
                    type="number"
                    name="trainingPracticeMonths"
                    value={formData.trainingPracticeMonths}
                    onChange={onInputChange}
                    placeholder="เช่น 6"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition outline-none"
                  />
                </div>
              </div>
              <div className="space-y-4">
                <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                  <p className="text-sm font-medium text-gray-700">รพศ/รพท</p>
                  <div className="space-y-3 mt-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <input
                        type="text"
                        name="trainingRphHospital"
                        maxLength={MAX_INPUT_LENGTH}
                        value={formData.trainingRphHospital}
                        onChange={onInputChange}
                        placeholder="ชื่อหน่วย"
                        className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                      <input
                        type="text"
                        name="trainingRphProvince"
                        maxLength={MAX_INPUT_LENGTH}
                        value={formData.trainingRphProvince}
                        onChange={onInputChange}
                        placeholder="จังหวัด"
                        className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">วันเริ่ม</label>
                        <ThaiDateInput value={formData.trainingRphStart} onChange={(iso) => onTrainingDateChange('trainingRphStart', iso)} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">วันสิ้นสุด</label>
                        <ThaiDateInput value={formData.trainingRphEnd} onChange={(iso) => onTrainingDateChange('trainingRphEnd', iso)} />
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
                        onChange={onInputChange}
                        placeholder="ชื่อหน่วย"
                        className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                      <input
                        type="text"
                        name="trainingRhcProvince"
                        maxLength={MAX_INPUT_LENGTH}
                        value={formData.trainingRhcProvince}
                        onChange={onInputChange}
                        placeholder="จังหวัด"
                        className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">วันเริ่ม</label>
                        <ThaiDateInput value={formData.trainingRhcStart} onChange={(iso) => onTrainingDateChange('trainingRhcStart', iso)} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">วันสิ้นสุด</label>
                        <ThaiDateInput value={formData.trainingRhcEnd} onChange={(iso) => onTrainingDateChange('trainingRhcEnd', iso)} />
                      </div>
                    </div>
                  </div>
                </div>
                {formData.extraTraining.map((entry, index) => (
                  <div key={entry.id} className="border border-gray-300 rounded-lg p-4 bg-gray-50 relative">
                    <button
                      type="button"
                      onClick={() => onRemoveExtraTraining(index)}
                      className="absolute top-4 right-4 text-red-500 hover:text-red-700"
                      title="ลบ"
                    >
                      ✕
                    </button>
                    <div className="mb-2">
                      <select
                        value={entry.type}
                        onChange={(e) => onExtraTrainingChange(index, 'type', e.target.value)}
                        className="text-sm font-medium text-gray-700 bg-transparent outline-none cursor-pointer"
                      >
                        <option value="รพศ/รพท">รพศ/รพท</option>
                        <option value="รพช">รพช</option>
                      </select>
                    </div>
                    <div className="space-y-3 mt-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <input
                          type="text"
                          maxLength={MAX_INPUT_LENGTH}
                          value={entry.hospital}
                          onChange={(e) => onExtraTrainingChange(index, 'hospital', e.target.value)}
                          placeholder="ชื่อหน่วย"
                          className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                        <input
                          type="text"
                          maxLength={MAX_INPUT_LENGTH}
                          value={entry.province}
                          onChange={(e) => onExtraTrainingChange(index, 'province', e.target.value)}
                          placeholder="จังหวัด"
                          className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">วันเริ่ม</label>
                          <ThaiDateInput value={entry.startDate} onChange={(iso) => onExtraTrainingChange(index, 'startDate', iso)} />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">วันสิ้นสุด</label>
                          <ThaiDateInput value={entry.endDate} onChange={(iso) => onExtraTrainingChange(index, 'endDate', iso)} />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={onAddExtraTraining}
                    className="w-full bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-semibold py-2 px-4 rounded-lg transition duration-200 border border-emerald-200"
                  >
                    + เพิ่มการฝึกเพิ่มพูนทักษะ
                  </button>
                </div>
              </div>
            </div>

            {/* ช่วงเดือนขอรับ */}
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b-2 border-gray-200">
                ช่วงเดือนขอรับ
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-1.5" htmlFor="startMonth-input">
                    เดือนเริ่มต้น
                  </label>
                  <input
                    id="startMonth-input"
                    list="startMonth-list"
                    name="startMonth"
                    value={formData.startMonth}
                    onChange={onInputChange}
                    onBlur={onStartMonthBlur}
                    placeholder="เดือน"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                    autoComplete="off"
                    required
                  />
                  <datalist id="startMonth-list">
                    {months.map((m) => (
                      <option key={m} value={m} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-1.5" htmlFor="startYear-input">
                    ปีเริ่มต้น (พ.ศ.)
                  </label>
                  <input
                    id="startYear-input"
                    list="startYear-list"
                    name="startYear"
                    value={formData.startYear}
                    onChange={onInputChange}
                    onBlur={onStartYearBlur}
                    placeholder="พ.ศ."
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                    autoComplete="off"
                    required
                  />
                  <datalist id="startYear-list">
                    {yearOptions.map((y) => (
                      <option key={y} value={y} />
                    ))}
                  </datalist>
                </div>
              </div>
            </div>

            {/* สรุปรวมก่อนส่งฟอร์ม */}
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b-2 border-gray-200">
                ตรวจสอบข้อมูลก่อนสร้างเอกสาร
              </h2>
              <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50 overflow-hidden shadow-sm">
                <div className="px-4 py-3 bg-gray-100 border-b border-gray-200 flex items-center justify-between">
                  <span className="text-sm font-bold text-gray-700 uppercase tracking-wide">สรุประยะเวลาปฏิบัติงานรวม</span>
                </div>
                <div className="divide-y divide-gray-100">
                  <div className="flex items-center justify-between px-4 py-3 text-sm">
                    <span className="text-gray-600">📍 ที่ปฏิบัติงานปัจจุบัน</span>
                    <span className="font-medium text-gray-800">
                      {`${currentWorkDuration.years} ปี${currentWorkDuration.months > 0 ? ` ${currentWorkDuration.months} เดือน` : ''}${currentWorkDuration.days > 0 ? ` ${currentWorkDuration.days} วัน` : ''}`}
                      {!formData.endDate && <span className="ml-1 text-xs text-blue-500">(ถึงปัจจุบัน)</span>}
                    </span>
                  </div>
                  {historyWorkMonths > 0 && (
                    <div className="flex items-center justify-between px-4 py-3 text-sm">
                      <span className="text-gray-600">📋 ประวัติการทำงานก่อนหน้า ({formData.workHistory.length} รายการ)</span>
                      <span className="font-medium text-gray-800">
                        {`${historyWorkDuration.years} ปี${historyWorkDuration.months > 0 ? ` ${historyWorkDuration.months} เดือน` : ''}${historyWorkDuration.days > 0 ? ` ${historyWorkDuration.days} วัน` : ''}`}
                      </span>
                    </div>
                  )}
                  {trainingMonthsTotal > 0 && (
                    <div className="flex items-center justify-between px-4 py-3 text-sm">
                      <span className="text-gray-600">🎓 ฝึกเพิ่มพูนทักษะ</span>
                      <span className="font-medium text-gray-800">
                        {`${trainingDuration.years} ปี${trainingDuration.months > 0 ? ` ${trainingDuration.months} เดือน` : ''}`}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between px-5 py-4 bg-emerald-50">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-emerald-800">⏱ รวมทั้งสิ้น</span>
                    </div>
                    <span className="text-lg font-bold text-emerald-800">
                      {`${totalYearsOfExperience} ปี${totalExperienceDuration.months > 0 ? ` ${totalExperienceDuration.months} เดือน` : ''}${totalExperienceDuration.days > 0 ? ` ${totalExperienceDuration.days} วัน` : ''}`}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-1.5">จำนวนเงินที่คำนวณ (บาท)</label>
                  <div className={`w-full px-5 py-4 rounded-xl border font-bold text-xl flex items-center justify-between shadow-inner ${
                    formData.amount ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-gray-50 border-gray-200 text-gray-400'
                  }`}>
                    <span>
                      {formData.amount
                        ? `${Number(formData.amount).toLocaleString()} บาท`
                        : 'กรุณาเลือกตำแหน่งและกรอกวันที่เริ่มงาน'}
                    </span>
                    {formData.amount && (
                      <span className="text-base font-semibold text-emerald-600">
                        ({numberToThaiText(Number(formData.amount))})
                      </span>
                    )}
                  </div>
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
    </div>
  )
}

export default S11FormPage
