import React, { useState, useEffect } from 'react';

const BackToTop: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // ฟังก์ชันตรวจสอบระยะการเลื่อนหน้าจอ
    const toggleVisibility = () => {
      // ถ้าผู้ใช้เลื่อนหน้าจอลงมามากกว่า 300px ให้กำหนด state เป็น true เพื่อแสดงปุ่ม
      if (window.scrollY > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    // จำเป็นต้องผูก scroll event กับฟังก์ชันตรวจสอบ
    window.addEventListener('scroll', toggleVisibility);

    // อย่าลืมล้าง event listener เมื่อ component ถูกทำลาย ป้องกัน memory leaks
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  // เลื่อนกลับขึ้นบนสุดโดยใช้ smooth scrolling behavior เพื่อประสบการณ์ผู้ใช้ที่ดี
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  return (
    <button
      onClick={scrollToTop}
      aria-label="Back to top"
      // Floating Frap CTA - 56px circular button with whisper-soft layered shadow and active scale
      className={`fixed bottom-6 right-6 z-50 w-14 h-14 flex items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-700 hover:shadow-emerald-md active:scale-95 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 print:hidden ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'
      }`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
      </svg>
    </button>
  );
};

export default BackToTop;
