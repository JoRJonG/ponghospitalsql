import React, { useState } from 'react';
import { fetchWithRateLimitHandler } from '../utils/rateLimitHandler';

/**
 * ตัวอย่างการใช้งาน Rate Limit Error Handler
 * Component นี้แสดงวิธีการเรียก API ที่มีการจัดการ Rate Limit อัตโนมัติ
 */
const RateLimitExample: React.FC = () => {
    const [data, setData] = useState<unknown>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // ตัวอย่างที่ 1: ใช้ fetchWithRateLimitHandler
    const fetchDataWithHandler = async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetchWithRateLimitHandler('/api/data');
            const result = await response.json();
            setData(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
        } finally {
            setLoading(false);
        }
    };

    // ตัวอย่างที่ 2: ใช้ fetch ธรรมดาและตรวจสอบเอง
    const fetchDataManual = async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/data');

            // ตรวจสอบ rate limit
            if (response.status === 429) {
                window.location.href = '/rate-limit';
                return;
            }

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            setData(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
        } finally {
            setLoading(false);
        }
    };

    // ตัวอย่างที่ 3: ทดสอบ Rate Limit (เรียก API หลายครั้งติดกัน)
    const testRateLimit = async () => {
        setLoading(true);
        setError(null);

        try {
            // เรียก API 10 ครั้งติดกัน เพื่อทดสอบ rate limit
            const promises = Array.from({ length: 10 }, () =>
                fetchWithRateLimitHandler('/api/data')
            );

            await Promise.all(promises);
            setData({ message: 'All requests completed successfully' });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto p-6">
            <h1 className="text-3xl font-bold mb-6 text-gray-800 dark:text-gray-100">
                ตัวอย่างการใช้งาน Rate Limit Handler
            </h1>

            <div className="space-y-4">
                {/* ปุ่มทดสอบต่างๆ */}
                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={fetchDataWithHandler}
                        disabled={loading}
                        className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Fetch with Handler
                    </button>

                    <button
                        onClick={fetchDataManual}
                        disabled={loading}
                        className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Fetch Manual Check
                    </button>

                    <button
                        onClick={testRateLimit}
                        disabled={loading}
                        className="px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Test Rate Limit (10 requests)
                    </button>
                </div>

                {/* แสดงสถานะ Loading */}
                {loading ? (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                        <div className="flex items-center gap-3">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                            <p className="text-blue-800 dark:text-blue-200 font-medium">
                                กำลังโหลดข้อมูล...
                            </p>
                        </div>
                    </div>
                ) : null}

                {/* แสดง Error */}
                {error ? (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                            <svg
                                className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                            </svg>
                            <div>
                                <p className="text-red-800 dark:text-red-200 font-semibold mb-1">
                                    เกิดข้อผิดพลาด
                                </p>
                                <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
                            </div>
                        </div>
                    </div>
                ) : null}

                {/* แสดงข้อมูล */}
                {data ? (
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                            <svg
                                className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                            </svg>
                            <div className="flex-1">
                                <p className="text-green-800 dark:text-green-200 font-semibold mb-2">
                                    สำเร็จ!
                                </p>
                                <pre className="text-green-700 dark:text-green-300 text-sm bg-white dark:bg-gray-800 rounded p-3 overflow-auto">
                                    {typeof data === 'string' ? data : JSON.stringify(data, null, 2)}
                                </pre>
                            </div>
                        </div>
                    </div>
                ) : null}

                {/* คำแนะนำ */}
                <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 mt-6">
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3">
                        📝 คำแนะนำการใช้งาน
                    </h2>
                    <ul className="space-y-2 text-gray-700 dark:text-gray-300 text-sm">
                        <li className="flex items-start gap-2">
                            <span className="text-blue-600 dark:text-blue-400 font-bold">1.</span>
                            <span>
                                ใช้ <code className="bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded">fetchWithRateLimitHandler</code> สำหรับการเรียก API ที่ต้องการจัดการ rate limit อัตโนมัติ
                            </span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-blue-600 dark:text-blue-400 font-bold">2.</span>
                            <span>
                                ถ้าได้รับ HTTP 429 (Too Many Requests) ระบบจะ redirect ไปหน้า <code className="bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded">/rate-limit</code> อัตโนมัติ
                            </span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-blue-600 dark:text-blue-400 font-bold">3.</span>
                            <span>
                                หน้า Rate Limit จะแสดง countdown timer 60 วินาที ก่อนที่จะสามารถลองใหม่ได้
                            </span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-blue-600 dark:text-blue-400 font-bold">4.</span>
                            <span>
                                ผู้ใช้สามารถกดปุ่ม "กลับหน้าหลัก" ได้ตลอดเวลา
                            </span>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default RateLimitExample;
