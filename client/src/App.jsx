import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import CallRoom from './pages/CallRoom';

// ─── Protected route guard ──────────────────────────────────────────────────
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg dark:bg-bg-dark text-text dark:text-text-dark bg-noise-subtle">
        <div className="text-center space-y-4 max-w-xs">
          <div className="relative mx-auto w-16 h-16 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-primary/20 dark:bg-primary-dark/20 animate-ping opacity-60" />
            <div className="relative w-14 h-14 rounded-2xl bg-surface dark:bg-surface-dark border border-border dark:border-border-dark flex items-center justify-center text-primary dark:text-primary-dark shadow-tactile-md">
              <div className="w-6 h-6 border-2 border-primary dark:border-primary-dark border-t-transparent rounded-full animate-spin" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="font-display font-bold text-sm tracking-tight text-text dark:text-text-dark">
              TUNING CARRIER FREQUENCY
            </p>
            <p className="text-[11px] font-mono text-text-muted dark:text-text-muted-dark">
              Initializing Station Auth & Signaling…
            </p>
          </div>
        </div>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// ─── Inner app (needs AuthContext available) ────────────────────────────────
const AuthenticatedLayout = () => {
  return (
    <ProtectedRoute>
      <SocketProvider>
        <Outlet />
      </SocketProvider>
    </ProtectedRoute>
  );
};

const AppInner = () => {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('sonar_theme') || 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('sonar_theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'));

  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Protected routes sharing a persistent Socket connection */}
      <Route element={<AuthenticatedLayout />}>
        <Route
          path="/dashboard"
          element={<Dashboard theme={theme} onToggleTheme={toggleTheme} />}
        />
        <Route path="/call/:callId" element={<CallRoom />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

// ─── Root App ───────────────────────────────────────────────────────────────
const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppInner />
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
