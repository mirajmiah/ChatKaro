import { useState, useEffect, useRef } from 'react';
import { Check, X, Loader2, Sparkles, UserRound, ArrowRight } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore.js';
import { useTranslation } from '../lib/i18n.js';
import Logo from './Logo.jsx';
import api from '../lib/axios.js';

export default function UsernameSetupModal() {
  const { authUser, updateUsername, logout } = useAuthStore();
  const { t } = useTranslation();

  const [username, setUsername] = useState('');
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [available, setAvailable] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [initialBase, setInitialBase] = useState('');
  const debounceTimer = useRef(null);

  // Initialize with initial username or Google name/email
  useEffect(() => {
    if (!authUser) return;
    const initial = (authUser.username || authUser.fullName || authUser.email || '')
      .split('@')[0]
      .toLowerCase()
      .replace(/[^a-z0-9._]/g, '_')
      .replace(/^\.+|\.+$/g, '')
      .slice(0, 25);

    setUsername(initial);
    setInitialBase(initial);
    checkAvailability(initial, true);
  }, [authUser?._id]);

  const checkAvailability = async (cand, fetchSuggestions = false) => {
    const clean = (cand || '').trim().replace(/^@+/, '');
    if (!clean) {
      setAvailable(null);
      setErrorMsg('');
      setChecking(false);
      return;
    }

    setChecking(true);
    try {
      const res = await api.get('/auth/check-username', {
        params: {
          username: clean,
          suggest: fetchSuggestions ? 'true' : undefined,
        },
      });

      if (res.data.valid && res.data.available) {
        setAvailable(true);
        setErrorMsg('');
      } else {
        setAvailable(false);
        setErrorMsg(res.data.message || t('Username is not available.'));
      }

      if (Array.isArray(res.data.suggestions) && res.data.suggestions.length > 0) {
        setSuggestions(res.data.suggestions);
      }
    } catch {
      setAvailable(false);
      setErrorMsg(t('Unable to verify username.'));
    } finally {
      setChecking(false);
    }
  };

  const handleInputChange = (e) => {
    const val = e.target.value.toLowerCase().replace(/\s/g, '');
    setUsername(val);
    setAvailable(null);
    setErrorMsg('');

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      checkAvailability(val, false);
    }, 350);
  };

  const handleSelectSuggestion = (sug) => {
    setUsername(sug);
    checkAvailability(sug, false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const clean = username.trim().replace(/^@+/, '');
    if (!clean || !available || checking || saving) return;

    setSaving(true);
    try {
      await updateUsername(clean);
    } catch {
      // Error handled by store toast
    } finally {
      setSaving(false);
    }
  };

  // Only show if user is logged in and needs to setup username
  if (!authUser || !authUser.needsUsername) return null;

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="setup-username-title"
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-base-300 bg-base-100 p-6 sm:p-8 text-base-content shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Brand header */}
        <div className="flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 mb-3">
            <Logo className="h-7 w-7" />
            <span className="text-xl font-black tracking-tight bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Talksy
            </span>
          </div>

          {/* User Google Avatar / Greeting */}
          <div className="relative mb-3">
            {authUser.profilePic ? (
              <img
                src={authUser.profilePic}
                alt={authUser.fullName}
                className="h-16 w-16 rounded-full border-2 border-primary object-cover shadow-md"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary border-2 border-primary">
                <UserRound size={32} />
              </div>
            )}
            <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-content text-xs shadow">
              <Sparkles size={13} />
            </span>
          </div>

          <h2 id="setup-username-title" className="text-xl font-bold tracking-tight">
            {t('Welcome, {name}!', { name: authUser.fullName || 'there' })}
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-base-content/70">
            {t('Choose a unique username so friends can discover and connect with you on Talksy.')}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="setup-username-input" className="block text-xs font-semibold uppercase tracking-wider text-base-content/70 mb-1.5">
              {t('Username')}
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-base-content/50 font-bold">
                @
              </span>
              <input
                id="setup-username-input"
                type="text"
                autoFocus
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck="false"
                maxLength={30}
                value={username}
                onChange={handleInputChange}
                placeholder="username"
                className={`input input-bordered w-full pl-8 pr-10 font-medium ${
                  available === true
                    ? 'input-success focus:border-success'
                    : available === false
                    ? 'input-error focus:border-error'
                    : ''
                }`}
              />

              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                {checking ? (
                  <Loader2 size={18} className="animate-spin text-primary" />
                ) : available === true ? (
                  <Check size={18} className="text-success stroke-[2.5]" />
                ) : available === false ? (
                  <X size={18} className="text-error stroke-[2.5]" />
                ) : null}
              </div>
            </div>

            {/* Validation / Availability feedback */}
            <div className="min-h-[1.25rem] mt-1.5 text-xs">
              {checking ? (
                <span className="text-base-content/60">{t('Checking availability...')}</span>
              ) : available === true ? (
                <span className="text-success font-medium flex items-center gap-1">
                  <Check size={12} /> {t('Username is available!')}
                </span>
              ) : errorMsg ? (
                <span className="text-error font-medium">{errorMsg}</span>
              ) : (
                <span className="text-base-content/50">
                  {t('1-30 characters, letters, numbers, underscores, and dots.')}
                </span>
              )}
            </div>
          </div>

          {/* Suggested usernames */}
          {suggestions.length > 0 && (
            <div className="rounded-xl border border-base-300 bg-base-200/50 p-3">
              <span className="block text-xs font-semibold text-base-content/70 mb-2">
                {t('Suggested for you:')}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {suggestions.map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => handleSelectSuggestion(sug)}
                    className={`badge badge-outline gap-1 py-3 px-2.5 text-xs font-medium transition-all ${
                      username === sug
                        ? 'badge-primary scale-105'
                        : 'hover:bg-primary/10 hover:border-primary'
                    }`}
                  >
                    @{sug}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={!available || checking || saving}
            className="btn btn-primary w-full gap-2 text-base font-semibold shadow-lg shadow-primary/20 disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>{t('Setting up username...')}</span>
              </>
            ) : (
              <>
                <span>{t('Continue to Talksy')}</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        {/* Footer logout fallback */}
        <div className="mt-5 text-center">
          <button
            type="button"
            onClick={logout}
            className="text-xs text-base-content/50 hover:text-error underline transition-colors"
          >
            {t('Not you? Log out')}
          </button>
        </div>
      </div>
    </div>
  );
}
