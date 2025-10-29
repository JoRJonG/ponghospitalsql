import logo from '../assets/logo-150x150.png'
import VisitorCounter from './VisitorCounter'

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-gray-200/60 bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container-professional py-12 lg:py-16">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {/* Hospital Info */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <img
                src={logo}
                alt="Pong Hospital logo"
                className="h-12 w-12 rounded-lg"
              />
              <div>
                <h3 className="font-bold text-xl text-gray-800">โรงพยาบาลปง</h3>
                <p className="text-sm text-gray-500">Pong Hospital</p>
              </div>
            </div>
            <p className="text-gray-600 mb-6 leading-relaxed max-w-md">
              ให้บริการสุขภาพแก่ประชาชนในพื้นที่อำเภอปงและพื้นที่ใกล้เคียง ด้วยความมุ่งมั่นและเอื้ออาทร ด้วยทีมแพทย์และบุคลากรทางการแพทย์ที่มีความเชี่ยวชาญและพร้อมให้บริการ
            </p>
            <div className="flex gap-4">
              <a
                href="https://www.facebook.com/profile.php?id=100095603284237"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="w-10 h-10 bg-blue-600 text-white rounded-lg flex items-center justify-center hover:bg-blue-700 transition-colors duration-200 hover-lift"
              >
                <i className="fa-brands fa-facebook-f text-sm"></i>
              </a>
              <a
                href="#"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Line"
                className="w-10 h-10 bg-green-500 text-white rounded-lg flex items-center justify-center hover:bg-green-600 transition-colors duration-200 hover-lift"
              >
                <i className="fa-brands fa-line text-sm"></i>
              </a>
              <a
                href="#"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="YouTube"
                className="w-10 h-10 bg-red-600 text-white rounded-lg flex items-center justify-center hover:bg-red-700 transition-colors duration-200 hover-lift"
              >
                <i className="fa-brands fa-youtube text-sm"></i>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <i className="fa-solid fa-link text-green-600 text-sm"></i>
              ลิงก์ด่วน
            </h4>
            <ul className="space-y-3">
              <li>
                <a href="/" className="text-gray-600 hover:text-green-600 transition-colors duration-200 flex items-center gap-2">
                  <i className="fa-solid fa-home text-xs"></i>
                  หน้าหลัก
                </a>
              </li>
              <li>
                <a href="/announcements" className="text-gray-600 hover:text-green-600 transition-colors duration-200 flex items-center gap-2">
                  <i className="fa-solid fa-bullhorn text-xs"></i>
                  ประกาศ
                </a>
              </li>
              <li>
                <a href="/executives" className="text-gray-600 hover:text-green-600 transition-colors duration-200 flex items-center gap-2">
                  <i className="fa-solid fa-user-tie text-xs"></i>
                  ผู้บริหาร
                </a>
              </li>
              <li>
                <a href="/contact" className="text-gray-600 hover:text-green-600 transition-colors duration-200 flex items-center gap-2">
                  <i className="fa-solid fa-phone text-xs"></i>
                  ติดต่อเรา
                </a>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <i className="fa-solid fa-address-book text-blue-600 text-sm"></i>
              ติดต่อเรา
            </h4>
            <div className="space-y-3 text-gray-600">
              <div className="flex items-start gap-2">
                <i className="fa-solid fa-map-marker-alt text-green-600 mt-1 text-xs"></i>
                <div className="text-sm">
                  <p>395 ม.9 ต.นาปรัง</p>
                  <p>อ.ปง จ.พะเยา 56140</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-phone text-blue-600 text-xs"></i>
                <span className="text-sm">054-497030</span>
              </div>
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-fax text-purple-600 text-xs"></i>
                <span className="text-sm">054-497289</span>
              </div>
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-envelope text-red-600 text-xs"></i>
                <span className="text-sm">ponghospital@gmail.com</span>
              </div>
            </div>
          </div>
        </div>

        {/* Visitor Counter */}
        <div className="border-t border-gray-200/60 mt-8 pt-8">
          <VisitorCounter />
        </div>

        <div className="border-t border-gray-200/60 mt-8 pt-8 text-center">
          <p className="text-gray-500 text-sm">
            © {new Date().getFullYear()} โรงพยาบาลปง. สงวนลิขสิทธิ์.
          </p>
          <p className="text-gray-400 text-xs mt-2">
            ให้บริการสุขภาพด้วยความมุ่งมั่นและเอื้ออาทร
          </p>
        </div>
      </div>
    </footer>
  )
}
