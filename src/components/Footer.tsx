import logo from '../assets/logo-150x150.png'
import { Link } from 'react-router-dom'
import VisitorCounter from './VisitorCounter'

export default function Footer() {
  return (
    <>
      {/* Visitor Counter Section */}
      <section className="py-8 bg-emerald-600 bg-pattern-professional border-t border-emerald-500 text-white shadow-inner">
        <div className="container mx-auto px-4">
          <VisitorCounter />
        </div>
      </section>

      {/* Main Footer */}
      <footer className="bg-white border-t border-slate-200 pt-16 pb-8">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">

            {/* Hospital Info */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                {/* เพิ่ม alt text ที่ดีขึ้นสำหรับ SEO */}
                <img src={logo} alt="โลโก้โรงพยาบาลปง จังหวัดพะเยา" className="w-12 h-12" />
                <span className="text-lg font-bold text-slate-800">โรงพยาบาลปง</span>
              </div>
              <p className="text-slate-600 text-sm leading-relaxed font-medium">
                มุ่งมั่นพัฒนาบริการสุขภาพที่มีคุณภาพ เพื่อประชาชนในอำเภอปงและพื้นที่ใกล้เคียง ด้วยทีมแพทย์และบุคลากรมืออาชีพ
              </p>
              <div className="flex gap-4 pt-2">
                <a href="https://www.facebook.com/profile.php?id=100095603284237" target="_blank" rel="noopener noreferrer" aria-label="Facebook โรงพยาบาลปง" className="text-blue-600 hover:text-blue-700 transition-all duration-300 hover:scale-110 hover-glow">
                  <i className="fa-brands fa-facebook fa-xl"></i>
                </a>
                {/* ลบ dead links (href="#") สำหรับ Line และ YouTube ออก — ไม่มี URL จริงให้ใช้ */}
              </div>
            </div>

            {/* Site Map */}
            <div>
              <h4 className="font-bold text-slate-800 mb-6">แผนผังเว็บไซต์</h4>
              <ul className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm text-slate-600 font-medium">
                <li><Link to="/" className="hover:text-emerald-500 transition flex items-center gap-2"><i className="fa-solid fa-angle-right text-xs text-emerald-500"></i> หน้าหลัก</Link></li>
                <li><Link to="/about" className="hover:text-emerald-500 transition flex items-center gap-2"><i className="fa-solid fa-angle-right text-xs text-emerald-500"></i> เกี่ยวกับเรา</Link></li>
                <li><Link to="/management" className="hover:text-emerald-500 transition flex items-center gap-2"><i className="fa-solid fa-angle-right text-xs text-emerald-500"></i> คณะผู้บริหาร</Link></li>
                <li><Link to="/announcements" className="hover:text-emerald-500 transition flex items-center gap-2"><i className="fa-solid fa-angle-right text-xs text-emerald-500"></i> ข่าวสาร/ประกาศ</Link></li>
                <li><Link to="/activities" className="hover:text-emerald-500 transition flex items-center gap-2"><i className="fa-solid fa-angle-right text-xs text-emerald-500"></i> กิจกรรม</Link></li>
                <li><Link to="/pr-posters" className="hover:text-emerald-500 transition flex items-center gap-2"><i className="fa-solid fa-angle-right text-xs text-emerald-500"></i> โปสเตอร์ประชาสัมพันธ์</Link></li>
                <li><Link to="/documents" className="hover:text-emerald-500 transition flex items-center gap-2"><i className="fa-solid fa-angle-right text-xs text-emerald-500"></i> ดาวน์โหลดเอกสาร</Link></li>
                <li><Link to="/ita" className="hover:text-emerald-500 transition flex items-center gap-2"><i className="fa-solid fa-angle-right text-xs text-emerald-500"></i> ITA</Link></li>
                <li><Link to="/contact" className="hover:text-emerald-500 transition flex items-center gap-2"><i className="fa-solid fa-angle-right text-xs text-emerald-500"></i> ติดต่อเรา</Link></li>
              </ul>
            </div>

            {/* Contact Info */}
            <div>
              <h4 className="font-bold text-slate-800 mb-6">ข้อมูลติดต่อ</h4>
              <ul className="space-y-4 text-sm text-slate-600 font-medium">
                <li className="flex gap-3">
                  <i className="fa-solid fa-location-dot text-red-500 mt-1"></i>
                  <span>395 หมู่ 9 ตำบลนาปรัง อำเภอปง <br />จังหวัดพะเยา 56140</span>
                </li>
                <li className="flex gap-3">
                  <i className="fa-solid fa-phone text-emerald-500 mt-1"></i>
                  <span>โทรศัพท์: 054-497030 <br />แฟกซ์: 054-497289</span>
                </li>
                <li className="flex gap-3">
                  <i className="fa-solid fa-envelope text-blue-500 mt-1"></i>
                  <span>ponghospital@gmail.com</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-8 text-center text-xs text-slate-500 font-medium">
            <p>&copy; {new Date().getFullYear()} Pong Hospital All rights reserved.</p>
          </div>
        </div>
      </footer>
    </>
  )
}
