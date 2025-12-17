import { motion } from 'framer-motion'

export default function ContactPage() {
  // Easily editable contact details
  const phoneMain = '054-497030'
  const phoneFax = '054-497289'
  const phoneEmergency = '054-497030' // 24/7 ER line
  const emailMain = 'ponghospital@gmail.com'
  const address = '395 ม.9 ต.นาปรัง อ.ปง จ.พะเยา 56140'
  const mapsSearch = 'https://www.google.com/maps/search/?api=1&query=%E0%B9%82%E0%B8%A3%E0%B8%87%E0%B8%9E%E0%B8%A2%E0%B8%B2%E0%B8%9A%E0%B8%B2%E0%B8%A5%E0%B8%9B%E0%B8%87'
  const mapsEmbed = 'https://www.google.com/maps?q=%E0%B9%82%E0%B8%A3%E0%B8%87%E0%B8%9E%E0%B8%A2%E0%B8%B2%E0%B8%9A%E0%B8%B2%E0%B8%A5%E0%B8%9B%E0%B8%87&output=embed'

  return (
    <div className="container-narrow py-10">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">ติดต่อเรา</h1>
        <p className="mt-2 text-gray-600">สอบถามข้อมูล นัดหมายบริการ ตรวจสอบสิทธิผู้ป่วย และข้อเสนอแนะ ทีมงานยินดีให้บริการด้วยความมืออาชีพ</p>
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left: Contact & Channels */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          className="space-y-6"
        >
          {/* Emergency / Call Center Card */}
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-lg bg-white text-emerald-600 flex items-center justify-center ring-1 ring-emerald-200">
                <span className="text-xl" aria-hidden>📞</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-end gap-2">
                  <h2 className="text-lg font-semibold text-gray-900">ศูนย์บริการข้อมูล</h2>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-white ring-1 ring-emerald-200 text-emerald-700">บริการด้วยใจ</span>
                </div>
                <p className="mt-1 text-gray-700">สอบถามข้อมูลทั่วไป นัดหมาย ตรวจสอบสิทธิ และข้อเสนอแนะ</p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <a href={`tel:${phoneMain}`} className="btn btn-primary" aria-label="โทรหาโรงพยาบาล">
                    <span>📞</span> โทร {phoneMain}
                  </a>
                  <a href={mapsSearch} target="_blank" rel="noopener noreferrer" className="btn btn-outline" aria-label="เปิดแผนที่ Google Maps">
                    <span>📍</span> เส้นทาง
                  </a>
                  <a href={`mailto:${emailMain}`} className="btn btn-outline" aria-label="ส่งอีเมลหาโรงพยาบาล">
                    <span>✉️</span> อีเมล
                  </a>
                </div>
                <div className="mt-4 grid sm:grid-cols-2 gap-3">
                  <div className="rounded-lg bg-white ring-1 ring-emerald-100 p-3">
                    <div className="text-xs text-gray-600">ห้องฉุกเฉิน</div>
                    <div className="mt-1 font-semibold text-gray-900 flex items-center gap-2"><span className="text-rose-600" aria-hidden>🚑</span> 24 ชั่วโมง</div>
                    <div className="text-sm text-gray-700 mt-1">โทร {phoneEmergency}</div>
                  </div>
                  <div className="rounded-lg bg-white ring-1 ring-emerald-100 p-3">
                    <div className="text-xs text-gray-600">เวลาทำการ (OPD)</div>
                    <div className="mt-1 font-semibold text-gray-900 flex items-center gap-2"><span aria-hidden>🕒</span> จันทร์–ศุกร์</div>
                    <div className="text-sm text-gray-700 mt-1">08:00–16:00</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Official Contact Details */}
          <div className="bg-white/80 backdrop-blur-sm border border-gray-100 rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900">ข้อมูลติดต่ออย่างเป็นทางการ</h2>
            <div className="mt-4 space-y-4 text-gray-700">
              <div className="flex items-start gap-3">
                <i className="fa-solid fa-location-dot mt-1.5 text-gray-600" aria-hidden />
                <div>
                  <div className="font-medium">ที่อยู่</div>
                  <p>{address}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <i className="fa-solid fa-phone mt-1.5 text-gray-600" aria-hidden />
                <div>
                  <div className="font-medium">โทรศัพท์</div>
                  <a href={`tel:${phoneMain}`} className="text-gray-900 hover:underline">{phoneMain}</a>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <i className="fa-solid fa-fax mt-1.5 text-gray-600" aria-hidden />
                <div>
                  <div className="font-medium">โทรสาร</div>
                  <a href={`tel:${phoneFax}`} className="text-gray-900">{phoneFax}</a>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <i className="fa-regular fa-envelope mt-1.5 text-gray-600" aria-hidden />
                <div>
                  <div className="font-medium">อีเมล</div>
                  <a href={`mailto:${emailMain}`} className="text-gray-900 hover:underline">{emailMain}</a>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <i className="fa-regular fa-clock mt-1.5 text-gray-600" aria-hidden />
                <div>
                  <div className="font-medium">เวลาทำการ</div>
                  <p>จันทร์–ศุกร์ 08:00–16:00 <span className="text-gray-500">(ห้องฉุกเฉิน 24 ชม.)</span></p>
                </div>
              </div>
            </div>

            <div className="mt-5">
              <div className="text-sm text-gray-600 mb-2">ช่องทางออนไลน์</div>
              <div className="flex flex-wrap gap-3">
                <a href="https://www.facebook.com/profile.php?id=100095603284237" target="_blank" rel="noopener noreferrer" className="btn btn-outline" aria-label="Facebook โรงพยาบาล"><i className="fa-brands fa-facebook text-[#1877F2]" /> Facebook</a>
                <a href="#" className="btn btn-outline" aria-label="Line โรงพยาบาล"><i className="fa-brands fa-line text-[#06C755]" /> Line</a>
                <a href="#" className="btn btn-outline" aria-label="YouTube โรงพยาบาล"><i className="fa-brands fa-youtube text-[#FF0000]" /> YouTube</a>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Right: Map */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
          className="bg-white/80 backdrop-blur-sm border border-gray-100 rounded-xl shadow-sm p-3 md:p-4"
        >
          <div className="aspect-video w-full rounded-lg overflow-hidden ring-1 ring-gray-200">
            <iframe
              title="แผนที่โรงพยาบาลปง"
              src={mapsEmbed}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
              className="w-full h-full border-0"
            />
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="text-sm text-gray-700 flex items-center gap-2"><i className="fa-solid fa-location-dot text-blue-700" aria-hidden /> {address}</div>
            <a
              href={mapsSearch}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline"
            >
              เปิดใน Google Maps
            </a>
          </div>
        </motion.section>
      </div>

      {/* Contact form removed per request */}
    </div>
  )
}
