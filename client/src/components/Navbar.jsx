import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

const Navbar = ({ theme, onToggleTheme }) => {
  const { user, logout } = useAuth();
  const { onlineUserIds } = useSocket();

  return (
    <nav className="sticky top-0 z-40 bg-surface border-b border-border shadow-sonar-light
                    [data-theme='dark']:bg-surface-dark [data-theme='dark']:border-border-dark [data-theme='dark']:shadow-sonar-dark">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-primary">🔊 Sonar</span>
        </div>

        {/* Right section */}
        <div className="flex items-center gap-3">
          {/* Online count badge */}
          <span className="hidden sm:flex items-center gap-1.5 text-xs font-medium px-2.5 py-1
                           bg-success-tint text-success rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-success inline-block animate-pulse" />
            {onlineUserIds.length} online
          </span>

          {/* Theme toggle */}
          <button
            onClick={onToggleTheme}
            className="p-2 rounded-full text-text-muted hover:bg-surface-2 transition-colors"
            title="Toggle theme"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          {/* User name */}
          {user && (
            <span className="hidden sm:block text-sm font-medium text-text-2">
              {user.name}
            </span>
          )}

          {/* Logout */}
          <button
            onClick={logout}
            className="text-sm font-semibold px-3 py-1.5 rounded-lg
                       bg-primary hover:bg-primary-hover text-on-primary transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
