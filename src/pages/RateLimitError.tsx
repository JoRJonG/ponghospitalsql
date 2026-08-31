import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';

/**
 * หน้า Error สำหรับกรณีที่มีการร้องขอ API ถี่เกินไป (Rate Limit)
 * แสดงข้อความแจ้งเตือนพร้อม countdown timer และปุ่มกลับหน้าหลัก
 * ใช้โทนสีเขียวทางการแพทย์ตามธีมโรงพยาบาล
 */
const RateLimitError = () => {
    const navigate = useNavigate();
    const [countdown, setCountdown] = useState(60); // นับถอยหลัง 60 วินาที

    // ตั้งค่า countdown timer
    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);

    // ฟังก์ชันกลับหน้าหลัก
    const handleGoHome = () => {
        navigate('/');
    };

    // ฟังก์ชันลองใหม่อีกครั้ง
    const handleRetry = () => {
        window.location.reload();
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-white to-emerald-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 px-4 py-8">
            <Helmet>
                <title>มีการร้องขอถี่เกินไป | โรงพยาบาลปง</title>
                <meta name="robots" content="noindex, nofollow" />
            </Helmet>
            {/* Background Pattern - สร้างลวดลายพื้นหลังที่สวยงาม */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-green-200 dark:bg-green-900 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-20 animate-blob"></div>
                <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-200 dark:bg-emerald-900 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
                <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-teal-200 dark:bg-teal-900 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
            </div>

            {/* Main Content Card */}
            <div className="relative max-w-2xl w-full">
                {/* Glass Card Effect */}
                <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 p-8 md:p-12 transform transition-all duration-500 hover:scale-[1.02]">

                    {/* Icon Container - ไอคอนเตือนที่มีแอนิเมชั่น */}
                    <div className="flex justify-center mb-8">
                        <div className="relative">
                            {/* Pulsing Circle Background */}
                            <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-red-500 rounded-full animate-ping opacity-20"></div>

                            {/* Main Icon Circle */}
                            <div className="relative bg-gradient-to-br from-orange-400 to-red-500 rounded-full p-6 shadow-lg">
                                <svg
                                    className="w-16 h-16 text-white animate-pulse"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                    />
                                </svg>
                            </div>
                        </div>
                    </div>

                    {/* Error Title */}
                    <h1 className="text-4xl md:text-5xl font-bold text-center mb-4 bg-gradient-to-r from-orange-600 to-red-600 dark:from-orange-400 dark:to-red-400 bg-clip-text text-transparent font-['Noto_Sans_Thai']">
                        ขออภัย!
                    </h1>

                    {/* Error Message */}
                    <div className="text-center mb-8">
                        <p className="text-xl md:text-2xl text-[var(--hospital-gray-800)] dark:text-gray-200 font-semibold mb-3 font-['Noto_Sans_Thai']">
                            มีการร้องขอถี่เกินไป
                        </p>
                        <p className="text-base md:text-lg text-[var(--hospital-text-secondary)] dark:text-gray-400 leading-relaxed font-['Noto_Sans_Thai']">
                            กรุณาลองใหม่อีกครั้งภายหลัง เพื่อความปลอดภัยของระบบ เราจำกัดจำนวนการร้องขอต่อนาที
                        </p>
                    </div>

                    {/* Countdown Timer */}
                    <div className="flex justify-center mb-8">
                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-gray-700 dark:to-gray-600 rounded-2xl px-8 py-6 shadow-inner border border-green-200 dark:border-gray-600">
                            <div className="text-center">
                                <p className="text-sm text-[var(--hospital-text-secondary)] dark:text-gray-300 mb-2 font-medium font-['Noto_Sans_Thai']">
                                    ลองใหม่อีกครั้งใน
                                </p>
                                <div className="flex items-center justify-center gap-2">
                                    <span className="text-5xl font-bold bg-gradient-to-r from-[var(--hospital-primary)] to-[var(--hospital-secondary)] dark:from-green-400 dark:to-emerald-400 bg-clip-text text-transparent tabular-nums">
                                        {countdown}
                                    </span>
                                    <span className="text-2xl text-[var(--hospital-text-muted)] dark:text-gray-400 font-medium font-['Noto_Sans_Thai']">
                                        วินาที
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                        {/* ปุ่มกลับหน้าหลัก */}
                        <button
                            onClick={handleGoHome}
                            className="group relative w-full sm:w-auto px-8 py-4 bg-[var(--hospital-primary)] hover:bg-[var(--hospital-primary-dark)] text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 overflow-hidden font-['Noto_Sans_Thai']"
                        >
                            {/* Button Shine Effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>

                            <span className="relative flex items-center justify-center gap-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                </svg>
                                กลับหน้าหลัก
                            </span>
                        </button>

                        {/* ปุ่มลองใหม่อีกครั้ง */}
                        <button
                            onClick={handleRetry}
                            disabled={countdown > 0}
                            className={`group relative w-full sm:w-auto px-8 py-4 font-semibold rounded-xl shadow-lg transform transition-all duration-200 overflow-hidden font-['Noto_Sans_Thai']
                                ${countdown > 0
                                    ? 'bg-[var(--hospital-gray-300)] dark:bg-gray-600 text-[var(--hospital-gray-500)] dark:text-gray-400 cursor-not-allowed'
                                    : 'bg-[var(--hospital-secondary)] hover:bg-[var(--hospital-accent)] text-white hover:shadow-xl hover:-translate-y-0.5'
                                }`}
                        >
                            {/* Button Shine Effect */}
                            {countdown === 0 && (
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                            )}

                            <span className="relative flex items-center justify-center gap-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                ลองใหม่อีกครั้ง
                            </span>
                        </button>
                    </div>

                    {/* Additional Info */}
                    <div className="mt-8 pt-6 border-t border-[var(--hospital-gray-200)] dark:border-gray-700">
                        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
                            <div className="flex gap-3">
                                <svg className="w-6 h-6 text-[var(--hospital-primary)] dark:text-green-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <div className="text-sm text-[var(--hospital-text-secondary)] dark:text-gray-300 font-['Noto_Sans_Thai']">
                                    <p className="font-semibold mb-1">ทำไมถึงเกิดข้อผิดพลาดนี้?</p>
                                    <p className="text-[var(--hospital-text-muted)] dark:text-gray-400">
                                        ระบบตรวจพบการเข้าถึงข้อมูลบ่อยเกินไป เพื่อป้องกันการใช้งานที่ผิดปกติและรักษาประสิทธิภาพของระบบ
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RateLimitError;
