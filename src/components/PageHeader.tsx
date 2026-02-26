import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

interface PageHeaderProps {
    title: string
    subtitle?: string
    /** Optional actions (back button, share button, etc.) rendered to the right */
    actions?: ReactNode
    /** Center-align the header (e.g. ManagementPage) */
    center?: boolean
}

const ease = [0.16, 1, 0.3, 1] as const

export default function PageHeader({ title, subtitle, actions, center }: PageHeaderProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease }}
            className={`mb-6 ${center ? 'text-center' : 'flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4'}`}
        >
            <div className="flex-1 min-w-0">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-gray-900 leading-snug">
                    {title}
                </h1>
                {subtitle && (
                    <p className="mt-1 text-gray-600 text-sm md:text-base">{subtitle}</p>
                )}
            </div>
            {actions && !center && (
                <div className="flex items-center gap-3 flex-shrink-0 mt-1 md:mt-0">
                    {actions}
                </div>
            )}
        </motion.div>
    )
}
