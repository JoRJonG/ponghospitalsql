// Beautiful hospital-themed background with gradient, floating shapes, and medical patterns
// Features glass-morphism effects and smooth animations
export default function BackgroundPattern() {
  return (
    <div className="absolute inset-0 overflow-hidden -z-10">
      {/* Base gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#a5d6a7] via-[#81c784] to-[#66bb6a]" />

      {/* Radial gradient overlays */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-full h-full bg-radial-gradient-25-25" />
        <div className="absolute top-0 left-0 w-full h-full bg-radial-gradient-75-75" />
      </div>

      {/* Medical pattern grid */}
      <div className="absolute inset-0 opacity-[0.03] bg-medical-pattern" />

      {/* Decorative floating shapes */}
      <div className="decorative-shapes">
        {/* Shape 1 - Large top-right */}
        <div className="shape shape1 absolute w-[450px] h-[450px] bg-gradient-to-br from-[#81C784] to-[#A5D6A7] -top-[150px] -right-[150px] rounded-full opacity-10 animate-float-20" />

        {/* Shape 2 - Medium bottom-left */}
        <div className="shape shape2 absolute w-[350px] h-[350px] bg-gradient-to-bl from-[#66BB6A] to-[#81C784] -bottom-[100px] -left-[100px] rounded-full opacity-10 animate-float-25-reverse" />

        {/* Shape 3 - Medium center-right */}
        <div className="shape shape3 absolute w-[250px] h-[250px] bg-gradient-to-br from-[#4CAF50] to-[#66BB6A] top-[40%] right-[15%] rounded-full opacity-10 animate-float-30" />

        {/* Shape 4 - Small top-left */}
        <div className="shape shape4 absolute w-[180px] h-[180px] bg-gradient-to-r from-[#8BC34A] to-[#9CCC65] top-[20%] left-[10%] rounded-full opacity-8 animate-float-22" />
      </div>
    </div>
  )
}
