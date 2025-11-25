import logo from '../assets/logo-150x150.png'
import VisitorCounter from './VisitorCounter'

export default function Footer() {
  return (
    <>
      {/* Visitor Counter Section */}
      <section className="py-8 bg-slate-900 border-t border-slate-800">
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
                <div className="w-10 h-10 bg-emerald-700 rounded text-white flex items-center justify-center shadow-md">
                  <img src={logo} alt="Logo" className="w-8 h-8 rounded" />
                </div>
                <span className="text-lg font-bold text-slate-800">โรงพยาบาลปง</span>
              </div>
              <p className="text-slate-500 text-sm leading-relaxed">
                มุ่งมั่นพัฒนาบริการสุขภาพที่มีคุณภาพ เพื่อประชาชนในอำเภอปงและพื้นที่ใกล้เคียง ด้วยทีมแพทย์และบุคลากรมืออาชีพ
              </p>
              <div className="flex gap-4 pt-2">
                <a href="https://www.facebook.com/profile.php?id=100095603284237" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-blue-600 transition">
                  <i className="fa-brands fa-facebook fa-lg"></i>
                </a>
                <a href="#" className="text-slate-400 hover:text-emerald-500 transition">
                  <i className="fa-brands fa-line fa-lg"></i>
                </a>
                <a href="#" className="text-slate-400 hover:text-red-500 transition">
                  <i className="fa-brands fa-youtube fa-lg"></i>
                </a>
              </div>
            </div>

            {/* Site Map */}
            <div>
              <h4 className="font-bold text-slate-800 mb-6">แผนผังเว็บไซต์</h4>
              <ul className="space-y-3 text-sm text-slate-500">
                <li><a href="/" className="hover:text-emerald-600 transition flex items-center gap-2"><i className="fa-solid fa-angle-right text-xs"></i> หน้าหลัก</a></li>
                <li><a href="/about" className="hover:text-emerald-600 transition flex items-center gap-2"><i className="fa-solid fa-angle-right text-xs"></i> เกี่ยวกับเรา</a></li>
                <li><a href="/executives" className="hover:text-emerald-600 transition flex items-center gap-2"><i className="fa-solid fa-angle-right text-xs"></i> คณะผู้บริหาร</a></li>
                <li><a href="/announcements" className="hover:text-emerald-600 transition flex items-center gap-2"><i className="fa-solid fa-angle-right text-xs"></i> ข่าวสาร/ประกาศ</a></li>
                <li><a href="/contact" className="hover:text-emerald-600 transition flex items-center gap-2"><i className="fa-solid fa-angle-right text-xs"></i> ติดต่อเรา</a></li>
              </ul>
            </div>

            {/* Contact Info */}
            <div>
              <h4 className="font-bold text-slate-800 mb-6">ข้อมูลติดต่อ</h4>
              <ul className="space-y-4 text-sm text-slate-500">
                <li className="flex gap-3">
                  <i className="fa-solid fa-location-dot text-emerald-600 mt-1"></i>
                  <span>395 หมู่ 9 ตำบลนาปรัง อำเภอปง <br />จังหวัดพะเยา 56140</span>
                </li>
                <li className="flex gap-3">
                  <i className="fa-solid fa-phone text-emerald-600 mt-1"></i>
                  <span>โทรศัพท์: 054-497030 <br />แฟกซ์: 054-497289</span>
                </li>
                <li className="flex gap-3">
                  <i className="fa-solid fa-envelope text-emerald-600 mt-1"></i>
                  <span>ponghospital@gmail.com</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-8 text-center text-xs text-slate-400">
            <p>&copy; {new Date().getFullYear()} Pong Hospital, Phayao. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </>
  )
}
