import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Mail, Lock, ArrowRight, Radio, AlertCircle, Eye, EyeOff, ShieldCheck, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-bg dark:bg-bg-dark text-text dark:text-text-dark bg-noise-subtle">
      {/* ── Left Editorial Masthead Panel (Always Dark/Deep Espresso) ── */}
      <div className="relative w-full lg:w-1/2 xl:w-7/12 bg-panel bg-noise p-8 lg:p-14 flex flex-col justify-between overflow-hidden border-b lg:border-b-0 lg:border-r border-border-dark/30">
        {/* Subtle Acoustic Wave Grid Graphic */}
        <div className="absolute inset-0 pointer-events-none opacity-10">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.8" className="text-panel-text" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Top Header & Frequency Chip */}
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-12">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-on-primary shadow-tactile-md">
                <Radio className="w-5 h-5 text-on-primary" />
              </div>
              <span className="font-display font-extrabold text-2xl tracking-tight text-panel-text">
                SONAR
              </span>
            </div>
            <span className="font-mono text-xs uppercase px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-panel-accent tracking-wider">
              CARRIER // EST. 2026
            </span>
          </div>

          {/* Oversized Typographic Masthead */}
          <div className="space-y-4">
            <span className="font-mono text-xs uppercase tracking-widest text-panel-accent font-semibold flex items-center gap-2">
              <span className="w-2 h-0.5 bg-panel-accent inline-block" />
              TELEMETRY & VIDEO INTERCOM
            </span>
            <h1 className="font-display font-extrabold text-5xl sm:text-6xl xl:text-7xl tracking-tighter text-panel-text leading-[0.92]">
              REAL-TIME <br />
              <span className="text-panel-accent">ACOUSTIC</span> <br />
              PRESENCE.
            </h1>
            <p className="text-panel-text-2 text-base sm:text-lg max-w-md font-normal leading-relaxed pt-2">
              Peer-to-peer 1-to-1 video conferencing, instant socket signaling, and zero-retention ephemeral communications.
            </p>
          </div>
        </div>

        {/* Bottom Bento Feature Capsules */}
        <div className="relative z-10 pt-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
            <div className="p-3.5 rounded-xl bg-white/[0.04] border border-white/10 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-panel-accent font-mono text-xs mb-1">
                <Zap className="w-3.5 h-3.5" /> LOW LATENCY
              </div>
              <p className="text-panel-text text-xs leading-snug">
                Sub-50ms signaling with Daily.co WebRTC audio-video streaming.
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-white/[0.04] border border-white/10 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-panel-accent font-mono text-xs mb-1">
                <ShieldCheck className="w-3.5 h-3.5" /> EPHEMERAL
              </div>
              <p className="text-panel-text text-xs leading-snug">
                Zero database chat retention. Instant room purge on call termination.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right Editorial Authentication Form ── */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 lg:p-16">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
          className="w-full max-w-md"
        >
          {/* Form Header */}
          <div className="mb-8">
            <span className="font-mono text-xs uppercase tracking-wider text-secondary dark:text-secondary-dark font-semibold">
              AUTHENTICATION // GATEWAY
            </span>
            <h2 className="font-display font-bold text-3xl sm:text-4xl text-text dark:text-text-dark tracking-tight mt-1">
              Welcome back
            </h2>
            <p className="text-text-muted dark:text-text-muted-dark text-sm mt-1.5">
              Enter your credentials to tune in to your frequency.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-6 p-4 rounded-xl bg-danger-tint dark:bg-danger-tint-dark border border-danger/30 text-danger dark:text-danger-dark text-xs flex items-start gap-3"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="login-email"
                className="block text-xs font-mono font-medium text-text-2 dark:text-text-2-dark uppercase tracking-wider mb-1.5"
              >
                Station Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted dark:text-text-muted-dark">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="operator@sonar.io"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-surface dark:bg-surface-dark border border-border dark:border-border-dark text-sm text-text dark:text-text-dark placeholder:text-text-muted/60 dark:placeholder:text-text-muted-dark/60 outline-none focus:ring-2 focus:ring-focus-ring dark:focus:ring-focus-ring-dark focus:border-transparent transition-all shadow-tactile-sm"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="login-password"
                  className="block text-xs font-mono font-medium text-text-2 dark:text-text-2-dark uppercase tracking-wider"
                >
                  Access Passphrase
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted dark:text-text-muted-dark">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-10 py-3 rounded-xl bg-surface dark:bg-surface-dark border border-border dark:border-border-dark text-sm text-text dark:text-text-dark placeholder:text-text-muted/60 dark:placeholder:text-text-muted-dark/60 outline-none focus:ring-2 focus:ring-focus-ring dark:focus:ring-focus-ring-dark focus:border-transparent transition-all shadow-tactile-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-text-muted hover:text-text dark:text-text-muted-dark dark:hover:text-text-dark"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <motion.button
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl font-display font-semibold text-sm bg-primary hover:bg-primary-hover dark:bg-primary-dark dark:hover:bg-primary-hover-dark text-on-primary dark:text-on-primary-dark shadow-tactile-md transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Initialize Session</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </motion.button>
          </form>

          {/* Switch to Register */}
          <div className="mt-8 pt-6 border-t border-border dark:border-border-dark flex items-center justify-between text-xs text-text-muted dark:text-text-muted-dark">
            <span>New station operator?</span>
            <Link
              to="/register"
              className="font-mono font-semibold text-primary dark:text-primary-dark hover:underline flex items-center gap-1"
            >
              Register Station &rarr;
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
