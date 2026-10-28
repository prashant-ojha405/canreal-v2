// frontend/src/pages/registration.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import * as faceapi from '@vladmandic/face-api';
import Navbar from '../components/common/navbar';

function EyeIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function EyeSlashIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  );
}

export default function RegistrationForm() {
  const navigate = useNavigate();
  const avatarInputRef = useRef(null);

  const [showPassword, setShowPassword] = useState(false);
  const [showPasskey, setShowPasskey] = useState(false);

  // Avatar & Face Detection States
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarError, setAvatarError] = useState('');
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isAnalyzingFace, setIsAnalyzingFace] = useState(false);

  // OTP States
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [otpMessage, setOtpMessage] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      role: 'student',
      admissionYear: 2025,
    },
  });

  const selectedRole = watch('role');
  const enteredEmail = watch('email');
  const enteredName = watch('name');

  // Preload TinyFaceDetector from /models in public folder
  // In frontend/src/pages/registration.jsx
useEffect(() => {
  const loadFaceDetectorModel = async () => {
    try {
      // Direct reliable CDN containing the tiny_face_detector weights
      const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      setIsModelLoaded(true);
    } catch (err) {
      console.warn('Could not load face-api model from CDN:', err);
    }
  };
  loadFaceDetectorModel();
}, []);

  // Strict Face Verification Handler
  const handleAvatarChange = async (e) => {
    setAvatarError('');
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setAvatarError('Please upload an image file (JPG, PNG).');
      return;
    }

    setIsAnalyzingFace(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = async () => {
        // 1. Resolution Check
        if (img.width < 120 || img.height < 120) {
          setAvatarError('Photo is too small or blurry. Minimum size is 120x120.');
          setIsAnalyzingFace(false);
          return;
        }

        // 2. ML Human Face Verification
        if (isModelLoaded) {
          try {
            const detection = await faceapi.detectSingleFace(
              img,
              new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 })
            );

            if (!detection) {
              setAvatarError('❌ No human face detected! Please upload a clear photo of your face (no animals, objects, or blank images).');
              setAvatarFile(null);
              setAvatarPreview(null);
              setIsAnalyzingFace(false);
              return;
            }
          } catch (modelErr) {
            console.error('Face detection scan error:', modelErr);
          }
        }

        // Valid face confirmed!
        setAvatarFile(file);
        setAvatarPreview(event.target.result);
        setIsAnalyzingFace(false);
      };
    };
    reader.readAsDataURL(file);
  };

  const handleSendOtp = async () => {
    if (!enteredEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(enteredEmail.trim())) {
      alert('Please enter a valid email address first.');
      return;
    }

    setSendingOtp(true);
    setOtpMessage('Sending verification code...');

    try {
      const response = await fetch('http://localhost:3000/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: enteredEmail.trim(),
          name: enteredName ? enteredName.trim() : '',
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setOtpSent(true);
        setOtpMessage('6-digit OTP sent to your email.');
      } else {
        alert(data.message || 'Failed to send OTP.');
        setOtpMessage('');
      }
    } catch (err) {
      console.error(err);
      alert('Unable to reach auth server.');
      setOtpMessage('');
    } finally {
      setSendingOtp(false);
    }
  };

  const onSubmit = async (data) => {
    if (!avatarFile) {
      setAvatarError('Please upload a verified profile photo of yourself.');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('name', data.name.trim());
      formData.append('email', data.email.trim());
      formData.append('mobileNumber', data.mobileNumber.trim());
      formData.append('password', data.password.trim());
      formData.append('passkey', data.passkey.trim());
      formData.append('role', data.role);
      formData.append('otp', data.otp.trim());

      if (data.role === 'student' && data.admissionYear) {
        formData.append('admissionYear', Number(data.admissionYear));
      }

      formData.append('avatar', avatarFile);

      const response = await fetch('http://localhost:3000/auth/register', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        alert(result.message || 'Registration failed.');
        return;
      }

      localStorage.setItem('user', JSON.stringify(result.user));
      navigate(`/dashboard/${result.user.role}`);
    } catch (err) {
      console.error('Registration Error:', err);
      alert('Network error during registration.');
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-50 flex flex-col justify-between selection:bg-indigo-500 selection:text-white">
      <Navbar />

      <main className="flex-1 flex items-center justify-center px-4 py-10 relative overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none -z-10" />
        <div className="absolute -bottom-10 right-1/4 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="w-full max-w-lg relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-700/70 rounded-2xl p-7 sm:p-9 shadow-2xl backdrop-blur-xl">
          <div className="text-center mb-6 relative z-10">
            <h1 className="text-3xl font-extrabold tracking-tight text-white">
              Authorized Registration
            </h1>
            <p className="text-xl font-cur text-slate-300 mt-1">
              Colours are <span className="text-red-400">not</span> Real
            </p>
          </div>

          <div className="mb-6 p-3.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-indigo-200/90 text-xs leading-relaxed flex items-start gap-2.5 relative z-10">
            <span className="text-base select-none">🔐</span>
            <div>
              <strong className="text-indigo-300 font-semibold block mb-0.5">
                Single-Use Invite Code Required
              </strong>
              Enter the 8-digit one-time invitation code generated from your faculty or admin dashboard.
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 relative z-10">
            {/* Real Face Verification Profile Picture Upload */}
            <div className="flex flex-col items-center gap-2 mb-2">
              <div
                onClick={() => avatarInputRef.current.click()}
                className="w-24 h-24 rounded-full border-2 border-dashed border-indigo-500/50 hover:border-indigo-400 bg-slate-950 flex items-center justify-center overflow-hidden cursor-pointer group transition relative"
              >
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center px-1">
                    <span className="text-xs text-slate-400 group-hover:text-slate-200 block">
                      📷 Add Photo
                    </span>
                    <span className="text-[9px] text-slate-500 block">Face Required</span>
                  </div>
                )}
                {isAnalyzingFace && (
                  <div className="absolute inset-0 bg-black/75 flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
              <input
                type="file"
                ref={avatarInputRef}
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
              <span className="text-[11px] text-slate-400">
                {isAnalyzingFace ? 'Scanning image for human face...' : 'AI verifies real human photo'}
              </span>
              {avatarError && <p className="text-xs text-rose-400 font-medium text-center">{avatarError}</p>}
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                placeholder="Prashant Sharma"
                className="w-full px-4 py-2.5 bg-slate-950/80 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                {...register('name', { required: 'Name is required' })}
              />
              {errors.name && <p className="text-xs text-rose-400 mt-1">{errors.name.message}</p>}
            </div>

            {/* Email & OTP Row */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Email Address
              </label>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="name@university.edu"
                  className="flex-1 px-4 py-2.5 bg-slate-950/80 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                  {...register('email', {
                    required: 'Email is required',
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: 'Enter a valid email address',
                    },
                  })}
                />
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={sendingOtp}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 border border-slate-600 rounded-xl text-xs font-semibold text-slate-200 transition disabled:opacity-50 whitespace-nowrap cursor-pointer"
                >
                  {sendingOtp ? 'Sending...' : otpSent ? 'Resend' : 'Send OTP'}
                </button>
              </div>
              {errors.email && <p className="text-xs text-rose-400 mt-1">{errors.email.message}</p>}
              {otpMessage && <p className="text-xs text-indigo-400 mt-1">{otpMessage}</p>}
            </div>

            {/* 6-Digit Email OTP Field */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Email Verification Code (OTP)
              </label>
              <input
                type="text"
                maxLength={6}
                placeholder="6-digit verification code"
                className="w-full px-4 py-2.5 bg-slate-950/80 border border-slate-700 rounded-xl text-sm font-mono tracking-widest text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                {...register('otp', {
                  required: 'Email verification code is required',
                  pattern: { value: /^\d{6}$/, message: 'Must be a 6-digit code' },
                })}
              />
              {errors.otp && <p className="text-xs text-rose-400 mt-1">{errors.otp.message}</p>}
            </div>

            {/* Mobile Number */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                10-Digit Mobile Number
              </label>
              <input
                type="tel"
                placeholder="9876543210"
                className="w-full px-4 py-2.5 bg-slate-950/80 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                {...register('mobileNumber', {
                  required: 'Mobile number is required',
                  pattern: { value: /^\d{10}$/, message: 'Enter a valid 10-digit number' },
                })}
              />
              {errors.mobileNumber && <p className="text-xs text-rose-400 mt-1">{errors.mobileNumber.message}</p>}
            </div>

            {/* Role Select */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Registering As
              </label>
              <select
                className="w-full px-4 py-2.5 bg-slate-950/80 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition cursor-pointer"
                {...register('role')}
              >
                <option value="student">Student Representative</option>
                <option value="teacher">Faculty / Teacher</option>
                <option value="admin">System Administrator</option>
              </select>
            </div>

            {/* Conditional Admission Year (For Students) */}
            {selectedRole === 'student' && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Admission Year
                </label>
                <input
                  type="number"
                  min="2018"
                  max="2030"
                  className="w-full px-4 py-2.5 bg-slate-950/80 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                  {...register('admissionYear', {
                    required: 'Admission year is required for student accounts',
                  })}
                />
                {errors.admissionYear && (
                  <p className="text-xs text-rose-400 mt-1">{errors.admissionYear.message}</p>
                )}
              </div>
            )}

            {/* Single-Use Dashboard Passkey / OTP */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                {selectedRole === 'admin'
                  ? 'System Admin Master Passkey'
                  : '8-Digit Dashboard Invite Token'}
              </label>
              <div className="relative">
                <input
                  type={showPasskey ? 'text' : 'password'}
                  placeholder={
                    selectedRole === 'admin' ? 'Master security key' : '8-digit one-time invite token'
                  }
                  className="w-full pl-4 pr-11 py-2.5 bg-slate-950/80 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                  {...register('passkey', { required: 'Passkey is required' })}
                />
                <button
                  type="button"
                  onClick={() => setShowPasskey(!showPasskey)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition focus:outline-none cursor-pointer"
                  aria-label={showPasskey ? 'Hide passkey' : 'Show passkey'}
                >
                  {showPasskey ? <EyeSlashIcon /> : <EyeIcon />}
                </button>
              </div>
              {errors.passkey && <p className="text-xs text-rose-400 mt-1">{errors.passkey.message}</p>}
            </div>

            {/* Create Password with Eye Button */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Create Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Minimum 6 characters"
                  className="w-full pl-4 pr-11 py-2.5 bg-slate-950/80 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                  {...register('password', {
                    required: 'Password is required',
                    minLength: { value: 6, message: 'Password must be at least 6 characters' },
                  })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition focus:outline-none cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeSlashIcon /> : <EyeIcon />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-rose-400 mt-1">{errors.password.message}</p>}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || isAnalyzingFace}
              className="w-full mt-3 py-3 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-full text-sm transition shadow-lg shadow-indigo-600/25 cursor-pointer flex items-center justify-center gap-2"
            >
              {isSubmitting ? 'Registering...' : 'Complete Registration'}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-800 text-center flex flex-col gap-2 relative z-10 text-xs text-slate-400">
            <p>
              Already registered?{' '}
              <Link to="/login" className="text-white hover:text-indigo-300 font-medium transition">
                Sign in here
              </Link>
            </p>
            <Link to="/" className="text-slate-400 hover:text-slate-200 transition">
              &larr; Return to CanReal Home
            </Link>
          </div>
        </div>
      </main>

      <footer className="text-center py-4 text-xs text-slate-600">
        CanReal &bull; Structured Notes, PYQs & Syllabi
      </footer>
    </div>
  );
}