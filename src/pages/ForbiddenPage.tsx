import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

const ForbiddenPage: React.FC = () => {
    return (
        <div className="min-h-[70vh] flex flex-col items-center justify-center p-4 text-center">
            <Helmet>
                <title>403 ไม่มีสิทธิ์เข้าถึง | โรงพยาบาลปง</title>
                <meta name="robots" content="noindex, nofollow" />
            </Helmet>
            <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="mb-8"
            >
                <div className="relative">
                    <h1 className="text-9xl font-bold text-gray-200 select-none">403</h1>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <i className="fa-solid fa-hand text-6xl text-[var(--hospital-warning)] opacity-80"></i>
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
                    ไม่มีสิทธิ์เข้าถึง
                </h2>
                <p className="text-[var(--hospital-text-secondary)] mb-8 font-['Noto_Sans_Thai']">
                    ขออภัย คุณไม่มีสิทธิ์ในการเข้าถึงหน้าเว็บนี้ หากคุณเชื่อว่านี่คือข้อผิดพลาด โปรดติดต่อผู้ดูแลระบบ
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center font-['Noto_Sans_Thai']">
                    <Link
                        to="/"
                        className="btn btn-outline inline-flex items-center gap-2 hover-lift"
                    >
                        <i className="fa-solid fa-arrow-left"></i>
                        กลับหน้าหลัก
                    </Link>
                    <Link
                        to="/login"
                        className="btn btn-primary inline-flex items-center gap-2 hover-lift"
                    >
                        <i className="fa-solid fa-right-to-bracket"></i>
                        เข้าสู่ระบบ
                    </Link>
                </div>
            </motion.div>
        </div>
    );
};

export default ForbiddenPage;
