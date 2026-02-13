import type { ReactNode } from 'react'

interface SearchFilterBarProps {
    /** Search input value */
    searchValue: string
    /** Called when the search input changes */
    onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void
    /** Placeholder for the search input */
    searchPlaceholder?: string
    /** Extra filter controls rendered inline next to the search input */
    filters?: ReactNode
    /** Summary line below the controls (e.g. "พบ 42 รายการ") */
    summary?: ReactNode
}

export default function SearchFilterBar({
    searchValue,
    onSearchChange,
    searchPlaceholder = 'ค้นหา...',
    filters,
    summary,
}: SearchFilterBarProps) {
    return (
        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-sm border border-gray-100 p-4 mb-6 space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
                {/* Search Input */}
                <div className="flex-1 relative">
                    <i className="fa-solid fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                    <input
                        type="text"
                        placeholder={searchPlaceholder}
                        value={searchValue}
                        onChange={onSearchChange}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-sm"
                    />
                </div>

                {/* Extra filters */}
                {filters}
            </div>

            {/* Summary */}
            {summary && (
                <div className="text-sm text-gray-500">{summary}</div>
            )}
        </div>
    )
}
