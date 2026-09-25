import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      await register(form.name, form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-bg">
      {/* ── Left brand panel ────────────────────────────────────────── */}
      <div className="hidden lg:flex flex-col justify-between w-2/5 bg-panel p-10">
        <div>
          <h1 className="text-4xl font-bold text-panel-text mb-3">🔊 Sonar</h1>
          <p className="text-panel-text-2 text-lg leading-relaxed">
            Join Sonar and start making crystal-clear video calls with anyone, anywhere.
            <br />
            <span className="text-panel-accent font-semibold">Create. Connect. Call.</span>
          </p>
        </div>
        <ul className="space-y-3 text-panel-text-2 text-sm">
          <li className="flex items-center gap-2">
            <span className="text-panel-accent">✦</span> Free to use
          </li>
          <li className="flex items-center gap-2">
            <span className="text-panel-accent">✦</span> HD video & audio
          </li>
          <li className="flex items-center gap-2">
            <span className="text-panel-accent">✦</span> Secure, ephemeral calls
          </li>
        </ul>
      </div>

      {/* ── Right: Register form ─────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-8">
            <h1 className="text-3xl font-bold text-primary">🔊 Sonar</h1>
          </div>

          <h2 className="text-2xl font-bold text-text mb-1">Create your account</h2>
          <p className="text-text-muted text-sm mb-8">Join Sonar to get started</p>

          {error && (
            <div className="mb-5 px-4 py-3 rounded-lg bg-danger-tint border border-danger/30 text-danger text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-2 mb-1">Full Name</label>
              <input
                id="register-name"
                name="name"
                type="text"
                required
                value={form.name}
                onChange={handleChange}
                placeholder="Alice Smith"
                className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-sm
                           text-text placeholder-text-muted outline-none
                           focus:ring-2 focus:ring-focus-ring focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-2 mb-1">Email</label>
              <input
                id="register-email"
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
                id="register-password"
                name="password"
                type="password"
                required
                autoComplete="new-password"
                value={form.password}
                onChange={handleChange}
                placeholder="Min. 6 characters"
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
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-text-muted">
            Already have an account?{' '}
            <Link to="/login" className="text-primary font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
