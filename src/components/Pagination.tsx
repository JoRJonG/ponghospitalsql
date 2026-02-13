interface PaginationProps {
    currentPage: number
    totalPages: number
    totalItems: number
    pageSize: number
    onPageChange: (page: number) => void
    /** Label for the item type, e.g. "รายการ", "กิจกรรม" */
    itemLabel?: string
}

export default function Pagination({
    currentPage,
    totalPages,
    totalItems,
    pageSize,
    onPageChange,
    itemLabel = 'รายการ',
}: PaginationProps) {
    if (totalPages <= 1) return null

    // Calculate which page numbers to show (max 5)
    const getPageNumbers = (): number[] => {
        const pages: number[] = []
        const maxVisible = 5
        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) pages.push(i)
        } else if (currentPage <= 3) {
            for (let i = 1; i <= maxVisible; i++) pages.push(i)
        } else if (currentPage >= totalPages - 2) {
            for (let i = totalPages - maxVisible + 1; i <= totalPages; i++) pages.push(i)
        } else {
            for (let i = currentPage - 2; i <= currentPage + 2; i++) pages.push(i)
        }
        return pages
    }

    const startItem = (currentPage - 1) * pageSize + 1
    const endItem = Math.min(currentPage * pageSize, totalItems)

    return (
        <div className="mt-8 space-y-3">
            {/* Page buttons */}
            <div className="flex justify-center items-center gap-1.5">
                <button
                    onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
                    disabled={currentPage === 1}
                    className="w-9 h-9 flex items-center justify-center rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm"
                    aria-label="หน้าก่อนหน้า"
                >
                    <i className="fa-solid fa-chevron-left text-xs" />
                </button>

                {getPageNumbers().map(num => (
                    <button
                        key={num}
                        onClick={() => onPageChange(num)}
                        className={`w-9 h-9 flex items-center justify-center rounded-lg font-medium transition-all text-sm ${currentPage === num
                                ? 'bg-emerald-600 text-white shadow-md'
                                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        {num}
                    </button>
                ))}

                <button
                    onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="w-9 h-9 flex items-center justify-center rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm"
                    aria-label="หน้าถัดไป"
                >
                    <i className="fa-solid fa-chevron-right text-xs" />
                </button>
            </div>

            {/* Summary text */}
            <div className="text-center text-sm text-gray-500">
                แสดง {startItem}–{endItem} จาก {totalItems} {itemLabel}
            </div>
        </div>
    )
}
