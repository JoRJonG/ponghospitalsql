// Loading fallback component สำหรับ Suspense boundaries
export default function LoadingFallback() {
    return (
        <div className="flex items-center justify-center min-h-[400px] w-full">
            <div className="flex flex-col items-center gap-4">
                {/* Spinner animation */}
                <div className="relative w-16 h-16">
                    <div className="absolute inset-0 border-4 border-emerald-200 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-emerald-600 rounded-full border-t-transparent animate-spin"></div>
                </div>
                {/* Loading text */}
                <p className="text-gray-600 text-sm font-medium animate-pulse">
                    กำลังโหลด...
                </p>
            </div>
        </div>
    )
}

// Compact loading fallback สำหรับ components เล็กๆ
export function CompactLoadingFallback() {
    return (
        <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
    )
}

// Skeleton loading สำหรับ cards
export function SkeletonCard() {
    return (
        <div className="bg-white rounded-lg shadow-md p-6 animate-pulse">
            <div className="h-48 bg-gray-200 rounded-md mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
    )
}
