export default function BackgroundPattern() {
  return (
    <div className="fixed inset-0 overflow-hidden -z-10 bg-slate-50 pointer-events-none">
      {/* 
        High-Performance Mesh Gradient (Aurora Style) 
        Uses static radial gradients to mimic the effect without heavy browser composition.
        Avoids `filter: blur()` and `mix-blend-mode` on animating elements.
      */}
      <div
        className="absolute inset-0 w-full h-full opacity-60"
        style={{
          background: `
            radial-gradient(at 0% 0%, hsla(147, 60%, 85%, 1) 0px, transparent 50%),
            radial-gradient(at 100% 0%, hsla(170, 70%, 85%, 1) 0px, transparent 50%),
            radial-gradient(at 100% 100%, hsla(190, 60%, 85%, 1) 0px, transparent 50%),
            radial-gradient(at 0% 100%, hsla(150, 60%, 85%, 1) 0px, transparent 50%),
            radial-gradient(at 50% 50%, hsla(160, 50%, 90%, 1) 0px, transparent 50%)
          `,
          filter: 'blur(40px)', // Single blur on the container is cheaper than multiple blurred moving blobs
        }}
      />

      {/* Subtle Aurora Animation using Opacity (Cheaper than transform) */}
      <div
        className="absolute inset-0 w-full h-full opacity-30 animate-pulse"
        style={{
          background: `
            radial-gradient(at 30% 30%, hsla(150, 70%, 80%, 1) 0px, transparent 40%),
            radial-gradient(at 70% 70%, hsla(180, 70%, 80%, 1) 0px, transparent 40%)
          `,
          animationDuration: '8s',
          filter: 'blur(60px)',
        }}
      />

      {/* Noise Texture Overlay */}
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
      />
    </div>
  )
}
