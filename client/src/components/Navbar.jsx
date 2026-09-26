import { motion } from 'motion/react';
import { Radio, Users, Moon, Sun, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

const Navbar = ({ theme, onToggleTheme }) => {
  const { user, logout } = useAuth();
  const { onlineUserIds } = useSocket();

  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : 'U';

  return (
    <header className="sticky top-0 z-40 bg-surface/90 dark:bg-surface-dark/90 backdrop-blur-md border-b border-border dark:border-border-dark transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand / Frequency Station */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-primary text-on-primary shadow-tactile-sm">
            <Radio className="w-5 h-5 text-on-primary animate-pulse" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-accent dark:bg-accent-dark ring-2 ring-surface dark:ring-surface-dark" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-bold text-xl tracking-tight text-text dark:text-text-dark">
                SONAR
              </span>
              <span className="hidden sm:inline-block text-[10px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded bg-surface-2 dark:bg-surface-2-dark text-text-muted dark:text-text-muted-dark border border-border/60 dark:border-border-dark/60">
                v1.2 // AUDIO-RTC
              </span>
            </div>
          </div>
        </div>

        {/* Right Station Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Real-time Frequency / Presence Beacon */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-2/80 dark:bg-surface-2-dark/80 border border-border dark:border-border-dark text-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-success dark:bg-success-dark" />
            </span>
            <Users className="w-3.5 h-3.5 text-text-muted dark:text-text-muted-dark" />
            <span className="font-mono font-medium text-text dark:text-text-dark">
              {onlineUserIds.length}
            </span>
            <span className="hidden md:inline text-text-muted dark:text-text-muted-dark text-[11px]">
              online
            </span>
          </div>

          {/* Theme Toggle Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onToggleTheme}
            className="w-9 h-9 rounded-xl flex items-center justify-center bg-surface-2/80 dark:bg-surface-2-dark/80 border border-border dark:border-border-dark text-text-muted hover:text-text dark:text-text-muted-dark dark:hover:text-text-dark transition-colors"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-accent-dark" />
            ) : (
              <Moon className="w-4 h-4 text-secondary" />
            )}
          </motion.button>

          {/* User Capsule */}
          {user && (
            <div className="hidden sm:flex items-center gap-2.5 pl-2 pr-3 py-1 rounded-xl bg-surface-2/60 dark:bg-surface-2-dark/60 border border-border/80 dark:border-border-dark/80">
              <div className="w-7 h-7 rounded-lg bg-primary-tint dark:bg-primary-tint-dark text-primary dark:text-primary-dark font-display font-bold text-xs flex items-center justify-center border border-primary/20">
                {userInitial}
              </div>
              <span className="font-medium text-xs text-text dark:text-text-dark max-w-[120px] truncate">
                {user.name}
              </span>
            </div>
          )}

          {/* Sign Out Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            onClick={logout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium text-xs bg-surface-2 dark:bg-surface-2-dark hover:bg-primary hover:text-on-primary dark:hover:bg-primary-dark dark:hover:text-on-primary-dark text-text-2 dark:text-text-2-dark border border-border dark:border-border-dark transition-all duration-200"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Disconnect</span>
          </motion.button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
