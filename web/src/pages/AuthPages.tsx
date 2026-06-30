import React, { useState, useEffect } from 'react';
import { Logo } from '../components/Logo';
import { Mail, Lock, LogIn, ArrowRight, Shield, Radio, Globe, Cpu } from 'lucide-react';
import { api } from '../utils/api';
import type { User } from '../utils/api';
import { signInWithGoogle, initMessaging } from '../utils/firebase';

interface AuthPagesProps {
  onLoginSuccess: (user: User) => void;
}

export const AuthPages: React.FC<AuthPagesProps> = ({ onLoginSuccess }) => {
  const [showSplash, setShowSplash] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loadingText, setLoadingText] = useState('Initializing digital twin engine...');

  // Live clock
  useEffect(() => {
    const clock = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(clock);
  }, []);

  // Splash sequence
  useEffect(() => {
    const texts = [
      'Initializing digital twin engine...',
      'Connecting to geospatial intelligence nodes...',
      'Calibrating emergency response protocols...',
      'Establishing WebSocket grid sync...',
      'AEGIS X Ready.',
    ];
    let idx = 0;
    const interval = setInterval(() => {
      idx += 1;
      if (idx < texts.length) {
        setLoadingText(texts[idx]);
      }
    }, 500);

    const phaseTimer = setTimeout(() => {}, 2200);
    const exitTimer = setTimeout(() => {
      setShowSplash(false);
    }, 2800);

    return () => {
      clearInterval(interval);
      clearTimeout(phaseTimer);
      clearTimeout(exitTimer);
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { setError('Please enter your email'); return; }
    setLoading(true);
    setError('');
    try {
      const response = await api.login(email);
      onLoginSuccess(response.user);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (roleEmail: string) => {
    setLoading(true);
    setError('');
    try {
      const response = await api.login(roleEmail);
      onLoginSuccess(response.user);
    } catch {
      setError('Quick login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await signInWithGoogle();
      const fbUser = result.user;
      const response = await api.loginWithFirebase(
        fbUser.uid,
        fbUser.email || '',
        fbUser.displayName || undefined,
        fbUser.photoURL || undefined
      );
      // Try to get FCM token in background
      initMessaging().catch(() => {});
      onLoginSuccess(response.user);
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user') {
        setError('Sign-in cancelled.');
      } else {
        setError(err?.message || 'Google sign-in failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------
  // SPLASH SCREEN
  // -------------------------------------------------------
  if (showSplash) {
    return (
      <div className="fixed inset-0 bg-[#0B1929] z-50 flex flex-col items-center justify-center overflow-hidden">
        {/* Animated grid background */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `linear-gradient(#5DADE2 1px, transparent 1px), linear-gradient(90deg, #5DADE2 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
            animation: 'gridPan 20s linear infinite',
          }}
        />

        {/* Radial glow */}
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(circle at 50% 50%, rgba(93,173,226,0.12) 0%, transparent 65%)',
        }} />

        {/* Floating pulse rings */}
        <div className="absolute" style={{
          width: 400, height: 400,
          border: '1px solid rgba(93,173,226,0.15)',
          borderRadius: '50%',
          animation: 'expandRing 3s ease-out infinite',
        }} />
        <div className="absolute" style={{
          width: 600, height: 600,
          border: '1px solid rgba(93,173,226,0.08)',
          borderRadius: '50%',
          animation: 'expandRing 3s ease-out 1s infinite',
        }} />

        {/* Main Content */}
        <div className="z-10 flex flex-col items-center text-center px-6">
          <div style={{ animation: 'fadeInUp 0.6s ease forwards' }}>
            <Logo size="xl" animate={true} />
          </div>

          <h1
            className="text-5xl font-black tracking-[0.25em] text-white mt-8"
            style={{ animation: 'fadeInUp 0.6s ease 0.2s both', fontFamily: "'Outfit', sans-serif" }}
          >
            AEGIS <span style={{ color: '#5DADE2' }}>X</span>
          </h1>

          <p
            className="text-sm tracking-[0.5em] uppercase font-medium mt-3"
            style={{ color: '#85C1E9', animation: 'fadeInUp 0.6s ease 0.4s both' }}
          >
            Predict. Simulate. Respond.
          </p>

          {/* Status line */}
          <div
            className="mt-10 font-mono text-xs tracking-widest"
            style={{ color: '#5DADE2', animation: 'fadeInUp 0.6s ease 0.6s both' }}
          >
            <span className="inline-block w-2 h-2 rounded-full bg-green-400 mr-2 animate-pulse" />
            {loadingText}
          </div>

          {/* Progress bar */}
          <div
            className="w-64 h-0.5 bg-white/10 rounded-full mt-4 overflow-hidden"
            style={{ animation: 'fadeInUp 0.6s ease 0.7s both' }}
          >
            <div
              className="h-full rounded-full"
              style={{
                background: 'linear-gradient(90deg, #2E86C1, #5DADE2, #85C1E9)',
                animation: 'progressFill 2.5s cubic-bezier(0.4,0,0.2,1) forwards',
                boxShadow: '0 0 12px rgba(93,173,226,0.6)',
              }}
            />
          </div>

          {/* System stats row */}
          <div
            className="flex gap-6 mt-8 text-[10px] font-mono"
            style={{ color: 'rgba(133,193,233,0.6)', animation: 'fadeInUp 0.6s ease 0.8s both' }}
          >
            <span>NODES: 12/12</span>
            <span>LATENCY: 14ms</span>
            <span>VERSION: 2.4.1</span>
          </div>
        </div>

        {/* Corner decorations */}
        <div className="absolute top-6 left-6 text-[10px] font-mono text-white/20 tracking-widest">
          AEGIS_X // URBAN_TWIN_OS v2.4
        </div>
        <div className="absolute top-6 right-6 text-[10px] font-mono text-white/20 tracking-widest">
          {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
        <div className="absolute bottom-6 left-6 text-[10px] font-mono text-white/20">
          SYS_STATUS: NOMINAL
        </div>
        <div className="absolute bottom-6 right-6 text-[10px] font-mono text-white/20">
          GRID_SYNC: ACTIVE
        </div>
      </div>
    );
  }

  // -------------------------------------------------------
  // LOGIN SCREEN
  // -------------------------------------------------------
  return (
    <div className="min-h-screen flex overflow-hidden relative" style={{ background: '#F0F5FB' }}>

      {/* LEFT PANEL – Cinematic Brand Side */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(145deg, #0D2137 0%, #1A3A5C 60%, #0F2A44 100%)' }}
      >
        {/* Animated grid */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: `linear-gradient(#5DADE2 1px, transparent 1px), linear-gradient(90deg, #5DADE2 1px, transparent 1px)`,
            backgroundSize: '50px 50px',
          }}
        />

        {/* Radial glow center */}
        <div className="absolute" style={{
          top: '30%', left: '50%', transform: 'translate(-50%,-50%)',
          width: 500, height: 500,
          background: 'radial-gradient(circle, rgba(93,173,226,0.15) 0%, transparent 70%)',
          borderRadius: '50%',
        }} />

        {/* Pulse rings */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ zIndex: 0 }}>
          {[200, 320, 440, 560].map((size, i) => (
            <div key={i} className="absolute top-1/2 left-1/2" style={{
              width: size, height: size,
              marginLeft: -size / 2, marginTop: -size / 2,
              border: '1px solid rgba(93,173,226,0.12)',
              borderRadius: '50%',
              animation: `expandRing 4s ease-out ${i * 0.8}s infinite`,
            }} />
          ))}
        </div>

        {/* Top brand */}
        <div className="z-10 flex items-center gap-3">
          <Logo size="sm" animate={true} />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-white tracking-wider text-lg">AEGIS</span>
              <span className="font-black tracking-wider text-lg" style={{ color: '#5DADE2' }}>X</span>
            </div>
            <div className="text-[9px] tracking-[0.35em] uppercase font-semibold" style={{ color: '#85C1E9' }}>
              Predict • Simulate • Respond
            </div>
          </div>
        </div>

        {/* Center headline */}
        <div className="z-10 flex-1 flex flex-col justify-center py-12">
          <div className="text-[10px] font-mono tracking-[0.4em] uppercase mb-6" style={{ color: '#5DADE2' }}>
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400 mr-2 animate-pulse" />
            SYSTEM ONLINE
          </div>
          <h2 className="text-4xl font-black text-white leading-tight mb-4" style={{ fontFamily: "'Outfit', sans-serif" }}>
            AI-Powered<br />Urban Emergency<br /><span style={{ color: '#5DADE2' }}>Digital Twin</span>
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: '#85C1E9', maxWidth: 380 }}>
            Real-time geospatial intelligence for emergency operations centers. Monitor, simulate, and coordinate city-wide disaster response with AI precision.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-2 mt-8">
            {[
              { icon: <Globe size={11} />, label: 'Live Geospatial Twin' },
              { icon: <Cpu size={11} />, label: 'AI Copilot Engine' },
              { icon: <Radio size={11} />, label: 'WebSocket Sync' },
              { icon: <Shield size={11} />, label: 'Multi-Role Access' },
            ].map(({ icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold"
                style={{
                  background: 'rgba(93,173,226,0.1)',
                  border: '1px solid rgba(93,173,226,0.25)',
                  color: '#85C1E9',
                }}
              >
                {icon}
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom stats */}
        <div className="z-10 grid grid-cols-3 gap-4">
          {[
            { value: '99.9%', label: 'Uptime SLA' },
            { value: '<14ms', label: 'Sync Latency' },
            { value: '24/7', label: 'Operations' },
          ].map(({ value, label }) => (
            <div key={label} className="text-center">
              <div className="text-xl font-black text-white">{value}</div>
              <div className="text-[9px] uppercase tracking-widest font-semibold mt-0.5" style={{ color: '#5DADE2' }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT PANEL – Auth Form */}
      <div className="flex-1 flex items-center justify-center p-8 relative">
        {/* Subtle bg blobs */}
        <div className="absolute top-0 right-0 w-72 h-72 rounded-full pointer-events-none" style={{
          background: 'radial-gradient(circle, rgba(93,173,226,0.06) 0%, transparent 70%)',
          transform: 'translate(30%, -30%)',
        }} />

        <div className="w-full max-w-md z-10">

          {/* Mobile logo (shown only on small screens) */}
          <div className="flex lg:hidden items-center gap-2 justify-center mb-8">
            <Logo size="sm" animate={false} />
            <span className="font-black text-xl text-[#1E3A5F]">AEGIS <span className="text-[#5DADE2]">X</span></span>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h2 className="text-2xl font-black text-[#1E3A5F]" style={{ fontFamily: "'Outfit', sans-serif" }}>
              Establish Connection
            </h2>
            <p className="text-sm text-[#64748B] mt-1">
              Authenticate with your agency credentials to access the command grid.
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-lg text-sm font-medium flex items-center gap-2"
              style={{ background: 'rgba(230,57,70,0.08)', border: '1px solid rgba(230,57,70,0.2)', color: '#E63946' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-[#E63946] flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: '#1E3A5F' }}>
                Agency Email
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="any@email.com"
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm text-[#1F2937] transition-all"
                  style={{
                    background: 'white',
                    border: '1.5px solid #E6EEF5',
                    outline: 'none',
                  }}
                  onFocus={(e) => { e.target.style.borderColor = '#5DADE2'; e.target.style.boxShadow = '0 0 0 3px rgba(93,173,226,0.15)'; }}
                  onBlur={(e) => { e.target.style.borderColor = '#E6EEF5'; e.target.style.boxShadow = 'none'; }}
                />
              </div>
              <p className="text-[10px] mt-1.5" style={{ color: '#94A3B8' }}>
                ✦ Any email works — new accounts are auto-created as Citizen
              </p>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: '#1E3A5F' }}>
                Security Passkey
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm text-[#1F2937] transition-all"
                  style={{
                    background: 'white',
                    border: '1.5px solid #E6EEF5',
                    outline: 'none',
                  }}
                  onFocus={(e) => { e.target.style.borderColor = '#5DADE2'; e.target.style.boxShadow = '0 0 0 3px rgba(93,173,226,0.15)'; }}
                  onBlur={(e) => { e.target.style.borderColor = '#E6EEF5'; e.target.style.boxShadow = 'none'; }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-[#64748B]">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" defaultChecked className="rounded" style={{ accentColor: '#5DADE2' }} />
                Remember session token
              </label>
              <a href="#reset" className="font-semibold hover:text-[#1E3A5F] transition-colors" style={{ color: '#5DADE2' }}>
                Reset passkey
              </a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg font-bold text-sm uppercase tracking-wider text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              style={{
                background: loading ? '#2C5282' : 'linear-gradient(135deg, #1E3A5F 0%, #2C5282 100%)',
                boxShadow: '0 4px 20px rgba(30,58,95,0.25)',
              }}
            >
              {loading ? (
                <span className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              ) : (
                <>
                  Establish Connection
                  <LogIn size={16} />
                </>
              )}
            </button>
          </form>

          {/* Google Sign-In */}
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-[#E6EEF5]" />
            <span className="text-[9px] font-bold uppercase tracking-widest text-[#64748B]">or</span>
            <div className="flex-1 h-px bg-[#E6EEF5]" />
          </div>
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-3 transition-all active:scale-[0.98] border"
            style={{ background: 'white', borderColor: '#E6EEF5', color: '#1E3A5F', boxShadow: '0 2px 8px rgba(30,58,95,0.08)' }}
          >
            {/* Google SVG */}
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.14 0 5.95 1.08 8.17 2.84l6.09-6.09C34.5 3.03 29.53 1 24 1 14.82 1 7.06 6.66 3.79 14.65l7.1 5.52C12.62 13.65 17.85 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.1 24.5c0-1.6-.14-3.13-.4-4.6H24v8.7h12.43c-.54 2.87-2.15 5.3-4.57 6.93l7.1 5.52C43.27 37.1 46.1 31.3 46.1 24.5z"/>
              <path fill="#FBBC05" d="M10.89 28.17A14.55 14.55 0 0 1 9.5 24c0-1.44.25-2.83.7-4.13l-7.1-5.52A23.9 23.9 0 0 0 0 24c0 3.88.93 7.54 2.58 10.78l8.31-6.61z"/>
              <path fill="#34A853" d="M24 47c5.53 0 10.17-1.83 13.56-4.97l-7.1-5.52C28.7 38.17 26.44 39 24 39c-6.15 0-11.38-4.15-13.11-9.77l-8.31 6.61C6.06 43.34 14.52 47 24 47z"/>
            </svg>
            Continue with Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-[#E6EEF5]" />
            <span className="text-[9px] font-bold uppercase tracking-widest text-[#64748B]">Quick Authority Access</span>
            <div className="flex-1 h-px bg-[#E6EEF5]" />
          </div>


          {/* Quick login tiles */}
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { email: 'operator@aegis.com', role: 'Operator Console', dept: 'Command Control', color: '#1E3A5F', bg: 'rgba(30,58,95,0.04)' },
              { email: 'admin@aegis.com', role: 'Administrator', dept: 'System Control', color: '#2E8B57', bg: 'rgba(46,139,87,0.04)' },
              { email: 'responder@aegis.com', role: 'First Responder', dept: 'Field Operations', color: '#E63946', bg: 'rgba(230,57,70,0.04)' },
              { email: 'citizen@aegis.com', role: 'Citizen Reporter', dept: 'Public Access', color: '#5DADE2', bg: 'rgba(93,173,226,0.06)' },
            ].map(({ email: roleEmail, role, dept, color, bg }) => (
              <button
                key={roleEmail}
                onClick={() => handleQuickLogin(roleEmail)}
                disabled={loading}
                className="text-left p-3 rounded-xl transition-all active:scale-95 group"
                style={{
                  background: bg,
                  border: `1.5px solid ${color}20`,
                  opacity: loading ? 0.6 : 1,
                }}
              >
                <div className="text-[9px] font-bold uppercase tracking-wider mb-0.5" style={{ color: '#64748B' }}>{dept}</div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold" style={{ color: '#1E3A5F' }}>{role}</span>
                  <ArrowRight size={11} className="opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-0.5" style={{ color }} />
                </div>
              </button>
            ))}
          </div>

          {/* Footer */}
          <div className="mt-8 text-center text-[10px] text-[#64748B]">
            <span className="inline-block w-1 h-1 rounded-full bg-green-400 mr-1.5 align-middle animate-pulse" />
            All systems nominal • AEGIS X v2.4.1 •{' '}
            <span className="font-mono">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
      </div>

      {/* Global keyframe styles */}
      <style>{`
        @keyframes expandRing {
          0% { opacity: 0.4; transform: translate(-50%, -50%) scale(0.8); }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(1.4); }
        }
        @keyframes progressFill {
          from { width: 0%; }
          to { width: 100%; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes gridPan {
          from { background-position: 0 0; }
          to { background-position: 60px 60px; }
        }
      `}</style>
    </div>
  );
};

export default AuthPages;
