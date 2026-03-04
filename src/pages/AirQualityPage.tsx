import { useState, useMemo, useRef, useCallback } from 'react'
import { buildApiUrl } from '../utils/api'
import { useAirQualitySSE } from '../hooks/useAirQualitySSE'
import { useAirQualityHistory } from '../hooks/useAirQualityHistory'
import type { HistoryRecord } from '../hooks/useAirQualityHistory'
import SEO from '../components/SEO'
import PageHeader from '../components/PageHeader'

/* ─── Types ─── */

/* ─── AQI Level Config ─── */
interface LevelConfig {
    label: string
    shortLabel: string
    accentColor: string
    bgColor: string
    borderColor: string
    textColor: string
    glowColor: string
    advice: string
    icon: string
    thMin: number
    thMax: number | null
}

const AQI_LEVELS: LevelConfig[] = [
    {
        thMin: 0, thMax: 15,
        label: 'คุณภาพอากาศดีมาก',
        shortLabel: 'ดีมาก',
        accentColor: '#00BFF3',
        bgColor: 'rgba(0,191,243,0.08)',
        borderColor: 'rgba(0,191,243,0.25)',
        glowColor: 'rgba(0,191,243,0.15)',
        textColor: '#0099cc',
        advice: 'คุณภาพอากาศดีมาก เหมาะสำหรับทำกิจกรรมกลางแจ้งทุกประเภท',
        icon: 'fa-face-smile-beam',
    },
    {
        thMin: 15.1, thMax: 25,
        label: 'คุณภาพอากาศดี',
        shortLabel: 'ดี',
        accentColor: '#00A651',
        bgColor: 'rgba(0,166,81,0.08)',
        borderColor: 'rgba(0,166,81,0.25)',
        glowColor: 'rgba(0,166,81,0.15)',
        textColor: '#007a3d',
        advice: 'คุณภาพอากาศอยู่ในเกณฑ์ดี ประชาชนทั่วไปสามารถทำกิจกรรมกลางแจ้งได้ตามปกติ',
        icon: 'fa-face-smile',
    },
    {
        thMin: 25.1, thMax: 37.5,
        label: 'คุณภาพอากาศปานกลาง',
        shortLabel: 'ปานกลาง',
        accentColor: '#F5A623',
        bgColor: 'rgba(245,166,35,0.08)',
        borderColor: 'rgba(245,166,35,0.25)',
        glowColor: 'rgba(245,166,35,0.15)',
        textColor: '#b87a00',
        advice: 'ผู้ที่มีความไวต่อมลพิษทางอากาศควรลดระยะเวลา หรือความหนักของกิจกรรมกลางแจ้ง',
        icon: 'fa-face-meh',
    },
    {
        thMin: 37.6, thMax: 75,
        label: 'คุณภาพอากาศเริ่มมีผลกระทบต่อสุขภาพ',
        shortLabel: 'เริ่มมีผลกระทบ',
        accentColor: '#F47920',
        bgColor: 'rgba(244,121,32,0.08)',
        borderColor: 'rgba(244,121,32,0.25)',
        glowColor: 'rgba(244,121,32,0.15)',
        textColor: '#c05e00',
        advice: 'ผู้สูงอายุ เด็กเล็ก และผู้ป่วยโรคระบบทางเดินหายใจควรหลีกเลี่ยงกิจกรรมกลางแจ้งที่ต้องออกแรงมาก',
        icon: 'fa-face-frown',
    },
    {
        thMin: 75.1, thMax: null,
        label: 'คุณภาพอากาศมีผลกระทบต่อสุขภาพมาก',
        shortLabel: 'มีผลต่อสุขภาพ',
        accentColor: '#E3000F',
        bgColor: 'rgba(227,0,15,0.08)',
        borderColor: 'rgba(227,0,15,0.25)',
        glowColor: 'rgba(227,0,15,0.15)',
        textColor: '#b00008',
        advice: 'ประชาชนทุกคนควรหลีกเลี่ยงกิจกรรมกลางแจ้ง หากจำเป็นควรสวมหน้ากาก N95 หรือ N99',
        icon: 'fa-face-dizzy',
    },
]

/** ใช้ค่า PM2.5 (µg/m³) เป็นเกณฑ์ตัดสินระดับ */
function getLevel(pm25: number): LevelConfig {
    return AQI_LEVELS.find(l => pm25 <= (l.thMax ?? Infinity)) ?? AQI_LEVELS[AQI_LEVELS.length - 1]
}


/* ─── Inline SVG Chart ─── */
interface ChartPoint {
    x: number
    y: number
    value: number | null
    label: string   // เวลา HH:MM
    dateLabel: string  // วันที่+เวลาเต็ม
    hour: string
}

function PMChart({ records, accentColor }: { records: HistoryRecord[], accentColor: string }) {
    const W = 800
    const H = 200
    const PAD = { top: 20, right: 20, bottom: 40, left: 44 }
    const chartW = W - PAD.left - PAD.right
    const chartH = H - PAD.top - PAD.bottom

    const [tooltip, setTooltip] = useState<{ x: number, y: number, point: ChartPoint } | null>(null)

    const validRecords = useMemo(() => {
        const now = Date.now()
        return [...records]
            .filter(r => new Date(r.log_datetime.replace(' ', 'T')).getTime() + 3_600_000 <= now)
            .reverse()
    }, [records])

    const values = validRecords.map(r => r.pm25).filter((v): v is number => v !== null)
    const maxVal = Math.max(...values, 50)
    const minVal = 0
    const range = maxVal - minVal || 1

    const points: ChartPoint[] = validRecords.map((r, i) => {
        const x = PAD.left + (i / Math.max(validRecords.length - 1, 1)) * chartW
        const v = r.pm25 ?? 0
        const y = PAD.top + chartH - ((v - minVal) / range) * chartH
        // cmuccdc ส่งเวลาช้ากว่าจริง 1 ชม. → บวก +1 ชม. ก่อนแสดง
        const dt = new Date(new Date(r.log_datetime.replace(' ', 'T')).getTime() + 3_600_000)
        return {
            x,
            y,
            value: r.pm25,
            label: new Intl.DateTimeFormat('th-TH', { hour: '2-digit', minute: '2-digit' }).format(dt),
            dateLabel: new Intl.DateTimeFormat('th-TH', {
                day: 'numeric', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
            }).format(dt),
            hour: dt.getHours().toString().padStart(2, '0') + ':00',
        }
    })

    const svgRef = useRef<SVGSVGElement>(null)

    const handlePointerMove = useCallback((clientX: number) => {
        if (!svgRef.current || points.length === 0) return
        const rect = svgRef.current.getBoundingClientRect()
        const scaleX = W / rect.width
        const xInSvg = (clientX - rect.left) * scaleX

        let closest = points[0]
        let minDiff = Math.abs(xInSvg - points[0].x)
        for (let i = 1; i < points.length; i++) {
            const diff = Math.abs(xInSvg - points[i].x)
            if (diff < minDiff) {
                minDiff = diff
                closest = points[i]
            }
        }
        setTooltip({ x: closest.x, y: closest.y, point: closest })
    }, [points, W])

    const handleTouchMove = (e: React.TouchEvent) => {
        if (e.touches.length > 0) handlePointerMove(e.touches[0].clientX)
    }

    const handleMouseMove = (e: React.MouseEvent) => {
        handlePointerMove(e.clientX)
    }

    if (validRecords.length === 0) {
        return (
            <div className="flex items-center justify-center h-[180px] text-slate-400 text-sm">
                <i className="fa-solid fa-chart-line mr-2" />ไม่มีข้อมูลกราฟ
            </div>
        )
    }

    return (
        <div className="w-full relative">
            <svg
                ref={svgRef}
                viewBox={`0 0 ${W} ${H}`}
                className="w-full touch-pan-y select-none"
                style={{ minWidth: 320 }}
                aria-label="กราฟ PM2.5 ย้อนหลัง 24 ชั่วโมง"
                onMouseLeave={() => setTooltip(null)}
                onTouchEnd={() => setTooltip(null)}
                onTouchCancel={() => setTooltip(null)}
                onMouseMove={handleMouseMove}
                onTouchStart={handleTouchMove}
                onTouchMove={handleTouchMove}
            >
                <defs>
                    <linearGradient id="pmLineGrad" x1="0" y1={PAD.top + chartH} x2="0" y2={PAD.top} gradientUnits="userSpaceOnUse">
                        {AQI_LEVELS.flatMap((col, idx) => {
                            const prevVal = idx === 0 ? 0 : (AQI_LEVELS[idx - 1].thMax ?? 0)
                            const val = col.thMax ?? Math.max(maxVal, 500)
                            const pctStart = Math.max(0, Math.min(100, ((prevVal - minVal) / range) * 100))
                            const pctEnd = Math.max(0, Math.min(100, ((val - minVal) / range) * 100))
                            if (pctStart >= 100) return []
                            return [
                                <stop key={`${idx}-start`} offset={`${pctStart}%`} stopColor={col.accentColor} />,
                                <stop key={`${idx}-end`} offset={`${pctEnd}%`} stopColor={col.accentColor} />
                            ]
                        })}
                    </linearGradient>
                    <linearGradient id="pmAreaGrad" x1="0" y1={PAD.top + chartH} x2="0" y2={PAD.top} gradientUnits="userSpaceOnUse">
                        {AQI_LEVELS.flatMap((col, idx) => {
                            const prevVal = idx === 0 ? 0 : (AQI_LEVELS[idx - 1].thMax ?? 0)
                            const val = col.thMax ?? Math.max(maxVal, 500)
                            const pctStart = Math.max(0, Math.min(100, ((prevVal - minVal) / range) * 100))
                            const pctEnd = Math.max(0, Math.min(100, ((val - minVal) / range) * 100))
                            if (pctStart >= 100) return []
                            return [
                                <stop key={`${idx}-start`} offset={`${pctStart}%`} stopColor={col.accentColor} stopOpacity="0.25" />,
                                <stop key={`${idx}-end`} offset={`${pctEnd}%`} stopColor={col.accentColor} stopOpacity="0.25" />
                            ]
                        })}
                    </linearGradient>
                    <linearGradient id="pmAreaFade" x1="0" y1="0%" x2="0" y2="100%">
                        <stop offset="0%" stopColor="white" stopOpacity="1" />
                        <stop offset="100%" stopColor="white" stopOpacity="0" />
                    </linearGradient>
                    <mask id="fadeMask" x="0" y="0" width="100%" height="100%">
                        <rect x="0" y="0" width="100%" height="100%" fill="url(#pmAreaFade)" />
                    </mask>
                    <filter id="pmGlow">
                        <feGaussianBlur stdDeviation="2.5" result="blur" />
                        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                </defs>

                {/* Grid lines + Y labels */}
                {[0, 0.25, 0.5, 0.75, 1].map(pct => {
                    const yPos = PAD.top + chartH - pct * chartH
                    const yVal = Math.round(minVal + pct * range)
                    return (
                        <g key={pct}>
                            <line
                                x1={PAD.left} y1={yPos}
                                x2={PAD.left + chartW} y2={yPos}
                                stroke="#e2e8f0" strokeWidth="0.8" strokeDasharray={pct === 0 ? 'none' : '4,4'}
                            />
                            <text x={PAD.left - 6} y={yPos + 4} textAnchor="end" fontSize="10" fill="#94a3b8">{yVal}</text>
                        </g>
                    )
                })}

                {/* Threshold reference lines — ตามเกณฑ์ PM2.5 µg/m³ */}
                {[
                    { val: 15, label: '15', color: '#00BFF3' },
                    { val: 25, label: '25', color: '#00A651' },
                    { val: 37.5, label: '37.5', color: '#F5A623' },
                    { val: 75, label: '75', color: '#F47920' },
                ].filter(t => t.val <= maxVal * 1.1).map(t => {
                    const yPos = PAD.top + chartH - ((t.val - minVal) / range) * chartH
                    if (yPos < PAD.top || yPos > PAD.top + chartH) return null
                    return (
                        <g key={t.val}>
                            <line
                                x1={PAD.left} y1={yPos}
                                x2={PAD.left + chartW} y2={yPos}
                                stroke={t.color} strokeWidth="1" strokeDasharray="6,3" opacity="0.5"
                            />
                            <text x={PAD.left + chartW + 4} y={yPos + 4} fontSize="9" fill={t.color} opacity="0.8">{t.label}</text>
                        </g>
                    )
                })}

                {/* Area fill */}
                <path d={points.length > 0
                    ? `M ${points[0].x.toFixed(1)},${(PAD.top + chartH).toFixed(1)} `
                    + points.map(p => `L ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
                    + ` L ${points[points.length - 1].x.toFixed(1)},${(PAD.top + chartH).toFixed(1)} Z`
                    : ''} fill="url(#pmAreaGrad)" mask="url(#fadeMask)" />

                {/* Line */}
                <polyline
                    points={points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}
                    fill="none"
                    stroke="url(#pmLineGrad)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    filter="url(#pmGlow)"
                />

                {/* X-axis labels */}
                {points.filter((_, i) => i % Math.max(1, Math.floor(points.length / 6)) === 0 || i === points.length - 1).map((p, i) => (
                    <text key={i} x={p.x} y={PAD.top + chartH + 18} textAnchor="middle" fontSize="10" fill="#94a3b8">
                        {p.hour}
                    </text>
                ))}

                {/* Dots + Value Labels — ทุกจุด */}
                {points.map((p, i) => {
                    const isLast = i === points.length - 1
                    const pointColor = getLevel(p.value ?? 0).accentColor
                    return (
                        <g key={i}>
                            <circle
                                cx={p.x} cy={p.y}
                                r={isLast ? 5 : 3.5}
                                fill={isLast ? pointColor : 'white'}
                                stroke={pointColor}
                                strokeWidth={isLast ? 0 : 2}
                            />
                            {p.value != null && (
                                <text
                                    x={p.x}
                                    y={p.y - (isLast ? 10 : 8)}
                                    textAnchor="middle"
                                    fontSize={isLast ? '10' : '8.5'}
                                    fontWeight={isLast ? '900' : '700'}
                                    fill={pointColor}
                                    opacity="0.9"
                                >
                                    {p.value}
                                </text>
                            )}
                        </g>
                    )
                })}

                {/* Tooltip crosshair line */}
                {tooltip && (
                    <line
                        x1={tooltip.x} y1={PAD.top}
                        x2={tooltip.x} y2={PAD.top + chartH}
                        stroke={accentColor} strokeWidth="1" strokeDasharray="3,3" opacity="0.6"
                    />
                )}

                {/* Active dot on hover */}
                {tooltip && (
                    <circle cx={tooltip.x} cy={tooltip.y} r="5" fill={accentColor} stroke="white" strokeWidth="2.5" />
                )}

                {/* X-axis baseline */}
                <line
                    x1={PAD.left} y1={PAD.top + chartH}
                    x2={PAD.left + chartW} y2={PAD.top + chartH}
                    stroke="#cbd5e1" strokeWidth="1"
                />
            </svg>

            {/* Floating Tooltip (HTML overlay) */}
            {tooltip && (
                <div
                    className="absolute pointer-events-none z-10 bg-slate-800/95 text-white rounded-lg px-3 py-2 shadow-xl text-xs backdrop-blur-sm border border-white/10"
                    style={{
                        left: `${(tooltip.x / W) * 100}%`,
                        top: `${(tooltip.y / H) * 100}%`,
                        // ใช้ระบบ 4 ทิศทาง (บน/ล่าง/ซ้าย/ขวา) เพื่อให้แน่ใจว่า tooltip ไม่หลุดกรอบ
                        transform: `translate(
                            ${tooltip.x > W / 2 ? 'calc(-100% - 12px)' : '12px'},
                            ${tooltip.y < H * 0.4 ? '12px' : 'calc(-100% - 12px)'}
                        )`,
                        minWidth: 140,
                        zIndex: 50,
                    }}
                >
                    <div className="font-semibold text-slate-300 mb-1 text-[10px]">{tooltip.point.dateLabel}</div>
                    <div className="flex items-baseline gap-1.5">
                        <span className="text-lg font-black tabular-nums" style={{ color: getLevel(tooltip.point.value ?? 0).accentColor }}>
                            {tooltip.point.value ?? '–'}
                        </span>
                        <span className="text-slate-400 text-[10px] font-semibold">µg/m³ PM2.5</span>
                    </div>
                </div>
            )}
        </div>
    )
}

/* ─── PM Gauge / Scale Bar ─── */
function AQIScaleBar({ currentPm25 }: { currentPm25: number }) {
    return (
        <div className="w-full">
            <div className="flex gap-1 rounded-full overflow-hidden h-3 mb-2">
                {AQI_LEVELS.map((lvl, i) => (
                    <div
                        key={i}
                        className="flex-1 transition-all duration-500"
                        style={{
                            backgroundColor: lvl.accentColor,
                            opacity: currentPm25 >= lvl.thMin && currentPm25 <= (lvl.thMax ?? Infinity) ? 1 : 0.28,
                            transform: currentPm25 >= lvl.thMin && currentPm25 <= (lvl.thMax ?? Infinity) ? 'scaleY(1.3)' : 'scaleY(1)',
                        }}
                    />
                ))}
            </div>
            <div className="flex justify-between text-xs sm:text-sm text-slate-500 font-bold px-0.5 mt-2">
                {AQI_LEVELS.map((lvl, i) => (
                    <span key={i} style={{ color: currentPm25 >= lvl.thMin && currentPm25 <= (lvl.thMax ?? Infinity) ? lvl.accentColor : undefined }}>
                        {lvl.shortLabel}
                    </span>
                ))}
            </div>
        </div>
    )
}

/* ─── Skeleton ─── */
function Skeleton({ cls }: { cls: string }) {
    return <div className={`animate-pulse bg-slate-100 rounded-lg ${cls}`} />
}

/* ─── Main Page ─── */
export default function AirQualityPage() {
    const { data: current, loading: currentLoading } = useAirQualitySSE()
    const [imgError, setImgError] = useState(false)

    const { data: history, loading: histLoading } = useAirQualityHistory()

    const pm25 = current?.pm25 ?? current?.daily_pm25
    const pm10 = current?.pm10 ?? current?.daily_pm10
    const level = getLevel(pm25 ?? 0)  // getLevel() เป็น pure fn เบา ไม่ต้อง memo

    const logTime = current?.log_datetime
        ? new Intl.DateTimeFormat('th-TH', {
            day: 'numeric', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        }).format(new Date(current.log_datetime.replace(' ', 'T') + '+07:00'))
        : null

    return (
        <div className="page-wrapper">
            <SEO
                title="คุณภาพอากาศ PM2.5 | โรงพยาบาลปง"
                description={`ข้อมูลคุณภาพอากาศ PM2.5 สถานี รพ.ปง จ.พะเยา · ค่า PM2.5 ปัจจุบัน${pm25 != null ? ` ${pm25} µg/m³` : ''} · กราฟย้อนหลัง 24 ชั่วโมง`}
            />

            <div className="container-narrow py-6 sm:py-8 space-y-6">
                <PageHeader title="คุณภาพอากาศ PM2.5" subtitle="สถานีตรวจวัด โรงพยาบาลปง อ.ปง จ.พะเยา" />

                {/* ═══ Hero: Current PM ═══ */}
                <div
                    className="relative overflow-hidden rounded-2xl border p-6 sm:p-8 transition-all duration-500"
                    style={{
                        backgroundColor: level.bgColor,
                        borderColor: level.borderColor,
                        boxShadow: `0 8px 32px ${level.glowColor}`,
                    }}
                >
                    {/* Background glow blob */}
                    <div
                        className="absolute -right-16 -top-16 w-48 h-48 rounded-full blur-3xl opacity-20 pointer-events-none"
                        style={{ backgroundColor: level.accentColor }}
                    />

                    <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-6">
                        {/* Mascot */}
                        <div
                            className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white/90 border-4 flex items-center justify-center shrink-0 shadow-lg"
                            style={{ borderColor: level.accentColor }}
                        >
                            {currentLoading ? (
                                <div className="w-full h-full rounded-full bg-slate-100 animate-pulse" />
                            ) : current?.th_dustboy_icon && !imgError ? (
                                <img
                                    src={buildApiUrl(`/api/images/airquality/${current.th_dustboy_icon}.png?w=200`)}
                                    alt={level.label}
                                    className="w-[115%] h-[115%] object-contain drop-shadow-md"
                                    onError={() => setImgError(true)}
                                />
                            ) : (
                                <i className={`fa-solid ${level.icon} text-4xl`} style={{ color: level.accentColor }} />
                            )}
                        </div>

                        {/* Main values */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: level.accentColor }} />
                                    <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: level.accentColor }} />
                                </span>
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">อัปเดตล่าสุด</span>
                                {logTime ? <span className="text-xs text-slate-400">{logTime}</span> : null}
                            </div>

                            <div className="flex items-baseline gap-3 flex-wrap">
                                {currentLoading ? (
                                    <Skeleton cls="h-16 w-36" />
                                ) : (
                                    <>
                                        <div className="flex items-baseline gap-1">
                                            <span
                                                className="text-6xl sm:text-7xl font-black tabular-nums leading-none tracking-tighter"
                                                style={{ color: level.accentColor }}
                                            >
                                                {pm25 ?? '–'}
                                            </span>
                                            <span className="text-lg font-bold text-slate-400 ml-1">µg/m³</span>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <span className="text-sm font-extrabold text-slate-700">PM 2.5</span>
                                            <span
                                                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold text-white"
                                                style={{ backgroundColor: level.accentColor }}
                                            >
                                                <i className={`fa-solid ${level.icon} mr-1.5`} />
                                                {level.shortLabel}
                                            </span>
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="mt-2 text-sm text-slate-600 leading-relaxed max-w-lg">
                                {currentLoading ? <Skeleton cls="h-4 w-full mt-1" /> : (current?.th_caption || level.advice)}
                            </div>
                        </div>

                        {/* PM10 side card */}
                        <div className="shrink-0 rounded-xl border bg-white/70 backdrop-blur px-5 py-4 text-center min-w-[100px] shadow-sm"
                            style={{ borderColor: level.borderColor }}>
                            <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">PM 10</div>
                            {currentLoading ? <Skeleton cls="h-10 w-16 mx-auto" /> : (
                                <div className="text-3xl font-black tabular-nums"
                                    style={{ color: level.accentColor }}>
                                    {pm10 ?? '–'}
                                </div>
                            )}
                            <div className="text-[10px] text-slate-400 font-semibold mt-1">µg/m³</div>
                        </div>
                    </div>

                    {/* AQI Scale Bar */}
                    <div className="mt-6 pt-5 border-t" style={{ borderColor: level.borderColor }}>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">ระดับดัชนีคุณภาพอากาศ</div>
                        <AQIScaleBar currentPm25={pm25 ?? 0} />
                    </div>
                </div>

                {/* ═══ Daily Summary Cards ═══ */}
                {(!currentLoading && current) ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                            { label: 'PM2.5 รายชั่วโมง', value: current.pm25, unit: 'µg/m³', icon: 'fa-wind' },
                            { label: 'PM2.5 รายวัน', value: current.daily_pm25, unit: 'µg/m³', icon: 'fa-calendar-day' },
                            { label: 'PM10 รายชั่วโมง', value: current.pm10, unit: 'µg/m³', icon: 'fa-smog' },
                            { label: 'PM10 รายวัน', value: current.daily_pm10, unit: 'µg/m³', icon: 'fa-calendar-day' },
                        ].map((item, i) => (
                            <div key={i} className="rounded-xl bg-white border border-slate-100 p-4 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-center gap-2 text-slate-400 mb-2">
                                    <i className={`fa-solid ${item.icon} text-xs`} />
                                    <span className="text-[10px] font-bold uppercase tracking-wide">{item.label}</span>
                                </div>
                                <div className="text-2xl font-black tabular-nums" style={{ color: level.accentColor }}>
                                    {item.value ?? '–'}
                                </div>
                                <div className="text-[10px] text-slate-400 font-semibold mt-0.5">{item.unit}</div>
                            </div>
                        ))}
                    </div>
                ) : null}

                {/* ═══ 24h History Chart ═══ */}
                <div className="rounded-2xl bg-white border border-slate-100 shadow-sm relative">
                    <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between">
                        <div>
                            <h2 className="text-sm font-bold text-slate-800">
                                <i className="fa-solid fa-chart-area mr-2 text-slate-400" />
                                กราฟ PM2.5 ย้อนหลัง 24 ชั่วโมง
                            </h2>
                            <p className="text-[10px] text-slate-400 mt-0.5">หน่วย: µg/m³ · รายชั่วโมง · สถานี รพ.ปง</p>
                        </div>
                        {histLoading ? (
                            <span className="text-[10px] text-slate-400 animate-pulse">กำลังโหลด…</span>
                        ) : (
                            <span className="text-[10px] text-slate-400">{history.length} จุดข้อมูล</span>
                        )}
                    </div>
                    <div className="p-4 sm:p-5">
                        {histLoading ? (
                            <div className="space-y-2">
                                <Skeleton cls="h-[160px] w-full" />
                                <Skeleton cls="h-3 w-3/4" />
                            </div>
                        ) : (
                            <PMChart records={history} accentColor={level.accentColor} />
                        )}
                    </div>
                </div>

            </div>
        </div>
    )
}
