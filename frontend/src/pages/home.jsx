// frontend/src/pages/home.jsx
import React from "react";
import Navbar from "../components/common/navbar";
import Main from "../components/home/main";
import SearchBox from "../components/home/searchBox";
import SupportSection from "../components/home/request";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#020617] text-slate-50 flex flex-col justify-between selection:bg-indigo-500 selection:text-white relative overflow-x-hidden">
      {/* Background Ambient Glows */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-[500px] right-10 w-[400px] h-[300px] bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Navigation */}
      <Navbar />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-start w-full">
        <Main />
        <SearchBox />
        <SupportSection />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>&copy; {new Date().getFullYear()} CanReal &bull; Open Academic Archive</span>
          <span>Built for RGPV students & faculty</span>
        </div>
      </footer>
    </div>
  );
}