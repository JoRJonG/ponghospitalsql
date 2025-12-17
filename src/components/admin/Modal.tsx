import { motion, AnimatePresence } from 'framer-motion'
import type { ReactNode } from 'react'

interface ModalProps {
    isOpen: boolean
    onClose: () => void
    title: string
    subtitle?: string
    children: ReactNode
    maxWidth?: string // e.g., 'max-w-2xl', 'max-w-3xl'
}

export default function Modal({ isOpen, onClose, title, subtitle, children, maxWidth = 'max-w-2xl' }: ModalProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
                >
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        transition={{ type: 'spring', duration: 0.4, bounce: 0.3 }}
                        className={`bg-white rounded-2xl shadow-xl w-full ${maxWidth} overflow-hidden my-auto`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="p-5 border-b flex items-center justify-between sticky top-0 bg-white z-10 glass-effect">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">{title}</h3>
                                {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
                            </div>
                            <button
                                onClick={onClose}
                                className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-colors"
                                aria-label="Close modal"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
                            {children}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
