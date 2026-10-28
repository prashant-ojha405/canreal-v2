import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Left: Brand Logo */}
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2 group"> 
             <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-md group-hover:bg-indigo-500 transition">
              C
            </div>
            <span className="text-xl font-bold tracking-tight text-white">
              Can<span className="text-indigo-400">Real</span>
            </span>
          </Link>
        </div>

        {/* Center: Desktop Navigation Links */}
        <div className="hidden md:flex items-center gap-8 ml-12">
          <Link to="/about" className="text-sm font-medium text-slate-300 hover:text-white transition">
            About
          </Link>
          <a href="/contact" className="text-sm font-medium text-slate-300 hover:text-white transition">
            Contact
          </a>
          <a href="/policy" className="text-sm font-medium text-slate-300 hover:text-white transition">
            Policy
          </a>
        </div>

        {/* Right: Desktop Auth Buttons (Pill design matching the screenshot) */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            to="/login"
            className="px-4 py-1.5 text-sm font-medium text-slate-200 border border-slate-700 rounded-full hover:bg-slate-800 transition"
          >
            Login
          </Link>
          <Link
            to="/register"
            className="px-4 py-1.5 text-sm font-medium text-slate-950 bg-white hover:bg-slate-200 rounded-full transition shadow-sm"
          >
            Register
          </Link>
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex md:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 focus:outline-none"
            aria-label="Toggle navigation"
          >
            {mobileMenuOpen ? (
              // "X" close icon
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              // Hamburger lines icon
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </nav>

      {/* Mobile Drawer Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-800 bg-slate-900 px-4 pt-3 pb-6 flex flex-col gap-3">
          <Link
            to="/about"
            onClick={() => setMobileMenuOpen(false)}
            className="text-slate-300 hover:text-white text-base py-1 font-medium"
          >
            About
          </Link>
          <a
            href="/contact"
            onClick={() => setMobileMenuOpen(false)}
            className="text-slate-300 hover:text-white text-base py-1 font-medium"
          >
            Contact
          </a>
          <a
            href="/request"
            onClick={() => setMobileMenuOpen(false)}
            className="text-slate-300 hover:text-white text-base py-1 font-medium"
          >
            Our Request
          </a>
          <a
            href="/features"
            onClick={() => setMobileMenuOpen(false)}
            className="text-slate-300 hover:text-white text-base py-1 font-medium"
          >
            Features
          </a>
          <div className="pt-3 border-t border-slate-800 flex flex-col gap-2">
            <Link
              to="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center py-2 text-sm font-medium text-slate-200 border border-slate-700 rounded-full hover:bg-slate-800 transition"
            >
              Login
            </Link>
            <Link
              to="/register"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center py-2 text-sm font-medium text-slate-950 bg-white hover:bg-slate-200 rounded-full transition shadow-sm"
            >
              Register
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}