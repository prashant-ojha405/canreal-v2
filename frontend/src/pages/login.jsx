// frontend/src/pages/login.jsx
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/common/navbar';

export default function LoginForm() {
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm();

  const onSubmit = async (data) => {
    try {
      const response = await fetch('http://localhost:3000/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Stores HTTP-only authentication cookie
        body: JSON.stringify({
          identifier: data.identifier.trim(),
          password: data.password.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        alert(result.message || 'Login failed. Please check your credentials.');
        return;
      }

      // Store non-sensitive user metadata locally
      localStorage.setItem('user', JSON.stringify(result.user));

      // Route users dynamically based on role
      if (result.user?.role) {
        navigate(`/dashboard/${result.user.role}`);
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('Network error:', err);
      alert('Unable to reach the CanReal authentication server.');
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-50 flex flex-col justify-between selection:bg-indigo-500 selection:text-white">
      {/* Top Navbar */}
      <Navbar />

      {/* Main Login Container */}
      <main className="flex-1 flex items-center justify-center px-4 py-12 relative overflow-hidden">
        {/* Ambient Glows Matching Home Screen */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none -z-10" />
        <div className="absolute -bottom-10 right-1/4 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="w-full max-w-md relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-700/70 rounded-2xl p-7 sm:p-9 shadow-2xl backdrop-blur-xl">
          {/* Subtle Decorative Gradient Accent */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-44 h-44 bg-indigo-500/15 rounded-full blur-2xl pointer-events-none" />

          {/* Heading with Corinthia Accent */}
          <div className="text-center mb-8 relative z-10">
            <h1 className="text-3xl font-extrabold tracking-tight text-white">
              Can<span className="text-indigo-400">Real</span>
            </h1>
            <p className="text-xs text-slate-400 mt-2">
              Sign in with your email, 10-digit mobile number or enrollment number
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5 relative z-10">
            {/* Identifier Field (Email or Mobile) */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Email or Mobile Number
              </label>
              <input
                type="text"
                placeholder="Enter your email or number"
                className="w-full px-4 py-2.5 bg-slate-950/80 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                {...register('identifier', {
                  required: 'Email or mobile number is required',
                  validate: (val) => {
                    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
                    const isMobile = /^\d{10}$/.test(val.trim());
                    return isEmail || isMobile || 'Enter a valid email address or 10-digit phone number';
                  },
                })}
              />
              {errors.identifier && (
                <p className="text-xs text-rose-400 mt-1.5 font-medium">
                  {errors.identifier.message}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Password
                </label>
                <a
                  href="/auth/forgot-password"
                  className="text-xs text-indigo-400 hover:text-indigo-300 transition"
                >
                  Forgot password?
                </a>
              </div>
              <input
                type="password"
                placeholder="••••••••••••"
                className="w-full px-4 py-2.5 bg-slate-950/80 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                {...register('password', {
                  required: 'Password is required',
                  minLength: {
                    value: 6,
                    message: 'Password must be at least 6 characters',
                  },
                })}
              />
              {errors.password && (
                <p className="text-xs text-rose-400 mt-1.5 font-medium">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-3 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-full text-sm transition-all duration-150 shadow-lg shadow-indigo-600/25 cursor-pointer flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>Authenticating...</span>
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Links Footer */}
          <div className="mt-7 pt-5 border-t border-slate-800 text-center flex flex-col gap-3 relative z-10 text-xs text-slate-400">
            <p>
              Don't have an account?{' '}
              <Link to="/register" className="text-white hover:text-indigo-300 font-medium transition">
                Register here
              </Link>
            </p>
            <Link to="/" className="text-slate-400 hover:text-slate-200 transition">
              &larr; Return to CanReal Home
            </Link>
          </div>
        </div>
      </main>

      {/* Subtle Footer Watermark */}
      <footer className="text-center py-4 text-xs text-slate-600">
        CanReal &bull; Structured Notes, PYQs & Syllabi
      </footer>
    </div>
  );
}