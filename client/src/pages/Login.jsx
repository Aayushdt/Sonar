import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
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
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-bg">
      {/* ── Left brand panel (always dark) ──────────────────────────── */}
      <div className="hidden lg:flex flex-col justify-between w-2/5 bg-panel p-10">
        <div>
          <h1 className="text-4xl font-bold text-panel-text mb-3">🔊 Sonar</h1>
          <p className="text-panel-text-2 text-lg leading-relaxed">
            Crystal-clear 1-to-1 video calling and real-time chat.
            <br />
            <span className="text-panel-accent font-semibold">Stay connected.</span>
          </p>
        </div>
        <ul className="space-y-3 text-panel-text-2 text-sm">
          <li className="flex items-center gap-2">
            <span className="text-panel-accent">✦</span> Managed video via Daily.co
          </li>
          <li className="flex items-center gap-2">
            <span className="text-panel-accent">✦</span> Real-time presence & signaling
          </li>
          <li className="flex items-center gap-2">
            <span className="text-panel-accent">✦</span> Ephemeral in-call chat
          </li>
          <li className="flex items-center gap-2">
            <span className="text-panel-accent">✦</span> Full call history log
          </li>
        </ul>
      </div>

      {/* ── Right: Login form ────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-8">
            <h1 className="text-3xl font-bold text-primary">🔊 Sonar</h1>
          </div>

          <h2 className="text-2xl font-bold text-text mb-1">Welcome back</h2>
          <p className="text-text-muted text-sm mb-8">Sign in to your account to continue</p>

          {error && (
            <div className="mb-5 px-4 py-3 rounded-lg bg-danger-tint border border-danger/30 text-danger text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-2 mb-1">Email</label>
              <input
                id="login-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                value={form.email}
                onChange={handleChange}
                placeholder="you@example.com"
                className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-sm
                           text-text placeholder-text-muted outline-none
                           focus:ring-2 focus:ring-focus-ring focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-2 mb-1">Password</label>
              <input
                id="login-password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                value={form.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-sm
                           text-text placeholder-text-muted outline-none
                           focus:ring-2 focus:ring-focus-ring focus:border-transparent transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-sm
                         bg-primary hover:bg-primary-hover text-on-primary
                         disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-text-muted">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="text-primary font-semibold hover:underline">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
