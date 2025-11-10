import { useTheme } from '../contexts/ThemeContext'

export default function GrayscaleToggle() {
  const { isGrayscale, toggleGrayscale, grayscaleMode, isDisplayModeLocked } = useTheme()

  const isLocked = isDisplayModeLocked
  const lockMessage = grayscaleMode === 'force-on'
    ? 'ผู้ดูแลระบบกำหนดให้เว็บไซต์เป็นโหมดขาวดำ'
    : 'ผู้ดูแลระบบกำหนดให้เว็บไซต์เป็นโหมดปกติ'
  const label = isLocked
    ? lockMessage
    : (isGrayscale ? 'ปิดโหมดขาวดำ' : 'เปิดโหมดขาวดำ')
  const buttonText = isLocked
    ? (grayscaleMode === 'force-on' ? 'ขาวดำ (ล็อก)' : 'สีปกติ (ล็อก)')
    : (isGrayscale ? 'สีปกติ' : 'ขาวดำ')

  return (
    <button
      type="button"
      onClick={toggleGrayscale}
      className="btn btn-ghost btn-sm"
      aria-pressed={isGrayscale}
      aria-label={label}
      title={label}
      disabled={isLocked}
    >
      <i className={`fa-solid ${isGrayscale ? 'fa-droplet' : 'fa-circle-half-stroke'} text-lg`} />
      <span className="hidden sm:inline">{buttonText}</span>
    </button>
  )
}
