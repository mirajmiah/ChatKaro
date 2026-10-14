import { useState, useEffect, useRef, Fragment } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, ChevronDown, UserRound, ContactRound, Languages, Palette, BookOpen, Code2, LogOut } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore.js';
import { useTranslation } from '../lib/i18n.js';

export default function Navbar() {
  const { authUser, logout } = useAuthStore();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountExpanded, setAccountExpanded] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    // Always dismiss the menu when navigation changes, including Back to Chats.
    setMenuOpen(false);
    setAccountExpanded(false);
  }, [location.pathname, location.search, location.hash]);

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
    { label: t('Account'), description: t('Account details and sign-out options'), icon: ContactRound, to: '/profile#account' },
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
              <section
                id="chatkaro-account-menu"
                className="absolute right-0 top-[calc(100%+0.35rem)] z-50 w-[min(17rem,calc(100vw-1.25rem))] overflow-hidden rounded-xl border border-base-300 bg-base-100 text-base-content shadow-xl"
                aria-label={t('Account and app menu')}
              >
                <div className="max-h-[min(70vh,34rem)] overflow-y-auto p-1.5">
                  {items.map(({ label, description, icon: Icon, to }) => (
                    <Fragment key={label}>
                    {label === t('Account') ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setAccountExpanded((expanded) => !expanded)}
                          className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-base-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                          aria-expanded={accountExpanded}
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon size={19} /></span>
                          <span className="min-w-0 flex-1 text-sm font-medium">{label}</span>
                          <ChevronDown size={18} className={accountExpanded ? "rotate-180 transition-transform" : "transition-transform"} />
                        </button>
                        {accountExpanded && (
                          <div className="ml-5 border-l-2 border-base-300 py-1 pl-3">
                            <Link
                              to={to}
                              onClick={() => setMenuOpen(false)}
                              className="block rounded-lg px-3 py-2 text-sm transition-colors hover:bg-base-200"
                            >
                              {t('Account details')}
                            </Link>
                            <button
                              type="button"
                              onClick={handleLogout}
                              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-error transition-colors hover:bg-error/10"
                            >
                              <LogOut size={18} />
                              <span>
                                <span className="block text-sm font-semibold">{t('Logout')}</span>
                                <span className="block text-xs opacity-65">{t('Sign out of your ChatKaro account')}</span>
                              </span>
                            </button>
                          </div>
                        )}
                      </>
                    ) : (
                    <Link
                      key={label}
                      to={to}
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-base-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon size={19} /></span>
                      <span className="min-w-0 flex-1 text-sm font-medium">{label}</span>
                    </Link>
                    )}
                    </Fragment>
                  ))}
                </div>

              </section>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
