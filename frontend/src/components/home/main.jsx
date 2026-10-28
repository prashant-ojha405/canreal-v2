// frontend/src/components/home/main.jsx
export default function Main() {
  return (
    <div className="flex flex-col items-center text-center px-4">
      {/* Title */}
      <div className="mt-6 text-7xl md:text-8xl font-black tracking-tight text-white select-none">
        CanReal
      </div>

      {/* Brand Slogan */}
      <div className="text-3xl md:text-2xl font-cur text-slate-300 mt-1">
        Colours are <span className="text-red-400">not</span> Real
      </div>

      {/* Desktop Banner */}
      <div className="mt-5 hidden md:flex relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-700/80 rounded-2xl px-6 py-2 text-sm text-slate-300 shadow-lg backdrop-blur-md">
        <span>Explore structured notes and topics</span>
        <span className="text-indigo-400/80 font-semibold">&nbsp;||&nbsp;</span>
        <span>Access previous papers and syllabi</span>
      </div>

      {/* Mobile Badges (Split for clean vertical flow on phones) */}
      <div className="md:hidden mt-5 flex flex-col gap-2.5 w-full max-w-xs text-xs text-slate-300">
        <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-700/80 rounded-2xl px-4 py-2 text-center shadow-md">
          Explore structured notes and topics
        </div>
        <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-700/80 rounded-2xl px-4 py-2 text-center shadow-md">
          Access previous papers and syllabi
        </div>
      </div>
    </div>
  );
}