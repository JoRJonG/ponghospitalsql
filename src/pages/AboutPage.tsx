import { motion } from 'framer-motion'
import { Routes, Route } from 'react-router-dom'
import InfographicPage from './InfographicPage'
import OrganizationChartPage from './OrganizationChartPage'
import PRPlanPage from './PRPlanPage'
import DocumentCategoryView from '../components/DocumentCategoryView'
import SEO from '../components/SEO'
import PageHeader from '../components/PageHeader'

function AboutContent() {
  return (
    <div className="space-y-12 pb-12">
      {/* Header Section with Particles/Gradient */}
      <div
        className="relative rounded-3xl overflow-hidden text-white shadow-xl shadow-emerald-900/20 border border-emerald-500/30"
        style={{ background: 'linear-gradient(135deg, #059669 0%, #0d9488 100%)' }}
      >
        <div className="absolute top-0 right-0 p-12 opacity-10">
          <i className="fa-solid fa-hospital text-9xl transform rotate-12 text-white"></i>
        </div>
        <div className="relative z-10 p-8 md:p-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >

            <h1 className="text-3xl md:text-5xl font-bold mb-6 leading-tight text-white drop-shadow-sm">
              โรงพยาบาลปง
              <span className="block text-emerald-100 text-xl md:text-2xl font-normal mt-2">
                Pong Hospital
              </span>
            </h1>
            <div className="prose prose-lg text-emerald-50 max-w-3xl leading-relaxed opacity-95 font-medium">
              <p>
                ประวัติความเป็นมาและการเติบโตของโรงพยาบาลปง
                โรงพยาบาลปงมีการพัฒนาอย่างต่อเนื่องจากสถานีอนามัยเล็ก ๆ จนก้าวสู่การเป็นโรงพยาบาลชุมชนที่ทันสมัย
              </p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* History Timeline */}
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="max-w-4xl mx-auto px-4"
      >
        <div className="relative border-l-4 border-emerald-200 ml-4 md:ml-6 space-y-8 py-4">
          {[
            { year: "พ.ศ. 2502", title: "สถานีอนามัยระดับอำเภอ", desc: "ก่อตั้งครั้งแรก" },
            { year: "พ.ศ. 2510", title: "สถานีอนามัยชั้น 1", desc: "ยกระดับการให้บริการ" },
            { year: "พ.ศ. 2517", title: "ศูนย์การแพทย์และอนามัย", desc: "เปลี่ยนสถานะเพื่อรองรับความต้องการ" },
            { year: "พ.ศ. 2520", title: "โรงพยาบาลขนาด 10 เตียง", desc: "ยกระดับสู่โรงพยาบาลชุมชน" },
            { year: "พ.ศ. 2536 - ปัจจุบัน", title: "โรงพยาบาลขนาด 30 เตียง", desc: "พัฒนาคุณภาพบริการอย่างต่อเนื่อง" },
          ].map((item, index) => (
            <div key={index} className="relative pl-8 md:pl-12">
              <div className="absolute -left-[10px] md:-left-[14px] top-1 w-6 h-6 rounded-full bg-emerald-500 border-4 border-white shadow-md"></div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-50 hover:shadow-md transition-shadow">
                <span className="inline-block px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-sm font-bold mb-2">
                  {item.year}
                </span>
                <h3 className="text-xl font-bold text-gray-900 mb-1">{item.title}</h3>
                <p className="text-gray-600">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.section>

      {/* Vision & Mission Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Vision */}
        <motion.section
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="group relative overflow-hidden rounded-2xl bg-white p-8 shadow-sm hover:shadow-md transition-all border border-emerald-100"
        >
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <i className="fa-solid fa-eye text-8xl text-emerald-600"></i>
          </div>
          <div className="relative z-10">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 mb-6 group-hover:scale-110 transition-transform duration-300">
              <i className="fa-solid fa-eye text-xl"></i>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">วิสัยทัศน์ (Vision)</h2>
            <p className="text-gray-600 text-lg leading-relaxed">
              "โรงพยาบาลปง จะเป็นโรงพยาบาลที่มีบริการดี มีผลลัพธ์เป็นเลิศ"
            </p>
          </div>
        </motion.section>

        {/* Mission */}
        <motion.section
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="group relative overflow-hidden rounded-2xl bg-white p-8 shadow-sm hover:shadow-md transition-all border border-emerald-100"
        >
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <i className="fa-solid fa-bullseye text-8xl text-teal-600"></i>
          </div>
          <div className="relative z-10">
            <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center text-teal-600 mb-6 group-hover:scale-110 transition-transform duration-300">
              <i className="fa-solid fa-bullseye text-xl"></i>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">พันธกิจ (Mission)</h2>
            <ul className="space-y-3">
              {[
                "ให้บริการด้านสุขภาพแก่ประชาชนอย่างมีคุณภาพ",
                "พัฒนาบริการสาธารณสุขอย่างเป็นองค์รวมทั้งในและนอกเครือข่ายบริการสุขภาพ",
                "จัดระบบบริการด้วยเทคโนโลยีสารสนเทศที่ทันสมัยและมีประสิทธิภาพ",
                "ส่งเสริมให้บุคลากรมีสมรรถนะและสร้างวัฒนธรรมองค์กร เน้นความรัก ความสามัคคี"
              ].map((item, idx) => (
                <li key={idx} className="flex items-start gap-3 text-gray-600">
                  <i className="fa-solid fa-check-circle text-teal-500 mt-1 shrink-0"></i>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </motion.section>
      </div>

      {/* Core Values */}
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <div className="text-center mb-10">
          <span className="text-emerald-600 font-semibold tracking-wider uppercase text-sm">Core Values</span>
          <h2 className="text-3xl font-bold text-gray-900 mt-2">ค่านิยมองค์กร</h2>
          <div className="w-20 h-1 bg-emerald-500 mx-auto mt-4 rounded-full"></div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              icon: "fa-eye",
              title: "Visionary Humility Leadership",
              desc: "ผู้นำมีวิสัยทัศน์ และอ่อนน้อมถ่อมตน",
              color: "text-emerald-600",
              bg: "bg-emerald-50"
            },
            {
              icon: "fa-bullseye",
              title: "Focus on Result",
              desc: "มุ่งเน้นผลลัพธ์",
              color: "text-teal-600",
              bg: "bg-teal-50"
            },
            {
              icon: "fa-hospital-user",
              title: "Patient Focus",
              desc: "ยึดผู้ป่วยเป็นศูนย์กลาง",
              color: "text-cyan-600",
              bg: "bg-cyan-50"
            },
            {
              icon: "fa-scale-balanced",
              title: "Management by Fact",
              desc: "บริหารจัดการภายใต้ข้อเท็จจริง",
              color: "text-blue-600",
              bg: "bg-blue-50"
            },
            {
              icon: "fa-users",
              title: "Teamwork",
              desc: "การทำงานเป็นทีม",
              color: "text-indigo-600",
              bg: "bg-indigo-50"
            },
            {
              icon: "fa-book-open-reader",
              title: "Learning & Mastery",
              desc: "องค์กรแห่งการเรียนรู้และมีความเป็นมืออาชีพ",
              color: "text-violet-600",
              bg: "bg-violet-50"
            }
          ].map((item, idx) => (
            <div key={idx} className="group bg-white rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 hover:border-emerald-100 relative overflow-hidden">
              <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full opacity-10 transition-transform group-hover:scale-150 ${item.bg.replace('bg-', 'bg-')}`}></div>
              <div className={`w-14 h-14 rounded-2xl ${item.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                <i className={`fa-solid ${item.icon} text-2xl ${item.color}`}></i>
              </div>
              <h3 className="font-bold text-gray-900 mb-2">{item.title}</h3>
              <p className="text-gray-600 text-sm">{item.desc}</p>
            </div>
          ))}
        </div>
      </motion.section>

      {/* Service Characteristics (คุณลักษณะของบริการ) */}
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="bg-gradient-to-br from-gray-50 to-emerald-50/30 rounded-3xl p-8 md:p-12 border border-emerald-100/50"
      >
        <div className="flex flex-col md:flex-row gap-12 items-start">
          <div className="md:w-1/3">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">คุณลักษณะของบริการ</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              มุ่งมั่นให้บริการสุขภาพที่ครอบคลุมและมีคุณภาพ เพื่อสุขภาวะที่ดีของประชาชนในพื้นที่และใกล้เคียง
            </p>
            <div className="hidden md:block text-center">
              <div className="inline-flex p-4 rounded-full bg-emerald-100 text-emerald-600 mb-4">
                <i className="fa-solid fa-heart-pulse text-6xl"></i>
              </div>
            </div>
          </div>
          <div className="md:w-2/3 grid sm:grid-cols-2 gap-6">
            {[
              {
                icon: "fa-hand-holding-heart",
                label: "ส่งเสริม (Promotion)",
                desc: "ส่งเสริมสุขภาพประชาชนทุกกลุ่มวัยตามทิศทางนโยบายกระทรวงสาธารณสุขและบริบทของพื้นที่"
              },
              {
                icon: "fa-shield-virus",
                label: "ป้องกัน (Prevention)",
                desc: "ป้องกันโรคติดเชื้อ โรคไร้เชื้อและภัยสุขภาพ"
              },
              {
                icon: "fa-stethoscope",
                label: "รักษา (Treatment)",
                desc: "ตรวจรักษาโรคตามบทบาทสถานพยาบาลระดับทุติยภูมิ ส่งต่อรักษาสถานพยาบาลที่มีศักยภาพสูงกว่า"
              },
              {
                icon: "fa-person-walking-with-cane",
                label: "ฟื้นฟู (Rehabilitation)",
                desc: "ฟื้นฟูสภาพผู้ป่วย Stroke และอื่นๆ โดยทีมสหวิชาชีพ"
              }
            ].map((cap, idx) => (
              <div key={idx} className="flex flex-col gap-3 bg-white p-6 rounded-xl shadow-sm border border-emerald-50 hover:border-emerald-200 transition-colors h-full">
                <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                  <i className={`fa-solid ${cap.icon} text-xl`}></i>
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-lg mb-2">{cap.label}</h4>
                  <p className="text-sm text-gray-600 leading-relaxed">{cap.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Executive Policy */}
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="card-premium overflow-hidden border border-purple-100"
      >
        <div className="bg-gradient-to-r from-purple-50 to-white px-8 py-6 border-b border-purple-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-600 flex items-center justify-center text-white shadow-lg shadow-purple-200">
              <i className="fa-solid fa-user-tie"></i>
            </div>
            <h2 className="text-xl font-bold text-gray-900">นโยบายผู้บริหาร</h2>
          </div>
        </div>
        <div className="p-8">
          <div className="grid md:grid-cols-2 gap-8">
            {[
              { id: 1, text: "พัฒนาคุณภาพบริการให้ได้มาตรฐาน HA", sub: "เน้นความปลอดภัย 3P Safety" },
              { id: 2, text: "บริหารงานด้วยความโปร่งใส (ITA)", sub: "ใช้หลักธรรมาภิบาล" },
              { id: 3, text: "ก้าวสู่ Smart Hospital", sub: "พัฒนาระบบเทคโนโลยีสารสนเทศ" },
              { id: 4, text: "ยึดหลักเศรษฐกิจพอเพียง", sub: "ใช้ทรัพยากรอย่างคุ้มค่า" }
            ].map((item) => (
              <div key={item.id} className="flex gap-4">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-sm border border-purple-200">
                  {item.id}
                </span>
                <div>
                  <h3 className="font-semibold text-gray-900">{item.text}</h3>
                  <p className="text-sm text-gray-500">{item.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Strategic Direction */}
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="card-premium overflow-hidden border border-orange-100"
      >
        <div className="bg-gradient-to-r from-orange-50 to-white px-8 py-6 border-b border-orange-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-200">
              <i className="fa-solid fa-chess-rook"></i>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">ยุทธศาสตร์ของหน่วยงาน</h2>
              <p className="text-sm text-gray-500 mt-0.5">Strategic Direction</p>
            </div>
          </div>
        </div>
        <div className="p-8">
          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                id: 1,
                icon: "fa-shield-heart",
                text: "พัฒนาความเป็นเลิศด้านการส่งเสริมสุขภาพและป้องกันโรค",
                label: "P&P Excellence",
                color: "text-emerald-600",
                bg: "bg-emerald-50",
                border: "border-emerald-100"
              },
              {
                id: 2,
                icon: "fa-hospital",
                text: "พัฒนาระบบบริการสุขภาพให้มีคุณภาพมาตรฐานและเป็นที่ยอมรับ",
                label: "Service Excellence",
                color: "text-blue-600",
                bg: "bg-blue-50",
                border: "border-blue-100"
              },
              {
                id: 3,
                icon: "fa-users-gear",
                text: "ส่งเสริมความเป็นเลิศในการจัดการกำลังคนที่มีประสิทธิภาพและเสริมสร้างสุขภาวการณ์ทำงานที่เหมาะสม",
                label: "People Excellence",
                color: "text-violet-600",
                bg: "bg-violet-50",
                border: "border-violet-100"
              },
              {
                id: 4,
                icon: "fa-scale-balanced",
                text: "เสริมสร้างความเป็นเลิศด้านธรรมาภิบาลการพัฒนาและสนับสนุนระบบบริการสุขภาพ",
                label: "Governance Excellence",
                color: "text-orange-600",
                bg: "bg-orange-50",
                border: "border-orange-100"
              }
            ].map((item) => (
              <div key={item.id} className={`flex gap-4 p-5 rounded-xl border ${item.border} bg-white hover:shadow-sm transition-shadow`}>
                <div className={`flex-shrink-0 w-12 h-12 rounded-xl ${item.bg} flex items-center justify-center ${item.color}`}>
                  <i className={`fa-solid ${item.icon} text-xl`}></i>
                </div>
                <div className="flex-1">
                  <span className={`inline-block text-xs font-semibold ${item.color} mb-1`}>{item.label}</span>
                  <p className="text-gray-700 text-sm leading-relaxed font-medium">{item.id}. {item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Strategic Goals & Department Policy */}
      <div className="grid md:grid-cols-2 gap-8">
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="bg-white rounded-2xl p-8 shadow-sm border border-emerald-100"
        >
          <div className="flex items-center gap-3 mb-6">
            <i className="fa-solid fa-scroll text-emerald-600 text-xl"></i>
            <h2 className="text-xl font-bold text-gray-900">นโยบายหน่วยงาน</h2>
          </div>
          <ul className="space-y-4">
            {[
              "ดูแลสุขภาพแบบบูรณาการ มีส่วนร่วม",
              "บริการสุขภาพได้มาตรฐาน ปลอดภัย",
              "ผู้รับบริการพึงพอใจ",
              "พัฒนาบุคลากรให้มีสมรรถนะ",
              "บริหารจัดการด้วยหลักธรรมาภิบาล"
            ].map((text, i) => (
              <li key={i} className="flex items-start gap-3">
                <i className="fa-solid fa-check text-emerald-500 mt-1"></i>
                <span className="text-gray-600">{text}</span>
              </li>
            ))}
          </ul>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-white rounded-2xl p-8 shadow-sm border border-teal-100"
        >
          <div className="flex items-center gap-3 mb-6">
            <i className="fa-solid fa-chess-knight text-teal-600 text-xl"></i>
            <h2 className="text-xl font-bold text-gray-900">วัตถุประสงค์เชิงกลยุทธ์<br />(Strategic Objectives)</h2>
          </div>
          <ul className="space-y-4">
            {[
              { text: "เพื่อให้ประชาชนมีสุขภาพดีและเข้าถึงบริการได้ (P&P Excellence)", icon: "fa-heart-pulse" },
              { text: "เพื่อให้เป็นโรงพยาบาลที่มีคุณภาพ ได้มาตรฐาน (Service Excellence)", icon: "fa-hospital" },
              { text: "เพื่อให้บุคลากรมีความสุขและผูกพันต่อองค์กร (People Excellence)", icon: "fa-users-gear" },
              { text: "เพื่อให้ระบบบริหารจัดการมีประสิทธิภาพ ยึดหลักธรรมาภิบาล (Governance Excellence)", icon: "fa-scale-balanced" }
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-3">
                <div className="mt-1 w-6 h-6 rounded-full bg-teal-100 flex items-center justify-center text-teal-600 shrink-0 text-xs">
                  <i className={`fa-solid ${item.icon}`}></i>
                </div>
                <span className="text-gray-600 text-sm md:text-base">{item.text}</span>
              </li>
            ))}
          </ul>
        </motion.section>
      </div>

      {/* Quality Policy */}
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="bg-white rounded-2xl p-8 shadow-sm border border-blue-100 mt-8"
      >
        <div className="flex items-center gap-3 mb-6">
          <i className="fa-solid fa-clipboard-check text-blue-600 text-xl"></i>
          <h2 className="text-xl font-bold text-gray-900">นโยบายและแผนพัฒนาคุณภาพ</h2>
        </div>
        <ul className="space-y-4">
          {[
            "กำหนดนโยบายและเป้าหมายด้านคุณภาพ นโยบายการจัดการคุณภาพ นโยบาย 3P safety และนโยบายความปลอดภัยอื่นๆ",
            "วางแผนพัฒนาคุณภาพครอบคลุมตามมาตรฐาน HA ฉบับที่ 5 และมาตรฐานวิชาชีพอื่นๆ",
            "จัดทำและปฏิบัติการตามแผนกลยุทธ์ แผนพัฒนาคุณภาพ",
            "ตรวจสอบและประเมินผลด้านการพัฒนาคุณภาพ ติดตามความก้าวหน้าผ่านระบบการวัดผลในแต่ละระดับขององค์กร",
            "จัดทำแผนพัฒนาปรับปรุงจากการประเมินผล และโอกาสพัฒนาที่ผ่านการวิเคราะห์ ประมวลผล"
          ].map((text, i) => (
            <li key={i} className="flex items-start gap-3">
              <i className="fa-solid fa-check-circle text-blue-500 mt-1"></i>
              <span className="text-gray-600">{text}</span>
            </li>
          ))}
        </ul>
      </motion.section>

      {/* Contact CTA */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="mt-12 bg-emerald-600 rounded-2xl p-8 text-center text-white relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')] opacity-10"></div>
        <div className="relative z-10">
          <h3 className="text-2xl font-bold mb-4">ต้องการข้อมูลเพิ่มเติม?</h3>
          <p className="text-emerald-100 mb-8 max-w-lg mx-auto">
            ทีมงานของเราพร้อมให้คำปรึกษาและบริการดุจญาติมิตร ติดต่อสอบถามข้อมูลเพิ่มเติมได้ตลอดเวลาทำการ
          </p>
          <a
            href="/contact"
            className="inline-flex items-center gap-2 bg-white text-emerald-700 font-bold py-3 px-8 rounded-full hover:bg-emerald-50 transition-colors shadow-lg shadow-emerald-900/20"
          >
            <i className="fa-solid fa-phone"></i>
            ติดต่อเรา
          </a>
        </div>
      </motion.div>
    </div>
  )
}

export default function AboutPage() {
  return (
    <div className="page-wrapper">
      <div className="container-narrow py-8">
        {/* SEO meta tags สำหรับหน้าเกี่ยวกับเรา */}
        <SEO
          title="เกี่ยวกับเรา"
          description="ข้อมูลเกี่ยวกับโรงพยาบาลปง ประวัติ วิสัยทัศน์ พันธกิจ ค่านิยมองค์กร โครงสร้างองค์กร และอินโฟกราฟิก โรงพยาบาลปง อำเภอปง จังหวัดพะเยา"
        />
        <PageHeader title="เกี่ยวกับเรา" />


        {/* Routes */}
        <Routes>
          <Route index element={<AboutContent />} />
          <Route path="infographic" element={<InfographicPage />} />
          <Route path="organization" element={<OrganizationChartPage />} />
          <Route path="pr-plan" element={<PRPlanPage />} />
          <Route path="laws" element={<DocumentCategoryView title="กฏหมายที่เกี่ยวข้องกับการดำเนินงานหรือการปฏิบัติงานของหน่วยงาน" category="กฏหมายที่เกี่ยวข้องกับการดำเนินงานหรือการปฏิบัติงานของหน่วยงาน" apiEndpoint="/api/legal-ethics" />} />
          <Route path="ethics-act-2562" element={<DocumentCategoryView title="พระราชบัญญัติมาตรฐานทางจริยธรรม พ.ศ.2562" category="พระราชบัญญัติมาตรฐานทางจริยธรรม พ.ศ.2562" apiEndpoint="/api/legal-ethics" />} />
          <Route path="ethics-civil-service" element={<DocumentCategoryView title="ประมวลจริยธรรมข้าราชการพลเรือน" category="ประมวลจริยธรรมข้าราชการพลเรือน" apiEndpoint="/api/legal-ethics" />} />
          <Route path="ethics-moph-2564" element={<DocumentCategoryView title="ข้อกำหนดจริยธรรมเจ้าหน้าที่ของรัฐสำนักงานปลัดกระทรวงสาธารณสุข พ.ศ. 2564" category="ข้อกำหนดจริยธรรมเจ้าหน้าที่ของรัฐสำนักงานปลัดกระทรวงสาธารณสุข พ.ศ. 2564" apiEndpoint="/api/legal-ethics" />} />
        </Routes>
      </div>
    </div>
  )
}
