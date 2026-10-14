import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, UserRound, IdCard, Languages, Palette, BookOpen, Code2, LogOut, MessageCircle } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore.js';
import { useTranslation } from '../lib/i18n.js';

export default function Navbar() {
  const { authUser, logout } = useAuthStore();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => setMenuOpen(false), [location.pathname, location.hash]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const closeOnOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setMenuOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [menuOpen]);

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    navigate('/login', { replace: true });
  };

  const items = [
    { label: t('Profile'), description: t('Update your photo and personal information'), icon: UserRound, to: '/profile' },
    { label: t('Account'), description: t('Email, account status and membership details'), icon: IdCard, to: '/profile#account' },
    { label: t('App language'), description: t('Choose your preferred language'), icon: Languages, to: '/settings#app-language' },
    { label: t('App theme'), description: t('Customize the app appearance'), icon: Palette, to: '/settings#app-theme' },
    { label: t('How to Use'), description: t('Learn how to find contacts and chat'), icon: BookOpen, to: '/settings#how-to-use' },
    { label: t('About Developer'), description: t('Learn about the creator of ChatKaro'), icon: Code2, to: '/settings#about-developer' },
  ];

  return (
    <nav className="navbar app-navbar sticky top-0 z-50 border-b border-base-300 bg-base-200 px-3 sm:px-4">
      <div className="flex-1">
        <Link to="/" className="group flex items-center gap-2" aria-label={t('ChatKaro Home')}>
          <img src="/chatkaro-logo.png" alt="" className="brand-logo h-8 w-8 object-contain transition-transform group-hover:scale-105" />
          <span className="text-base font-bold tracking-tight sm:text-lg">ChatKaro</span>
        </Link>
      </div>

      {authUser && (
        <div className="relative flex-none" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="btn btn-ghost btn-square min-h-11 min-w-11"
            aria-label={menuOpen ? t('Close menu') : t('Open menu')}
            aria-expanded={menuOpen}
            aria-controls="chatkaro-account-menu"
          >
            {menuOpen ? <X size={25} /> : <Menu size={28} strokeWidth={2.5} />}
          </button>

          {menuOpen && (
            <>
              <button type="button" aria-label={t('Close menu')} className="fixed inset-0 z-40 cursor-default bg-black/30 sm:bg-transparent" onClick={() => setMenuOpen(false)} />
              <section
                id="chatkaro-account-menu"
                className="absolute right-0 top-[calc(100%+0.6rem)] z-50 w-[min(21rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-base-300 bg-base-100 text-base-content shadow-2xl"
                aria-label={t('Account and app menu')}
              >
                <div className="flex items-center gap-3 border-b border-base-300 bg-base-200/70 p-4">
                  <div className="avatar placeholder">
                    <div className="h-12 w-12 overflow-hidden rounded-full bg-primary text-primary-content">
                      {authUser.profilePic
                        ? <img src={authUser.profilePic} alt="" className="h-full w-full object-cover" />
                        : <span className="text-lg font-semibold">{(authUser.fullName || '?').trim().charAt(0).toUpperCase()}</span>}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{authUser.fullName || t('ChatKaro user')}</p>
                    <p className="truncate text-xs opacity-65">{authUser.email || ''}</p>
                  </div>
                  <MessageCircle size={19} className="shrink-0 text-primary" />
                </div>

                <div className="max-h-[min(70vh,34rem)] overflow-y-auto p-2">
                  {items.map(({ label, description, icon: Icon, to }) => (
                    <Link
                      key={label}
                      to={to}
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-base-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon size={20} /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold">{label}</span>
                        <span className="mt-0.5 block text-xs leading-snug opacity-60">{description}</span>
                      </span>
                    </Link>
                  ))}
                </div>

                <div className="border-t border-base-300 p-2">
                  <button type="button" onClick={handleLogout} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-error transition-colors hover:bg-error/10">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-error/10"><LogOut size={20} /></span>
                    <span>
                      <span className="block text-sm font-semibold">{t('Logout')}</span>
                      <span className="mt-0.5 block text-xs opacity-65">{t('Sign out of your ChatKaro account')}</span>
                    </span>
                  </button>
                </div>
              </section>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
