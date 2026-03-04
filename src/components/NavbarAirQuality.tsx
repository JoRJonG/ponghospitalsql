import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { buildApiUrl } from '../utils/api'
import { useAirQualitySSE } from '../hooks/useAirQualitySSE'

/* ──────────────────────────────────────────────
   Level configs — semantic colors
   ────────────────────────────────────────────── */
interface LevelConfig {
    label: string
    accentColor: string
    badgeBg: string
    badgeText: string
}

function getAqiLevel(aqi: number): LevelConfig {
    if (aqi <= 25) return {
        label: 'ดีมาก',
        accentColor: '#00BFF3',
        badgeBg: '#00BFF3',
        badgeText: '#ffffff',
    }
    if (aqi <= 50) return {
        label: 'ดี',
        accentColor: '#00A651',
        badgeBg: '#00A651',
        badgeText: '#ffffff',
    }
    if (aqi <= 100) return {
        label: 'ปานกลาง',
        accentColor: '#FDC04E',
        badgeBg: '#FDC04E',
        badgeText: '#ffffff',
    }
    if (aqi <= 200) return {
        label: 'เริ่มมีผลกระทบ',
        accentColor: '#F47920',
        badgeBg: '#F47920',
        badgeText: '#ffffff',
    }
    return {
        label: 'มีผลต่อสุขภาพ',
        accentColor: '#E3000F',
        badgeBg: '#E3000F',
        badgeText: '#ffffff',
    }
}

export default function NavbarAirQuality() {
    const { data, loading } = useAirQualitySSE()
    const [imgError, setImgError] = useState(false)
    const navigate = useNavigate()

    const level = useMemo(() => getAqiLevel(data?.th_aqi ?? 0), [data?.th_aqi])
    const pm25Raw = data?.pm25 ?? '-'

    if (loading && !data) {
        return (
            <div className="flex items-center lg:pl-4 lg:border-l border-slate-200 group relative h-[42px] w-[170px] shrink-0">
                <div className="flex items-center gap-2.5 h-[40px] w-full rounded-full pl-1 pr-3 border border-slate-100 bg-slate-50">
                    <div className="w-[34px] min-w-[34px] h-[34px] rounded-full bg-slate-200 animate-pulse shrink-0"></div>
                    <div className="flex flex-col justify-center animate-pulse gap-1.5 w-full pr-2">
                        <div className="h-2 w-16 bg-slate-200 rounded"></div>
                        <div className="h-3.5 w-[50px] bg-slate-200 rounded"></div>
                    </div>
                </div>
            </div>
        )
    }

    if (!data) return (
        <div className="flex items-center lg:pl-4 lg:border-l border-slate-200 group relative invisible h-[42px] w-[170px] shrink-0" />
    )

    return (
        <div
            className="flex items-center lg:pl-4 lg:border-l border-slate-200 relative h-[42px] w-[170px] shrink-0 cursor-pointer group"
            onClick={() => navigate('/air-quality')}
            role="button"
            aria-label="ดูรายละเอียดคุณภาพอากาศ PM2.5"
            title="คลิกเพื่อดูรายละเอียด"
        >
            {/* Colored Glow Pill Container */}
            <div
                className="flex items-center gap-2.5 h-[40px] w-full rounded-full pl-1 pr-3 transition-all duration-300 hover:scale-105 border overflow-visible"
                style={{
                    backgroundColor: `${level.accentColor}1A`,
                    borderColor: `${level.accentColor}4D`,
                    boxShadow: `0 4px 12px ${level.accentColor}1A`,
                }}
            >
                {/* Mascot Avatar */}
                <div className="relative w-[34px] min-w-[34px] max-w-[34px] h-[34px] shrink-0 flex items-center justify-center rounded-full bg-white shadow-sm border border-white/80">
                    {data.th_dustboy_icon && !imgError ? (
                        <img
                            src={buildApiUrl(`/api/images/airquality/${data.th_dustboy_icon}.png?w=100`)}
                            alt={level.label}
                            className="w-[110%] h-[110%] object-contain drop-shadow-sm scale-105"
                            onError={() => setImgError(true)}
                        />
                    ) : (
                        <div className="w-full h-full rounded-full" style={{ backgroundColor: level.accentColor }} />
                    )}
                </div>

                <div className="flex flex-col justify-center w-full">
                    {/* Live indicator */}
                    <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="relative flex h-1.5 w-1.5">
                            <span
                                className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                                style={{ backgroundColor: level.accentColor }}
                            />
                            <span
                                className="relative inline-flex rounded-full h-1.5 w-1.5"
                                style={{ backgroundColor: level.accentColor }}
                            />
                        </span>
                        <span className="text-[10px] font-extrabold text-slate-800 uppercase tracking-wide leading-none">
                            PM 2.5 รพ.ปง
                        </span>
                    </div>

                    {/* Numeric Value */}
                    <div className="flex items-baseline gap-1" style={{ color: level.accentColor }}>
                        <span className="text-xl font-black tabular-nums leading-none tracking-tight drop-shadow-sm">
                            {pm25Raw}
                        </span>
                        <span className="text-[10px] font-bold opacity-90">
                            µg/m<sup className="font-semibold text-[8px]">3</sup>
                        </span>
                    </div>
                </div>
            </div>
        </div>
    )
}
