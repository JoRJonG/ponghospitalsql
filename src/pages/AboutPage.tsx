import { motion } from 'framer-motion'
import { NavLink, Routes, Route } from 'react-router-dom'
import InfographicPage from './InfographicPage'

function AboutContent() {
  return (
    <div className="space-y-8">
        {/* ประวัติองค์กร */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="card"
        >
          <div className="card-body">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-blue-600 text-xl">🏛️</span>
              <h2 className="text-xl font-bold text-gray-900">ประวัติองค์กร</h2>
            </div>
            <div className="prose max-w-none text-gray-700 leading-relaxed">
              <p>
                โรงพยาบาลปงเป็นโรงพยาบาลชุมชนขนาดเล็ก สังกัดสำนักงานสาธารณสุขจังหวัดพะเยา 
                ก่อตั้งขึ้นเพื่อให้บริการสุขภาพแก่ประชาชนในพื้นที่อำเภอปงและพื้นที่ใกล้เคียง 
                ด้วยพันธกิจในการส่งเสริม ป้องกัน รักษา และฟื้นฟูสุขภาพของประชาชน
              </p>
              <p className="mt-3">
                ตั้งอยู่เลขที่ 395 หมู่ 9 ตำบลนาปรัง อำเภอปง จังหวัดพะเยา 56140 
                พร้อมให้บริการด้วยทีมแพทย์ พยาบาล และบุคลากรทางการแพทย์ที่มีความเชี่ยวชาญ
              </p>
            </div>
          </div>
        </motion.section>

        {/* วิสัยทัศน์ */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          className="card bg-gradient-to-br from-blue-50 to-cyan-50"
        >
          <div className="card-body">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-blue-600 text-xl">👁️</span>
              <h2 className="text-xl font-bold text-gray-900">วิสัยทัศน์ (Vision)</h2>
            </div>
            <p className="text-gray-800 text-lg font-medium leading-relaxed">
              โรงพยาบาลปง จะเป็นโรงพยาบาลที่มีบริการดี มีผลลัพธ์เป็นเลิศ
            </p>
          </div>
        </motion.section>

        {/* พันธกิจ */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
          className="card"
        >
          <div className="card-body">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-blue-600 text-xl">🎯</span>
              <h2 className="text-xl font-bold text-gray-900">พันธกิจ (Mission)</h2>
            </div>
            <ul className="space-y-3 text-gray-700">
              <li className="flex items-start gap-3">
                <span className="text-green-600 mt-1">✅</span>
                <span>ให้บริการด้านสุขภาพแก่ประชาชนอย่างมีคุณภาพ ครอบคลุม 4 มิติ</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-600 mt-1">✅</span>
                <span>พัฒนาบริการสาธารณสุขอย่างเป็นองค์รวม ทั้งในและนอกเครือข่ายบริการสุขภาพ</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-600 mt-1">✅</span>
                <span>จัดระบบบริการด้วยเทคโนโลยีสารสนเทศที่ทันสมัยและมีประสิทธิภาพ</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-600 mt-1">✅</span>
                <span>ส่งเสริมให้บุคลากรมีสมรรถนะและสร้างวัฒนธรรรมองค์กร เน้นความรัก ความสามัคคี</span>
              </li>
            </ul>
          </div>
        </motion.section>

        {/* ค่านิยม */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
          className="card bg-gradient-to-br from-green-50 to-emerald-50"
        >
          <div className="card-body">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-red-600 text-xl">❤️</span>
              <h2 className="text-xl font-bold text-gray-900">ค่านิยมองค์กร (Core Values)</h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="font-semibold text-gray-900 mb-2">
                  <span className="text-pink-600 mr-2">👁️</span>
                  Visionary Humility Leadership
                </div>
                <p className="text-sm text-gray-600">ผู้นำมีวิสัยทัศน์ และอ่อนน้อมถ่อมตน</p>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="font-semibold text-gray-900 mb-2">
                  <span className="text-blue-600 mr-2">🎯</span>
                  Focus on Result
                </div>
                <p className="text-sm text-gray-600">มุ่งเน้นผลลัพธ์</p>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="font-semibold text-gray-900 mb-2">
                  <span className="text-green-600 mr-2">👥</span>
                  Patient Focus
                </div>
                <p className="text-sm text-gray-600">ยึดผู้ป่วยเป็นศูนย์กลาง</p>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="font-semibold text-gray-900 mb-2">
                  <span className="text-yellow-600 mr-2">�</span>
                  Management by Fact
                </div>
                <p className="text-sm text-gray-600">บริหารจัดการภายใต้ข้อเท็จจริง</p>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="font-semibold text-gray-900 mb-2">
                  <span className="text-purple-600 mr-2">🤝</span>
                  Teamwork
                </div>
                <p className="text-sm text-gray-600">การทำงานเป็นทีม</p>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="font-semibold text-gray-900 mb-2">
                  <span className="text-cyan-600 mr-2">📚</span>
                  Learning & Mastery
                </div>
                <p className="text-sm text-gray-600">องค์กรแห่งการเรียนรู้และมีความเป็นมืออาชีพ</p>
              </div>
            </div>
          </div>
        </motion.section>

        {/* ความสามารถเฉพาะ */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.25 }}
          className="card"
        >
          <div className="card-body">
            <div className="flex items-center gap-2 mb-4">
              <i className="fa-solid fa-star text-yellow-500 text-xl"></i>
              <h2 className="text-xl font-bold text-gray-900">ความสามารถเฉพาะขององค์กร</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <i className="fa-solid fa-stethoscope text-blue-600"></i>
                </div>
                <div>
                  <div className="font-semibold text-gray-900">บริการผู้ป่วยนอก (OPD)</div>
                  <p className="text-sm text-gray-600">บริการตรวจรักษาโรคทั่วไป พร้อมแพทย์ผู้เชี่ยวชาญ</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <i className="fa-solid fa-truck-medical text-red-600"></i>
                </div>
                <div>
                  <div className="font-semibold text-gray-900">ห้องฉุกเฉิน 24 ชั่วโมง</div>
                  <p className="text-sm text-gray-600">พร้อมให้บริการฉุกเฉินตลอด 24 ชั่วโมง</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <i className="fa-solid fa-bed-pulse text-green-600"></i>
                </div>
                <div>
                  <div className="font-semibold text-gray-900">ผู้ป่วยใน (IPD)</div>
                  <p className="text-sm text-gray-600">บริการดูแลผู้ป่วยระหว่างพักรักษาตัว</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <i className="fa-solid fa-vial text-purple-600"></i>
                </div>
                <div>
                  <div className="font-semibold text-gray-900">ห้องปฏิบัติการ</div>
                  <p className="text-sm text-gray-600">บริการตรวจวิเคราะห์ทางห้องปฏิบัติการ</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-cyan-100 flex items-center justify-center flex-shrink-0">
                  <i className="fa-solid fa-x-ray text-cyan-600"></i>
                </div>
                <div>
                  <div className="font-semibold text-gray-900">เอกซเรย์</div>
                  <p className="text-sm text-gray-600">บริการถ่ายภาพรังสีเพื่อการวินิจฉัย</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                  <i className="fa-solid fa-pills text-orange-600"></i>
                </div>
                <div>
                  <div className="font-semibold text-gray-900">ห้องยา</div>
                  <p className="text-sm text-gray-600">จ่ายยาครบครันตามมาตรฐาน</p>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* คุณลักษณะบุคลากร */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
          className="card bg-gradient-to-br from-purple-50 to-pink-50"
        >
          <div className="card-body">
            <div className="flex items-center gap-2 mb-4">
              <i className="fa-solid fa-user-doctor text-purple-600 text-xl"></i>
              <h2 className="text-xl font-bold text-gray-900">คุณลักษณะของบุคลากร</h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg p-4 text-center">
                <i className="fa-solid fa-graduation-cap text-blue-600 text-3xl mb-2"></i>
                <div className="font-semibold text-gray-900">มืออาชีพ</div>
                <p className="text-sm text-gray-600 mt-1">มีความรู้ความสามารถตามมาตรฐานวิชาชีพ</p>
              </div>
              <div className="bg-white rounded-lg p-4 text-center">
                <i className="fa-solid fa-hand-holding-heart text-pink-600 text-3xl mb-2"></i>
                <div className="font-semibold text-gray-900">จิตบริการ</div>
                <p className="text-sm text-gray-600 mt-1">ให้บริการด้วยความเมตตา เอาใจใส่</p>
              </div>
              <div className="bg-white rounded-lg p-4 text-center">
                <i className="fa-solid fa-clipboard-check text-green-600 text-3xl mb-2"></i>
                <div className="font-semibold text-gray-900">รับผิดชอบ</div>
                <p className="text-sm text-gray-600 mt-1">ทำงานด้วยความละเอียดรอบคอบ</p>
              </div>
              <div className="bg-white rounded-lg p-4 text-center">
                <i className="fa-solid fa-people-group text-orange-600 text-3xl mb-2"></i>
                <div className="font-semibold text-gray-900">ทำงานเป็นทีม</div>
                <p className="text-sm text-gray-600 mt-1">ประสานงานและช่วยเหลือซึ่งกันและกัน</p>
              </div>
              <div className="bg-white rounded-lg p-4 text-center">
                <i className="fa-solid fa-book-open text-purple-600 text-3xl mb-2"></i>
                <div className="font-semibold text-gray-900">เรียนรู้ตลอดเวลา</div>
                <p className="text-sm text-gray-600 mt-1">พัฒนาตนเองอย่างต่อเนื่อง</p>
              </div>
              <div className="bg-white rounded-lg p-4 text-center">
                <i className="fa-solid fa-scale-balanced text-cyan-600 text-3xl mb-2"></i>
                <div className="font-semibold text-gray-900">ซื่อสัตย์ โปร่งใส</div>
                <p className="text-sm text-gray-600 mt-1">ยึดมั่นในจริยธรรมและความถูกต้อง</p>
              </div>
            </div>
          </div>
        </motion.section>

        {/* นโยบายหน่วยงาน */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.35 }}
          className="card border-2 border-blue-200"
        >
          <div className="card-body">
            <div className="flex items-center gap-2 mb-4">
              <i className="fa-solid fa-scroll text-blue-600 text-xl"></i>
              <h2 className="text-xl font-bold text-gray-900">นโยบายหน่วยงาน</h2>
            </div>
            <div className="bg-blue-50 rounded-lg p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0 font-bold">1</div>
                <div>
                  <div className="font-semibold text-gray-900 mb-1">ประชาชนได้รับการดูแลสุขภาพแบบบูรณาการ</div>
                  <p className="text-gray-700">ภายใต้การมีส่วนร่วมในการสร้างเสริมพฤติกรรม</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0 font-bold">2</div>
                <div>
                  <div className="font-semibold text-gray-900 mb-1">ผู้รับบริการได้รับบริการสุขภาพที่มีมาตรฐาน</div>
                  <p className="text-gray-700">และมีความปลอดภัย</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0 font-bold">3</div>
                <div>
                  <div className="font-semibold text-gray-900 mb-1">ผู้รับบริการมีความพึงพอใจต่อระบบบริการสุขภาพ</div>
                  <p className="text-gray-700"></p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0 font-bold">4</div>
                <div>
                  <div className="font-semibold text-gray-900 mb-1">มีการบริหารองค์ความรู้ และพัฒนาบุคลากร</div>
                  <p className="text-gray-700">มีสมรรถนะเหมาะสมในการปฏิบัติงาน</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0 font-bold">5</div>
                <div>
                  <div className="font-semibold text-gray-900 mb-1">การจัดการกำลังคนมีประสิทธิภาพ</div>
                  <p className="text-gray-700"></p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0 font-bold">6</div>
                <div>
                  <div className="font-semibold text-gray-900 mb-1">โรงพยาบาลที่บริหารจัดการด้วยระบบธรรมาภิบาล</div>
                  <p className="text-gray-700">พัฒนาระบบควบคุมภายในและบริหาร</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0 font-bold">7</div>
                <div>
                  <div className="font-semibold text-gray-900 mb-1">เพิ่มประสิทธิภาพด้านการจัดการเทคโนโลยีและสารสนเทศ</div>
                  <p className="text-gray-700"></p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0 font-bold">8</div>
                <div>
                  <div className="font-semibold text-gray-900 mb-1">การจัดสรรและบริหารจัดการทรัพยากร</div>
                  <p className="text-gray-700"></p>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* ยุทธศาสตร์ของหน่วยงาน */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
          className="card border-2 border-green-200"
        >
          <div className="card-body">
            <div className="flex items-center gap-2 mb-4">
              <i className="fa-solid fa-target text-green-600 text-xl"></i>
              <h2 className="text-xl font-bold text-gray-900">ยุทธศาสตร์ของหน่วยงาน</h2>
            </div>
            <div className="bg-green-50 rounded-lg p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center flex-shrink-0 font-bold">1</div>
                <div>
                  <div className="font-semibold text-gray-900 mb-1">พัฒนาความเป็นเลิศด้านการส่งเสริมสุขภาพและป้องกันโรค</div>
                  <p className="text-gray-700"></p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center flex-shrink-0 font-bold">2</div>
                <div>
                  <div className="font-semibold text-gray-900 mb-1">พัฒนาระบบบริการสุขภาพให้มีคุณภาพมาตรฐานและเป็นที่ยอมรับ</div>
                  <p className="text-gray-700"></p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center flex-shrink-0 font-bold">3</div>
                <div>
                  <div className="font-semibold text-gray-900 mb-1">ส่งเสริมความเป็นเลิศในการจัดการกำลังคนที่มีประสิทธิภาพ</div>
                  <p className="text-gray-700">และเสริมสร้างสุขภาวการณ์ทำงานที่เหมาะสม</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center flex-shrink-0 font-bold">4</div>
                <div>
                  <div className="font-semibold text-gray-900 mb-1">เสริมสร้างความเป็นเลิศด้านธรรมาภิบาลการพัฒนาและสนับสนุนระบบบริการ</div>
                  <p className="text-gray-700"></p>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* นโยบายผู้บริหาร */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.45 }}
          className="card border-2 border-purple-200"
        >
          <div className="card-body">
            <div className="flex items-center gap-2 mb-4">
              <i className="fa-solid fa-user-tie text-purple-600 text-xl"></i>
              <h2 className="text-xl font-bold text-gray-900">นโยบายผู้บริหาร</h2>
            </div>
            <div className="bg-purple-50 rounded-lg p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center flex-shrink-0 font-bold">1</div>
                <div>
                  <div className="font-semibold text-gray-900 mb-1">พัฒนาคุณภาพบริการให้ได้มาตรฐานในระบบ HA</div>
                  <p className="text-gray-700">โดยเน้นความปลอดภัย 2 P Safety ทั้งผู้รับบริการและผู้ให้บริการ มีความปลอดภัย และพึงพอใจ</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center flex-shrink-0 font-bold">2</div>
                <div>
                  <div className="font-semibold text-gray-900 mb-1">บริหารงานด้วยความโปร่งใส ใช้หลักธรรมาภิบาล</div>
                  <p className="text-gray-700">โดยนำระบบ ITA มาใช้ให้เกิดผลสำเร็จเป็นรูปธรรมในองค์กร</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center flex-shrink-0 font-bold">3</div>
                <div>
                  <div className="font-semibold text-gray-900 mb-1">พัฒนาโรงพยาบาลให้ก้าวสู่ Smart hospital อย่างเป็นระบบ</div>
                  <p className="text-gray-700"></p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center flex-shrink-0 font-bold">4</div>
                <div>
                  <div className="font-semibold text-gray-900 mb-1">นำหลักปรัชญาเศรษฐกิจพอเพียงมาใช้ในการทำงาน</div>
                  <p className="text-gray-700"></p>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Contact CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center py-8"
        >
          <p className="text-gray-600 mb-4">ต้องการข้อมูลเพิ่มเติมหรือติดต่อสอบถาม?</p>
          <a href="/contact" className="btn btn-primary">
            <i className="fa-solid fa-phone mr-2"></i>
            ติดต่อเรา
          </a>
        </motion.div>
      </div>
  )
}

export default function AboutPage() {
  return (
    <div className="container-narrow py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="mb-6"
      >
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">เกี่ยวกับเรา</h1>
        <p className="mt-2 text-gray-600">โรงพยาบาลปง อำเภอปง จังหวัดพะเยา</p>
      </motion.div>

      {/* Sub Navigation */}
      <div className="mb-6">
        <div className="relative rounded-2xl border border-gray-200 bg-white/80 backdrop-blur-sm shadow-sm">
          <div className="flex flex-wrap gap-2 px-3 py-3 text-sm">
            <NavLink
              to="/about"
              end
              className={({ isActive }) =>
                `inline-flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                  isActive
                    ? 'bg-green-600 text-white shadow'
                    : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                }`
              }
            >
              <i className="fa-solid fa-info-circle" aria-hidden="true" />
              ข้อมูลทั่วไป
            </NavLink>
            <NavLink
              to="/about/infographic"
              className={({ isActive }) =>
                `inline-flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                  isActive
                    ? 'bg-green-600 text-white shadow'
                    : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                }`
              }
            >
              <i className="fa-solid fa-chart-bar" aria-hidden="true" />
              Infographic
            </NavLink>
          </div>
        </div>
      </div>

      {/* Routes */}
      <Routes>
        <Route index element={<AboutContent />} />
        <Route path="infographic" element={<InfographicPage />} />
      </Routes>
    </div>
  )
}
