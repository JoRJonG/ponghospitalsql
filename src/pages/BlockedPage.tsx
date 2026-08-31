import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

const BlockedPage: React.FC = () => {
    return (
        <div className="min-h-[70vh] flex flex-col items-center justify-center p-4 text-center">
            <Helmet>
                <title>การเข้าถึงถูกระงับ | โรงพยาบาลปง</title>
                <meta name="robots" content="noindex, nofollow" />
            </Helmet>
            <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="mb-8"
            >
                <div className="relative inline-block">
                    <div className="absolute inset-0 bg-red-100 rounded-full scale-150 opacity-50 animate-pulse"></div>
                    <i className="fa-solid fa-shield-halved text-8xl text-[var(--hospital-error)] relative z-10"></i>
                    <i className="fa-solid fa-ban text-4xl text-white absolute bottom-0 right-0 z-20 bg-[var(--hospital-error)] rounded-full p-2 border-4 border-white"></i>
                </div>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="max-w-lg mx-auto"
            >
                <h2 className="text-3xl font-bold text-[var(--hospital-error)] mb-2 font-['Noto_Sans_Thai']">
                    การเข้าถึงถูกระงับ
                </h2>
                <h3 className="text-xl font-semibold text-[var(--hospital-gray-700)] mb-4 font-['Noto_Sans_Thai']">
                    Access Blocked
                </h3>

                <div className="bg-red-50 border border-red-100 rounded-lg p-6 mb-8 text-left">
                    <p className="text-[var(--hospital-text-secondary)] mb-4 font-['Noto_Sans_Thai']">
                        ระบบความปลอดภัยของเราได้ระงับการเชื่อมต่อของคุณชั่วคราว เนื่องจากตรวจพบกิจกรรมที่อาจเป็นความเสี่ยง
                    </p>
                    <ul className="text-sm text-[var(--hospital-text-muted)] list-disc pl-5 font-['Noto_Sans_Thai'] space-y-1">
                        <li>มีการเรียกใช้งานหน้านี้ถี่เกินไป (Rate Limit Exceeded)</li>
                        <li>รูปแบบการใช้งานที่ไม่ปกติ (Unusual Activity)</li>
                        <li>นโยบายความปลอดภัยของระบบ (Security Policy)</li>
                    </ul>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center font-['Noto_Sans_Thai']">
                    <button
                        onClick={() => window.location.reload()}
                        className="btn btn-primary inline-flex items-center gap-2 hover-lift"
                    >
                        <i className="fa-solid fa-rotate-right"></i>
                        ลองใหม่อีกครั้ง
                    </button>
                    <Link
                        to="/contact"
                        className="btn btn-outline inline-flex items-center gap-2 hover-lift"
                    >
                        <i className="fa-regular fa-envelope"></i>
                        ติดต่อเรา
                    </Link>
                </div>
            </motion.div>
        </div>
    );
};

export default BlockedPage;
