import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const NotFoundPage: React.FC = () => {
    return (
        <div className="min-h-[70vh] flex flex-col items-center justify-center p-4 text-center">
            <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="mb-8"
            >
                <div className="relative">
                    <h1 className="text-9xl font-bold text-gray-200 select-none">404</h1>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <i className="fa-regular fa-face-frown text-6xl text-[var(--hospital-primary)] opacity-80"></i>
                    </div>
                </div>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="max-w-md mx-auto"
            >
                <h2 className="text-3xl font-bold text-[var(--hospital-gray-800)] mb-4 font-['Noto_Sans_Thai']">
                    ไม่พบหน้านี้
                </h2>
                <p className="text-[var(--hospital-text-secondary)] mb-8 font-['Noto_Sans_Thai']">
                    เราไม่สามารถหาหน้าที่คุณต้องการได้ อาจเป็นไปได้ว่าหน้าเว็บถูกลบ ย้าย หรือที่อยู่ URL ไม่ถูกต้อง
                </p>

                <Link
                    to="/"
                    className="btn btn-primary inline-flex items-center gap-2 hover-lift font-['Noto_Sans_Thai']"
                >
                    <i className="fa-solid fa-house"></i>
                    กลับสู่หน้าหลัก
                </Link>
            </motion.div>
        </div>
    );
};

export default NotFoundPage;
