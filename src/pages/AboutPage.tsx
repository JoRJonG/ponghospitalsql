import { motion } from 'framer-motion'
import { Routes, Route } from 'react-router-dom'
import InfographicPage from './InfographicPage'
import OrganizationChartPage from './OrganizationChartPage'
import SEO from '../components/SEO'
import PageHeader from '../components/PageHeader'
import AboutLawsList from '../components/AboutLawsList'
import ITCenterPage from './ITCenterPage'

function AboutContent() {
  return (
    <div className="space-y-16 pb-20">
      {/* 1. Identity & Header Section */}
      <div
        className="relative flex flex-col justify-end rounded-[2.5rem] overflow-hidden text-white shadow-2xl shadow-emerald-900/20 border border-emerald-500/30 bg-cover bg-center bg-no-repeat min-h-[400px] md:min-h-[500px]"
        style={{ backgroundImage: 'url("/imgpong.jpg")' }}
      >
        <div className="absolute inset-0 bg-black/10 transition-colors"></div>
        <div className="absolute inset-x-0 bottom-0 h-[80%] bg-gradient-to-t from-slate-900/95 via-slate-800/70 to-transparent"></div>
        
        <div className="absolute top-0 right-0 p-12 opacity-10 hidden md:block">
          <i className="fa-solid fa-hospital text-8xl text-white"></i>
        </div>
        
        <div className="relative z-10 p-8 md:p-14 mt-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/60 backdrop-blur-md border border-slate-500/30 text-slate-100 text-sm font-semibold mb-6 shadow-sm">
              <i className="fa-solid fa-clock-rotate-left"></i>
              ให้บริการตั้งแต่ พ.ศ. 2502
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black mb-3 tracking-tight text-white drop-shadow-lg">
              โรงพยาบาลปง
              <span className="block text-slate-300/90 text-2xl md:text-3xl font-light mt-2 tracking-wide">
                Pong Hospital
              </span>
            </h1>
            <p className="text-slate-100 max-w-3xl leading-relaxed opacity-90 text-lg md:text-xl font-light mt-4">
              จากสถานีอนามัยเล็ก ๆ สู่การเป็น<span className="font-semibold text-white">โรงพยาบาลชุมชนที่ทันสมัย</span> พร้อมดูแลสุขภาพของประชาชนด้วยคุณภาพและมาตรฐาน
            </p>
          </motion.div>
        </div>
      </div>

      {/* 2. Vision & Mission (Focal Quote Aesthetic) */}
      <div className="grid lg:grid-cols-2 gap-8 md:gap-12">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          className="relative bg-white p-10 md:p-12 rounded-2xl border border-emerald-100/50 shadow-sm hover:shadow-md transition-all duration-500"
        >
          <div className="relative z-10">
            <h2 className="text-sm font-black tracking-widest text-emerald-600 uppercase mb-8 flex items-center gap-3">
              <span className="w-8 h-1 bg-emerald-500 rounded-full"></span>
              วิสัยทัศน์ (Vision)
            </h2>
            <p className="text-2xl md:text-3xl font-bold text-slate-800 leading-snug">
              "โรงพยาบาลปง จะเป็นโรงพยาบาลที่มี<span className="text-emerald-600">บริการดี</span> มี<span className="text-emerald-600">ผลลัพธ์เป็นเลิศ</span>"
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          className="relative bg-white p-10 md:p-12 rounded-2xl border border-teal-100/50 shadow-sm hover:shadow-md transition-all duration-500"
        >
            <h2 className="text-sm font-black tracking-widest text-teal-600 uppercase mb-8 flex items-center gap-3">
              <span className="w-8 h-1 bg-teal-500 rounded-full"></span>
              พันธกิจ (Mission)
            </h2>
            <ul className="space-y-5">
              {[
                "ให้บริการด้านสุขภาพแก่ประชาชนอย่างมีคุณภาพ",
                "พัฒนาบริการสาธารณสุขอย่างเป็นองค์รวม ทั้งในและนอกเครือข่าย",
                "จัดระบบบริการด้วยเทคโนโลยีสารสนเทศที่ทันสมัยและมีประสิทธิภาพ",
                "ส่งเสริมให้บุคลากรมีสมรรถนะและสร้างวัฒนธรรมองค์กร เน้นความรักสามัคคี"
              ].map((item, idx) => (
                <li key={idx} className="flex items-start gap-4 text-slate-700 font-medium">
                  <div className="w-6 h-6 mt-0.5 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center shrink-0 shadow-sm">
                    <i className="fa-solid fa-check text-[10px]"></i>
                  </div>
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
        </motion.div>
      </div>

      {/* 3. Core Values (Modern 3x2 Grid) */}
      <motion.section
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
      >
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-emerald-500 font-black tracking-[0.2em] uppercase text-xs">Core Values</span>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mt-3 mb-4 tracking-tight">ค่านิยมองค์กร</h2>
          <p className="text-slate-500">หลักการทำงานที่ชาวโรงพยาบาลปงยึดถือร่วมกัน เพื่อส่งมอบผลลัพธ์ที่ดีที่สุด</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { icon: "fa-eye", title: "Visionary Humility", desc: "ผู้นำมีวิสัยทัศน์ อ่อนน้อมถ่อมตน", color: "text-emerald-500", bg: "bg-emerald-50", border: "hover:border-emerald-300" },
            { icon: "fa-bullseye", title: "Focus on Result", desc: "มุ่งเน้นผลลัพธ์", color: "text-rose-500", bg: "bg-rose-50", border: "hover:border-rose-300" },
            { icon: "fa-hospital-user", title: "Patient Focus", desc: "ยึดผู้ป่วยเป็นศูนย์กลาง", color: "text-blue-500", bg: "bg-blue-50", border: "hover:border-blue-300" },
            { icon: "fa-scale-balanced", title: "Management by Fact", desc: "บริหารจัดการภายใต้ข้อเท็จจริง", color: "text-amber-500", bg: "bg-amber-50", border: "hover:border-amber-300" },
            { icon: "fa-users-viewfinder", title: "Teamwork", desc: "การทำงานเป็นทีม", color: "text-indigo-500", bg: "bg-indigo-50", border: "hover:border-indigo-300" },
            { icon: "fa-book-open-reader", title: "Learning & Mastery", desc: "องค์กรแห่งการเรียนรู้ มืออาชีพ", color: "text-purple-500", bg: "bg-purple-50", border: "hover:border-purple-300" }
          ].map((item, idx) => (
            <div key={idx} className={`group bg-white rounded-2xl p-8 border border-slate-100 ${item.border} shadow-sm hover:shadow-md transition-all duration-500 flex flex-col items-center text-center`}>
              <div className={`w-16 h-16 rounded-xl ${item.bg} text-2xl ${item.color} flex items-center justify-center mb-6 shadow-sm`}>
                <i className={`fa-solid ${item.icon}`}></i>
              </div>
              <h3 className="font-bold text-slate-800 text-lg mb-2">{item.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </motion.section>

      {/* 4. Timeline Redesign */}
      <motion.section
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        className="bg-white border border-slate-200 shadow-sm rounded-2xl p-10 md:p-16 relative overflow-hidden"
      >
        <div className="relative z-10 flex flex-col md:flex-row gap-12 md:gap-20">
          <div className="md:w-1/3 shrink-0">
            <span className="inline-block px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 font-bold tracking-[0.1em] uppercase text-[10px] mb-6">Our Journey</span>
            <h2 className="text-3xl md:text-5xl font-bold mb-6 leading-tight text-slate-900">ประวัติ<br/>ความเป็นมา</h2>
            <p className="text-slate-600 font-light leading-relaxed text-sm md:text-base">ก้าวเดินของโรงพยาบาลปง จากจุดเริ่มต้นเล็กๆ สู่วิสัยทัศน์ระดับโรงพยาบาลชุมชนขนาดใหญ่ที่พร้อมดูแลและรับใช้ประชาชนอย่างเต็มศักยภาพตลอดมา</p>
          </div>
          
          <div className="md:w-2/3 relative">
            <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-emerald-400 via-emerald-200 to-transparent"></div>
            <div className="space-y-10">
              {[
                { year: "2502", title: "สถานีอนามัยอำเภอ", desc: "ก่อตั้งสถานบริการสาธารณสุขครั้งแรก เพื่อรองรับประชาชนเบื้องต้น" },
                { year: "2510", title: "สถานีอนามัยชั้น 1", desc: "ยกระดับการให้บริการประชาชน ครอบคลุมการรักษาพยาบาลมากขึ้น" },
                { year: "2517", title: "ศูนย์การแพทย์และอนามัย", desc: "เปลี่ยนสถานะเพื่อรองรับความต้องการและจำนวนผู้ป่วยที่เพิ่มขึ้น" },
                { year: "2520", title: "โรงพยาบาลขนาด 10 เตียง", desc: "ยกระดับสู่โรงพยาบาลชุมชนอย่างเต็มตัว มีเตียงรองรับผู้ป่วยใน" },
                { year: "2536 - ปัจจุบัน", title: "โรงพยาบาลขนาด 30 เตียง", desc: "พัฒนาคุณภาพบริการ สถานที่ และอุปกรณ์การแพทย์อย่างต่อเนื่องจนถึงปัจจุบัน", highlight: true },
              ].map((item, index) => (
                <div key={index} className="relative pl-10 md:pl-14 group">
                  <div className={`absolute left-0 top-1.5 w-6 h-6 rounded-full border-4 border-white shadow-sm ${item.highlight ? 'bg-emerald-500 animate-pulse' : 'bg-emerald-200 group-hover:bg-emerald-400 transition-colors'}`}></div>
                  <div className="flex flex-col gap-1.5">
                    <span className={`text-xs font-black tracking-wider ${item.highlight ? 'text-emerald-600' : 'text-slate-500'}`}>พ.ศ. {item.year}</span>
                    <h3 className={`text-xl font-bold transition-colors ${item.highlight ? 'text-slate-900' : 'text-slate-800 group-hover:text-emerald-700'}`}>{item.title}</h3>
                    <p className="text-slate-600 text-sm font-light leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.section>

      {/* 5. Hospital Mandate & Service Scope (Bento Box Layout) */}
      <motion.section
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
      >
        <div className="grid lg:grid-cols-12 gap-6">
          {/* Service Scope (Takes up more visual space) */}
          <div className="lg:col-span-7 bg-emerald-50 rounded-2xl p-8 md:p-12 text-slate-900 flex flex-col shadow-sm border border-emerald-100">
            
            <div className="mb-10 max-w-sm">
              <span className="inline-block px-3 py-1 rounded-full bg-white border border-emerald-200 text-emerald-700 font-bold tracking-[0.1em] text-[10px] mb-4">Core Scope</span>
              <h2 className="text-3xl font-bold mb-4">บริการของเรา</h2>
              <p className="text-slate-600 font-light leading-relaxed">พัฒนาศักยภาพการดูแลสุขภาพ 4 มิติ เพื่อประชาชนเข้าถึงบริการที่ได้มาตรฐาน ปลอดภัย และอุ่นใจในทุกโอกาส</p>
            </div>
            
            <div className="relative z-10 grid sm:grid-cols-2 gap-4 mt-auto">
              {[
                { icon: "fa-hand-holding-heart", label: "Promotion", desc: "ส่งเสริมสุขภาพทุกกลุ่มวัย" },
                { icon: "fa-shield-virus", label: "Prevention", desc: "ป้องกันโรคติดเชื้อและภัยสุขภาพ" },
                { icon: "fa-stethoscope", label: "Treatment", desc: "รักษาโรคตามมาตรฐานทุติยภูมิ" },
                { icon: "fa-person-walking-with-cane", label: "Rehabilitation", desc: "ฟื้นฟูสภาพผู้ป่วยแบบองค์รวม" }
              ].map((cap, idx) => (
                <div key={idx} className="bg-white rounded-2xl p-6 border border-emerald-100 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all cursor-default">
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center mb-4 text-emerald-600">
                    <i className={`fa-solid ${cap.icon} text-xl shadow-sm`}></i>
                  </div>
                  <h4 className="font-bold text-lg mb-1 text-slate-800">{cap.label}</h4>
                  <p className="text-sm text-slate-500 font-light leading-relaxed">{cap.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Hospital Mandate */}
          <div className="lg:col-span-5 bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow rounded-2xl p-8 md:p-12 flex flex-col">
            <div className="w-14 h-14 rounded-xl bg-slate-50 text-slate-800 flex items-center justify-center mb-6 border border-slate-100 shadow-sm">
              <i className="fa-solid fa-gavel text-xl"></i>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-8">บทบาทและอำนาจหน้าที่</h2>
            
            <ul className="space-y-6 mt-auto">
              {[
                { icon: "fa-map-location-dot", title: "การวางแผน / ยุทธศาสตร์", desc: "จัดทำยุทธศาสตร์สุขภาพในระดับอำเภอ" },
                { icon: "fa-hand-holding-medical", title: "การบริการสุขภาพ", desc: "ดูแลรักษา ส่งเสริม ป้องกัน และฟื้นฟู" },
                { icon: "fa-clipboard-check", title: "การกำกับและสนับสนุน", desc: "ประเมินและสนับสนุนเครือข่ายบริการ" },
                { icon: "fa-users-rays", title: "การพัฒนาและประสานงาน", desc: "เชื่อมโยงเครือข่าย ท้องถิ่น และเทคโนโลยี" }
              ].map((item, idx) => (
                <li key={idx} className="flex gap-4 group">
                  <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100 text-slate-400 group-hover:bg-emerald-500 group-hover:text-white transition-all shadow-sm">
                    <i className={`fa-solid ${item.icon} text-sm`}></i>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm mb-1">{item.title}</h3>
                    <p className="text-slate-500 text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </motion.section>

      {/* 6. Strategic Blueprint (Grouped Policies & Direction) */}
      <motion.section
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
      >
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-emerald-500 font-black tracking-[0.2em] uppercase text-xs">Strategic Blueprint</span>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mt-3 mb-4 tracking-tight">ทิศทางและยุทธศาสตร์</h2>
          <p className="text-slate-500">กรอบแนวทางการดำเนินงานเพื่อก้าวสู่ความสำเร็จตามวิสัยทัศน์อย่างยั่งยืน และการให้บริการที่เป็นเลิศ</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Strategic Excellence */}
          <div className="bg-white rounded-[2rem] p-8 md:p-10 border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-shadow">
            <h3 className="text-xl font-bold text-slate-900 mb-8 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 text-emerald-600 flex items-center justify-center shadow-sm"><i className="fa-solid fa-chess-rook text-lg"></i></div>
              จุดเน้นยุทธศาสตร์ (Excellence)
            </h3>
            <div className="space-y-4">
              {[
                { label: "P&P Excellence", desc: "ด้านส่งเสริมและป้องกันโรค", styles: "bg-emerald-50 text-emerald-700 border border-emerald-100" },
                { label: "Service Excellence", desc: "ยกระดับคุณภาพบริการมาตรฐาน", styles: "bg-blue-50 text-blue-700 border border-blue-100" },
                { label: "People Excellence", desc: "สุขภาวะและศักยภาพบุคลากร", styles: "bg-violet-50 text-violet-700 border border-violet-100" },
                { label: "Governance Excellence", desc: "ธรรมาภิบาลในระบบสุขภาพ", styles: "bg-orange-50 text-orange-700 border border-orange-100" }
              ].map((ex, i) => (
                <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-2xl bg-white border border-slate-100 hover:border-slate-300 transition-colors">
                  <span className={`inline-block px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shadow-sm ${ex.styles}`}>{ex.label}</span>
                  <span className="text-slate-600 font-medium text-sm">{ex.desc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Executive Policy */}
          <div className="bg-white rounded-[2rem] p-8 md:p-10 border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-shadow">
            <h3 className="text-xl font-bold text-slate-900 mb-8 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 text-rose-500 flex items-center justify-center shadow-sm"><i className="fa-solid fa-user-tie text-lg"></i></div>
              นโยบายหลักผู้บริหาร
            </h3>
            <div className="grid sm:grid-cols-2 gap-4 h-[calc(100%-5rem)]">
              {[
                { icon: "fa-medal", title: "มาตรฐาน HA", sub: "เน้น 3P Safety เป็นหลัก" },
                { icon: "fa-scale-balanced", title: "โปร่งใส (ITA)", sub: "ยึดมั่นหลักธรรมาภิบาล" },
                { icon: "fa-laptop-medical", title: "Smart Hospital", sub: "พัฒนาระบบเทคโนโลยี" },
                { icon: "fa-leaf", title: "เศรษฐกิจพอเพียง", sub: "ใช้ทรัพยากรให้คุ้มค่า" }
              ].map((pol, i) => (
                <div key={i} className="border border-slate-100 bg-slate-50 hover:bg-white hover:border-slate-300 rounded-2xl p-6 flex flex-col justify-center transition-all cursor-default">
                  <i className={`fa-solid ${pol.icon} text-slate-400 text-2xl mb-4 drop-shadow-sm`}></i>
                  <h4 className="font-bold text-slate-800 text-sm mb-1">{pol.title}</h4>
                  <span className="text-xs text-slate-500 leading-relaxed font-light">{pol.sub}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.section>

      {/* 7. Contact CTA */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, margin: "-50px" }}
        className="mt-20 bg-white border border-slate-200 rounded-2xl p-12 md:p-16 text-center text-slate-900 shadow-sm"
      >
        <div className="flex flex-col items-center">
          <div className="w-20 h-20 bg-emerald-50 rounded-2xl flex items-center justify-center mb-8 border border-emerald-100">
            <i className="fa-solid fa-headset text-4xl drop-shadow-sm text-emerald-600"></i>
          </div>
          <h3 className="text-3xl md:text-4xl font-black mb-5 tracking-tight text-slate-800">พร้อมให้บริการด้วยความใส่ใจ</h3>
          <p className="text-slate-600 mb-10 max-w-xl mx-auto text-lg md:text-xl font-light leading-relaxed">
            ติดต่อสอบถามข้อมูล รับคำปรึกษา หรือแนะนำบริการ ทีมงานโรงพยาบาลปงยินดีต้อนรับทุกท่านดุจญาติมิตร
          </p>
          <a
            href="/contact"
            className="inline-flex items-center gap-3 bg-emerald-600 text-white font-bold py-4 px-10 border border-emerald-600 rounded-full hover:bg-emerald-700 hover:scale-105 transition-all shadow-md shadow-emerald-900/10 active:scale-95 text-lg"
          >
            <i className="fa-solid fa-phone"></i>
            ช่องทางการติดต่อ
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
        <SEO
          title="เกี่ยวกับเรา"
          description="ข้อมูลเกี่ยวกับโรงพยาบาลปง ประวัติ วิสัยทัศน์ พันธกิจ ค่านิยมองค์กร โครงสร้างองค์กร และอินโฟกราฟิก โรงพยาบาลปง อำเภอปง จังหวัดพะเยา"
        />
        <PageHeader title="เกี่ยวกับเรา" />

        <Routes>
          <Route index element={<AboutContent />} />
          <Route path="infographic" element={<InfographicPage />} />
          <Route path="organization" element={<OrganizationChartPage />} />
          <Route path="laws" element={<AboutLawsList />} />
          <Route path="it-center" element={<ITCenterPage />} />
        </Routes>
      </div>
    </div>
  )
}
