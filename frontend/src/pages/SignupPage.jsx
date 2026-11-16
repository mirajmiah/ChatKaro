import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Check, X } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuthStore } from '../store/useAuthStore.js';
import { useTranslation } from '../lib/i18n.js';
import Logo from '../components/Logo.jsx';

const USERNAME_REGEX = /^(?!.*\.\.)(?!^\.)[a-zA-Z0-9._]{1,30}(?<!\.)$/;

function validateClientUsername(username) {
  if (!username) return { isValid: false, error: '' };
  const trimmed = username.trim();
  if (trimmed.length < 1) return { isValid: false, error: 'Username must be at least 1 character long.' };
  if (trimmed.length > 30) return { isValid: false, error: 'Username cannot exceed 30 characters.' };
  if (/\s/.test(trimmed)) return { isValid: false, error: 'Username cannot contain spaces.' };
  if (trimmed.startsWith('.')) return { isValid: false, error: 'Username cannot start with a period.' };
  if (trimmed.endsWith('.')) return { isValid: false, error: 'Username cannot end with a period.' };
  if (trimmed.includes('..')) return { isValid: false, error: 'Username cannot contain consecutive periods.' };
  if (!/^[a-zA-Z0-9._]+$/.test(trimmed)) {
    return { isValid: false, error: 'Username can only contain letters, numbers, underscores (_), and periods (.).' };
  }
  if (!USERNAME_REGEX.test(trimmed)) {
    return { isValid: false, error: 'Invalid username format.' };
  }
  return { isValid: true, normalized: trimmed.toLowerCase() };
}

function SupportIllustration() {
  const { t } = useTranslation();
  return (
    <div className="relative hidden min-h-full overflow-hidden bg-[#a98be0] lg:flex lg:items-center lg:justify-center">
      <img
        src="/login-illustration.png"
        alt={t('A friendly person ready to chat')}
        className="h-full max-h-[760px] w-full max-w-[640px] object-contain"
      />
    </div>
  );
}

export default function SignUpPage() {
  const { signup, verifySignupOtp, resendSignupOtp, googleLogin, checkUsernameAvailability } = useAuthStore();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ fullName: '', username: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [verificationStep, setVerificationStep] = useState(false);
  const [otp, setOtp] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  // Username validation state
  const [usernameStatus, setUsernameStatus] = useState('idle'); // idle | checking | available | taken | invalid
  const [usernameError, setUsernameError] = useState('');
  const [usernameSuggestions, setUsernameSuggestions] = useState([]);
  const usernameCheckTimer = useRef(null);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const checkAvailability = async (cleaned) => {
    try {
      const res = await checkUsernameAvailability(cleaned);
      if (res.available) {
        setUsernameStatus('available');
        setUsernameError('');
        setUsernameSuggestions([]);
      } else {
        setUsernameStatus('taken');
        setUsernameError(res.error || 'Username is already taken.');
        setUsernameSuggestions(res.suggestions || []);
      }
    } catch {
      setUsernameStatus('invalid');
      setUsernameError('Unable to check username availability.');
    }
  };

  const handleUsernameChange = (event) => {
    const rawValue = event.target.value.replace(/^@+/, '');
    setFormData((prev) => ({ ...prev, username: rawValue }));

    if (usernameCheckTimer.current) {
      clearTimeout(usernameCheckTimer.current);
    }

    if (!rawValue.trim()) {
      setUsernameStatus('idle');
      setUsernameError('');
      setUsernameSuggestions([]);
      return;
    }

    const validation = validateClientUsername(rawValue);
    if (!validation.isValid) {
      setUsernameStatus('invalid');
      setUsernameError(validation.error);
      setUsernameSuggestions([]);
      return;
    }

    setUsernameStatus('checking');
    setUsernameError('');
    setUsernameSuggestions([]);

    usernameCheckTimer.current = setTimeout(() => {
      checkAvailability(validation.normalized);
    }, 350);
  };

  const handlePickSuggestion = (suggestion) => {
    setFormData((prev) => ({ ...prev, username: suggestion }));
    setUsernameStatus('available');
    setUsernameError('');
    setUsernameSuggestions([]);
  };

  const handleChange = (event) => {
    setFormData((previous) => ({ ...previous, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const validation = validateClientUsername(formData.username);
    if (!validation.isValid) {
      setUsernameStatus('invalid');
      setUsernameError(validation.error || 'Please choose a valid username.');
      return;
    }

    if (usernameStatus === 'taken' || usernameStatus === 'invalid') {
      return;
    }

    setIsLoading(true);
    try {
      await signup({
        ...formData,
        username: validation.normalized,
      });
      setVerificationStep(true);
      setResendCooldown(30);
    } catch {
      // Errors are reported by the auth store.
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (event) => {
    event.preventDefault();
    setIsVerifying(true);
    try {
      await verifySignupOtp(
        formData.email,
        otp,
        formData.fullName,
        formData.password,
        formData.username.trim().toLowerCase()
      );
      navigate('/');
    } catch {
      // Errors are reported by the auth store.
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendOtp = async () => {
    if (isResending || resendCooldown > 0) return;
    setIsResending(true);
    try {
      await resendSignupOtp(formData.email);
      setResendCooldown(30);
    } catch {
      // Errors are reported by the auth store.
    } finally {
      setIsResending(false);
    }
  };

  const passwordStrength = () => {
    const { password } = formData;
    if (!password) return null;
    if (password.length < 6) return { label: t('Too short'), color: 'text-red-600' };
    if (password.length < 8) return { label: t('Weak'), color: 'text-amber-600' };
    if (/[A-Z]/.test(password) && /[0-9]/.test(password)) return { label: t('Strong'), color: 'text-green-600' };
    return { label: t('Fair'), color: 'text-blue-600' };
  };

  const strength = passwordStrength();

  const handleGoogleSuccess = async ({ credential }) => {
    try {
      await googleLogin(credential);
      navigate('/');
    } catch {
      // The auth store displays the error toast.
    }
  };

  return (
    <main className="auth-page-transition grid min-h-screen min-h-[100dvh] flex-1 bg-white text-[#171717] lg:grid-cols-2">
      <section className="relative flex min-h-[100dvh] flex-col px-6 py-7 sm:px-12 lg:px-16 xl:px-20">
        <Link to="/" className="flex w-fit items-center gap-2.5 text-[#27202f]" aria-label={t('ChatKaro home')}>
          <Logo className="h-8 w-8" />
          <span className="text-lg font-bold tracking-tight">ChatKaro</span>
        </Link>

        {verificationStep ? (
          <div className="mx-auto flex w-full max-w-[390px] flex-1 flex-col justify-center py-10">
            <div className="mb-7">
              <h1 className="text-3xl font-bold tracking-tight text-[#111] sm:text-4xl">{t('Verify your email')}</h1>
              <p className="mt-2 text-sm text-gray-500">
                {t('Enter the six-digit code sent to {email}', { email: formData.email })}
              </p>
            </div>
            <form onSubmit={handleVerifyOtp} className="flex flex-col gap-5">
              <div>
                <label htmlFor="signup-otp" className="mb-2 block text-sm font-medium text-gray-800">{t('Verification code')}</label>
                <input
                  id="signup-otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={otp}
                  onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  placeholder="000000"
                  className="h-12 w-full rounded-md border border-gray-300 bg-white px-3 text-center text-xl tracking-[0.5em] text-gray-900 outline-none transition focus:border-[#604399] focus:ring-2 focus:ring-[#604399]/20"
                />
              </div>
              <button
                type="submit"
                disabled={isVerifying || otp.length !== 6}
                className="flex h-11 w-full items-center justify-center rounded-md bg-[#604399] px-4 text-sm font-semibold text-white transition hover:bg-[#503781] focus:outline-none focus:ring-2 focus:ring-[#604399] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isVerifying ? <span className="loading loading-spinner loading-sm" /> : t('Verify email')}
              </button>
            </form>
            <button
              type="button"
              onClick={handleResendOtp}
              disabled={isResending || resendCooldown > 0}
              className="mt-5 text-sm font-medium text-[#604399] underline underline-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isResending
                ? t('Sending…')
                : resendCooldown > 0
                ? `${t('Resend verification code')} (${resendCooldown}s)`
                : t('Resend verification code')}
            </button>
            <button
              type="button"
              onClick={() => setVerificationStep(false)}
              className="mt-4 text-sm text-gray-500 hover:text-gray-800"
            >
              {t('Back to account details')}
            </button>
          </div>
        ) : (
        <div className="mx-auto flex w-full max-w-[390px] flex-1 flex-col justify-center py-10">
          <div className="mb-7">
            <h1 className="text-3xl font-bold tracking-tight text-[#111] sm:text-4xl">{t('Create account')}</h1>
            <p className="mt-2 text-sm text-gray-500">{t('Join ChatKaro today — it’s free')}</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label htmlFor="signup-full-name" className="mb-2 block text-sm font-medium text-gray-800">{t('Full Name')}</label>
              <input
                id="signup-full-name"
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                required
                autoComplete="name"
                placeholder={t('Full name example')}
                className="h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-base text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#604399] focus:ring-2 focus:ring-[#604399]/20"
              />
            </div>

            <div>
              <label htmlFor="signup-username" className="mb-2 block text-sm font-medium text-gray-800">{t('Username')}</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-sm font-semibold text-gray-400 select-none">
                  @
                </span>
                <input
                  id="signup-username"
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleUsernameChange}
                  required
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck="false"
                  maxLength={30}
                  placeholder="your_unique_username"
                  className={`h-11 w-full rounded-md border bg-white pl-8 pr-10 text-base text-gray-900 outline-none transition placeholder:text-gray-400 focus:ring-2 ${
                    usernameStatus === 'available'
                      ? 'border-green-500 focus:border-green-500 focus:ring-green-500/20'
                      : usernameStatus === 'taken' || usernameStatus === 'invalid'
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                        : 'border-gray-300 focus:border-[#604399] focus:ring-[#604399]/20'
                  }`}
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  {usernameStatus === 'checking' && (
                    <span className="loading loading-spinner loading-xs text-gray-400" />
                  )}
                  {usernameStatus === 'available' && (
                    <Check size={18} className="text-green-600" />
                  )}
                  {(usernameStatus === 'taken' || usernameStatus === 'invalid') && (
                    <X size={18} className="text-red-600" />
                  )}
                </div>
              </div>
              {usernameStatus === 'available' && (
                <p className="mt-1 text-xs font-medium text-green-600">{t('Username is available')}</p>
              )}
              {usernameError && (
                <p className="mt-1 text-xs text-red-600">{t(usernameError)}</p>
              )}
              {usernameSuggestions.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-gray-500 mb-1">{t('Suggestions:')}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {usernameSuggestions.map((sug) => (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => handlePickSuggestion(sug)}
                        className="rounded-full border border-[#604399]/30 bg-[#604399]/10 px-2.5 py-0.5 text-xs font-medium text-[#604399] transition hover:bg-[#604399]/20"
                      >
                        @{sug}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="signup-email" className="mb-2 block text-sm font-medium text-gray-800">{t('Email address')}</label>
              <input
                id="signup-email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                autoComplete="email"
                placeholder="example@gmail.com"
                className="h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-base text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#604399] focus:ring-2 focus:ring-[#604399]/20"
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label htmlFor="signup-password" className="block text-sm font-medium text-gray-800">{t('Password')}</label>
                {strength && <span className={`text-xs font-medium ${strength.color}`}>{strength.label}</span>}
              </div>
              <div className="relative">
                <input
                  id="signup-password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  placeholder={t('Min 6 characters')}
                  className="h-11 w-full rounded-md border border-gray-300 bg-white px-3 pr-11 text-base text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#604399] focus:ring-2 focus:ring-[#604399]/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-gray-500 hover:text-gray-800"
                  aria-label={t(showPassword ? 'Hide password' : 'Show password')}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="flex h-11 w-full items-center justify-center rounded-md bg-[#604399] px-4 text-sm font-semibold text-white transition hover:bg-[#503781] focus:outline-none focus:ring-2 focus:ring-[#604399] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading ? <span className="loading loading-spinner loading-sm" /> : t('Create account')}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3 text-xs text-gray-400">
            <span className="h-px flex-1 bg-gray-200" />
            <span>{t('OR')}</span>
            <span className="h-px flex-1 bg-gray-200" />
          </div>

          <div className="flex justify-center">
            <GoogleLogin onSuccess={handleGoogleSuccess} onError={() => {}} />
          </div>

          <p className="mt-5 text-center text-sm text-gray-500">
            {t('Already have an account?')}{' '}
            <Link to="/login" className="font-medium text-[#604399] underline underline-offset-2 hover:text-[#493176]">
              {t('Sign in')}
            </Link>
          </p>
        </div>
        )}
      </section>

      <SupportIllustration />
    </main>
  );
}
