import { useState } from 'react'

export function Request() {

    const [copied, setCopied] = useState(false);
    const upiId = ''; // Replace with your actual UPI ID

    const handleCopy = () => {
        navigator.clipboard.writeText(upiId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
    };

    return (
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 my-12">
            <div className="relative overflow-hidden bg-gradient-l-to-r from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-600 rounded-2xl p-6 sm:p-8">

                {/* Subtle decorative glow */}
                <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">

                    {/* Left Text Content */}
                    <div className="max-w-xl">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-3">
                            <span>☕</span> Support CanReal
                        </div>

                        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                            Help us keep CanReal ad-free & fast
                        </h2>

                        
                        <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                            If you're new to the platform, this is what CanReal looked like earlier : <a href="https://can-real.github.io/pyq/index.html" target="_blank" rel="noopener noreferrer" className='text-cyan-400'>
                                https://can-real.github.io/pyq/index.html
                            </a>, back when it was hosted for free on GitHub.
                        </p>
                        <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                            But now I have moved CanReal to a custom domain!
                        </p>
                        <p className="mt-2 text-sm text-slate-100 leading-relaxed">
                            Building this platform took a tremendous amount of effort and late nights to organize notes, papers, and syllabi for everyone.
                        </p>
                        <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                            If this platform has genuinely helped you prepare for your exams, please consider chipping in. Even a small contribution of ₹10, ₹20 or ₹50 goes directly toward maintaining domain renewals and other hosting costs so we can keep the site clean, fast, and completely free of spammy ads.
                        </p>
                    </div>

                    {/* Right Action: UPI ID & Copy Action */}
                    <div className="w-full md:w-auto flex flex-col sm:flex-row md:flex-col gap-3">
                        <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl px-3 py-2">
                            <span className="text-xs text-slate-400 font-mono select-all">
                                {upiId}
                            </span>
                            <button
                                type="button"
                                onClick={handleCopy}
                                className="ml-3 text-xs font-medium px-2.5 py-1 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 rounded-lg border border-indigo-500/30 transition"
                            >
                                {copied ? '✓ Copied' : 'Copy UPI'}
                            </button>
                        </div>

                        <p className="text-[11px] text-slate-500 text-center md:text-right">
                            Scan via GPay, PhonePe, or Paytm
                        </p>
                    </div>

                </div>

            </div>
        </section>
    );

};


export default function SupportSection() {
  const [showQr, setShowQr] = useState(false);
  const [copied, setCopied] = useState(false);

  // Configuration
  const upiId = 'prash7nt@axl'; // Replace with your real UPI ID
  const payeeName = 'CanReal Developer';
  const note = 'Support CanReal Domain';

  // Standard NPCI UPI URI
  const upiUrl = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payeeName)}&tn=${encodeURIComponent(note)}&cu=INR`;


  const handleCopy = () => {
    navigator.clipboard.writeText(upiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 my-12">
      <div className="relative overflow-hidden bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8">
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          
          {/* Copy Text */}
          <div className="max-w-xl">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-3">
                            <span>☕</span> Support CanReal
                        </div>

                        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                            Help us keep CanReal ad-free & fast
                        </h2>

                        
                        <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                            If you're new to the platform, this is what CanReal looked like earlier : <a href="https://can-real.github.io/pyq/index.html" target="_blank" rel="noopener noreferrer" className='text-cyan-400'>
                                https://can-real.github.io/pyq/index.html
                            </a>, back when it was hosted for free on GitHub.
                        </p>
                        <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                            But now I have moved CanReal to a custom domain!
                        </p>
                        <p className="mt-2 text-sm text-slate-100 leading-relaxed">
                            Building this platform took a tremendous amount of effort and late nights to organize notes, papers, and syllabi for everyone.
                        </p>
                        <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                            If this platform has genuinely helped you prepare for your exams, please consider chipping in. Even a small contribution of ₹10, ₹20 or ₹50 goes directly toward maintaining domain renewals and other hosting costs so we can keep the site clean, fast, and completely free of spammy ads.
                        </p>
                    </div>

          {/* Action Area */}
          <div className="w-full md:w-auto flex flex-col gap-3">
            
            {/* 1. Mobile Deep Link Button (Opens GPay / PhonePe / Paytm directly) */}
            <a
              href={upiUrl}
              className="w-full md:w-auto text-center px-5 py-2.5 bg-cyan-500 hover:bg-sky-400 text-slate-950 font-semibold text-sm rounded-xl transition shadow-sm md:hidden"
            >
              ⚡ Donate via UPI App
            </a>

            {/* 2. Desktop Toggle to View QR Code */}
            <button
              type="button"
              onClick={() => setShowQr(!showQr)}
              className="w-full md:w-auto text-center px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs rounded-xl border border-slate-700 transition"
            >
              {showQr ? 'Hide QR Code' : ' Show QR Code'}
            </button>

            {/* 3. Copy UPI ID Box */}
            <div className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5">
              <span className="text-xs font-mono text-slate-400 select-all truncate max-w-35">
                {upiId}
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="text-xs text-sky-400 hover:text-sky-300 font-medium ml-2 hidden md:block"
              >
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>

          </div>

        </div>

        {/* QR Code Modal / Dropdown */}
        {showQr && (
          <div className="mt-6 pt-6 border-t border-slate-800 flex flex-col items-center justify-center text-center">
            <div className="p-3 bg-white rounded-xl shadow-lg">
              <img
                src="/qr.png"
                alt="Scan to pay via UPI"
                className="w-44 h-44 object-contain"
              />
            </div>
            <p className="text-xs text-slate-400 mt-3">
              Scan with <span className="text-white font-medium">Google Pay, PhonePe, Paytm</span>, or any UPI app
            </p>
          </div>
        )}

      </div>
    </section>
  );
}