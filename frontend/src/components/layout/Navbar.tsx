import React from 'react';
import {
  Menu,
  Sun,
  Moon,
  Bell,
  ChevronDown,
  User,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

interface NavbarProps {
  onMenuClick: () => void;
  title?: string;
}

const roleColors: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  manager: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  staff: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
};

const Navbar: React.FC<NavbarProps> = ({ onMenuClick, title }) => {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const initials = user
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '??';

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      {/* Left: hamburger + title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200 lg:hidden"
          aria-label="Toggle sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>
        {title && (
          <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{title}</h1>
        )}
      </div>

      {/* Right: theme toggle + notifications + user */}
      <div className="flex items-center gap-2">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>

        {/* Notifications bell (placeholder) */}
        <button
          className="relative rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
        </button>

        {/* User dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen((v) => !v)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-sm font-semibold text-white">
              {initials}
            </div>
            <div className="hidden flex-col items-start md:flex">
              <span className="text-sm font-medium text-gray-800 dark:text-gray-100">
                {user?.name ?? 'Guest'}
              </span>
              {user?.role && (
                <span
                  className={`rounded-full px-1.5 py-0 text-xs font-medium capitalize ${
                    roleColors[user.role] ?? roleColors.staff
                  }`}
                >
                  {user.role}
                </span>
              )}
            </div>
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-1 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
              <div className="border-b border-gray-200 px-4 py-2 dark:border-gray-700">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{user?.name}</p>
                <p className="truncate text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
              </div>
              <a
                href="/settings"
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                onClick={() => setDropdownOpen(false)}
              >
                <User className="h-4 w-4" />
                Profile & Settings
              </a>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
