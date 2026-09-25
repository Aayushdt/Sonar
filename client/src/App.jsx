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
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-primary/30 border-t-primary
                          rounded-full animate-spin mx-auto" />
          <p className="text-text-muted text-sm">Loading Sonar…</p>
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
