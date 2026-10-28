import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuthStore } from '../store/useAuthStore.js';
import { useTranslation } from '../lib/i18n.js';
import Logo from '../components/Logo.jsx';

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

export default function LoginPage() {
  const { login, verifyLoginOtp, resendLoginOtp, googleLogin } = useAuthStore();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [verificationStep, setVerificationStep] = useState(false);
  const [otp, setOtp] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleChange = (event) => {
    setFormData((previous) => ({ ...previous, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    try {
      const res = await login(formData);
      if (res?.otpRequired) {
        setVerificationStep(true);
        setOtp('');
        setResendCooldown(30);
        return;
      }
      navigate('/');
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
      await verifyLoginOtp(formData.email, otp);
      navigate('/');
    } catch (err) {
      const msg = err.response?.data?.message || '';
      if (msg.toLowerCase().includes('session expired') || msg.toLowerCase().includes('password again')) {
        setVerificationStep(false);
        setOtp('');
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendOtp = async () => {
    if (isResending || resendCooldown > 0) return;
    setIsResending(true);
    try {
      await resendLoginOtp(formData.email);
      setResendCooldown(30);
    } catch (err) {
      const msg = err.response?.data?.message || '';
      if (msg.toLowerCase().includes('session expired') || msg.toLowerCase().includes('password again')) {
        setVerificationStep(false);
        setOtp('');
      }
    } finally {
      setIsResending(false);
    }
  };

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
                <label htmlFor="login-otp" className="mb-2 block text-sm font-medium text-gray-800">
                  {t('Verification code')}
                </label>
                <input
                  id="login-otp"
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
                {isVerifying ? <span className="loading loading-spinner loading-sm" /> : t('Sign in')}
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
              onClick={() => {
                setVerificationStep(false);
                setOtp('');
              }}
              className="mt-4 text-sm text-gray-500 hover:text-gray-800"
            >
              {t('Back to login')}
            </button>
          </div>
        ) : (
          <div className="mx-auto flex w-full max-w-[390px] flex-1 flex-col justify-center py-10">
          <div className="mb-7">
            <h1 className="text-3xl font-bold tracking-tight text-[#111] sm:text-4xl">{t('Welcome back')}</h1>
            <p className="mt-2 text-sm text-gray-500">{t('Please enter your details')}</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label htmlFor="login-email" className="mb-2 block text-sm font-medium text-gray-800">{t('Email address')}</label>
              <input
                id="login-email"
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
              <label htmlFor="login-password" className="mb-2 block text-sm font-medium text-gray-800">{t('Password')}</label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  autoComplete="current-password"
                  className="h-11 w-full rounded-md border border-gray-300 bg-white px-3 pr-11 text-base text-gray-900 outline-none transition focus:border-[#604399] focus:ring-2 focus:ring-[#604399]/20"
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

            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-sm font-medium text-[#604399] underline underline-offset-2 hover:text-[#493176]">
                {t('Forgot password?')}
              </Link>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="flex h-11 w-full items-center justify-center rounded-md bg-[#604399] px-4 text-sm font-semibold text-white transition hover:bg-[#503781] focus:outline-none focus:ring-2 focus:ring-[#604399] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading ? <span className="loading loading-spinner loading-sm" /> : t('Sign in')}
            </button>
          </form>

          <div className="my-5 flex justify-center">
            <GoogleLogin onSuccess={handleGoogleSuccess} onError={() => {}} />
          </div>

          <p className="text-center text-sm text-gray-500">
            {t('Don’t have an account?')}{' '}
            <Link to="/signup" className="font-medium text-[#604399] underline underline-offset-2 hover:text-[#493176]">
              {t('Sign up')}
            </Link>
          </p>
        </div>
        )}
      </section>

      <SupportIllustration />
    </main>
  );
}
