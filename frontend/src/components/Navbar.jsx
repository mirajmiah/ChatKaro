import { Link, useNavigate } from 'react-router-dom';
import { User, Settings, LogOut } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore.js';
import { useTranslation } from '../lib/i18n.js';

export default function Navbar() {
  const { authUser, logout } = useAuthStore();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav className="navbar app-navbar bg-base-200 border-b border-base-300 sticky top-0 z-50 px-2 sm:px-4">
      {/* Left — brand */}
      <div className="flex-1">
        <Link
          to="/"
          className="flex items-center gap-2 group"
          aria-label={t('ChatKaro Home')}
        >
          <img
            src="/chatkaro-logo.png"
            alt=""
            className="brand-logo w-8 h-8 object-contain group-hover:scale-105 transition-transform"
          />
          <span className="font-bold text-base sm:text-lg tracking-tight">
            ChatKaro
          </span>
        </Link>
      </div>

      {/* Right — actions */}
      <div className="flex-none gap-0 sm:gap-1">
        {authUser ? (
          <>
         <Link
              to="/profile"
              className="btn btn-ghost btn-sm min-h-10 min-w-10 gap-2"
              aria-label={t('Profile')}
            >
              <User size={18} />
              <span className="hidden md:inline">{t('Profile')}</span>
            </Link>
            <Link
              to="/settings"
              className="btn btn-ghost btn-sm min-h-10 min-w-10 gap-2"
              aria-label={t('Settings')}
            >
              <Settings size={18} />
              <span className="hidden md:inline">{t('Settings')}</span>
            </Link>
            <button
              onClick={handleLogout}
              className="btn btn-ghost btn-sm min-h-10 min-w-10 gap-2 text-error hover:bg-error/10"
              aria-label={t('Logout')}
            >
              <LogOut size={18} />
              <span className="hidden md:inline">{t('Logout')}</span>
            </button>
          </>
        ) : null}
      </div>
    </nav>
  );
}
