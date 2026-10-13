import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, Zap } from 'lucide-react';
import api from '../lib/axios.js';

function SupportIllustration() {
  return (
    <div className="relative hidden min-h-full overflow-hidden bg-[#a98be0] lg:flex lg:items-center lg:justify-center">
      <img
        src="/login-illustration.png"
        alt="A friendly person ready to chat"
        className="h-full max-h-[760px] w-full max-w-[640px] object-contain"
      />
    </div>
  );
}

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [message, setMessage] = useState('');
  const [messageIsError, setMessageIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [resetComplete, setResetComplete] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  useEffect(() => {
    if (!resetComplete) return undefined;

    const timeoutId = window.setTimeout(() => {
      navigate('/login', { replace: true });
    }, 2000);

    return () => window.clearTimeout(timeoutId);
  }, [navigate, resetComplete]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setMessage('');
    setMessageIsError(false);
    setOtpSent(false);

    try {
      const response = await api.post('/auth/forgot-password', { email });
      setMessage(response.data.message);
      setOtpSent(true);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Unable to process request.');
      setMessageIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async (event) => {
    event.preventDefault();
    if (password !== confirmation) {
      setMessage('Passwords do not match.');
      setMessageIsError(true);
      return;
    }

    setIsLoading(true);
    setMessage('');
    setMessageIsError(false);
    try {
      await api.post('/auth/reset-password', { email, otp, password });
      setMessage('Password reset successfully. Please log in again.');
      setResetComplete(true);
      setOtpSent(false);
      setOtp('');
      setPassword('');
      setConfirmation('');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Unable to reset password.');
      setMessageIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="auth-page-transition grid min-h-screen min-h-[100dvh] flex-1 bg-white text-[#171717] lg:grid-cols-2">
      <section className="relative flex min-h-[100dvh] flex-col px-6 py-7 sm:px-12 lg:px-16 xl:px-20">
        <Link to="/" className="flex w-fit items-center gap-2.5 text-[#27202f]" aria-label="ChatKaro home">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#604399] text-white">
            <Zap size={19} fill="currentColor" />
          </span>
          <span className="text-lg font-bold tracking-tight">ChatKaro</span>
        </Link>

        <div className="mx-auto flex w-full max-w-[390px] flex-1 flex-col justify-center py-10">
          <Link
            to="/login"
            className="mb-7 flex w-fit items-center gap-2 text-sm font-medium text-[#604399] transition hover:text-[#493176]"
          >
            <ArrowLeft size={16} />
            Back to login
          </Link>

          <div className="mb-7">
            <h1 className="text-3xl font-bold tracking-tight text-[#111] sm:text-4xl">Reset your password</h1>
            <p className="mt-2 text-sm text-gray-500">Enter your account email to begin recovery.</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label htmlFor="recovery-email" className="mb-2 block text-sm font-medium text-gray-800">Email address</label>
              <input
                id="recovery-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
                disabled={otpSent || resetComplete}
                className="h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-base text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#604399] focus:ring-2 focus:ring-[#604399]/20 disabled:bg-gray-50"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || otpSent || resetComplete}
              className="flex h-11 w-full items-center justify-center rounded-md bg-[#604399] px-4 text-sm font-semibold text-white transition hover:bg-[#503781] focus:outline-none focus:ring-2 focus:ring-[#604399] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading && !otpSent ? <span className="loading loading-spinner loading-sm" /> : 'Send reset request'}
            </button>
          </form>

          {otpSent && (
            <form onSubmit={handleReset} className="mt-6 flex flex-col gap-5 border-t border-gray-200 pt-6">
              <p className="text-sm text-gray-500">Enter the 6-digit OTP sent to your email.</p>
              <div>
                <label htmlFor="recovery-otp" className="mb-2 block text-sm font-medium text-gray-800">Verification code</label>
                <input
                  id="recovery-otp"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={otp}
                  onChange={(event) => setOtp(event.target.value.replace(/\D/g, ''))}
                  placeholder="6-digit OTP"
                  required
                  className="h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-base text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#604399] focus:ring-2 focus:ring-[#604399]/20"
                />
              </div>
              <div>
                <label htmlFor="recovery-password" className="mb-2 block text-sm font-medium text-gray-800">New password</label>
                <div className="relative">
                  <input
                    id="recovery-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Min 6 characters"
                    minLength={6}
                    autoComplete="new-password"
                    required
                    className="h-11 w-full rounded-md border border-gray-300 bg-white px-3 pr-11 text-base text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#604399] focus:ring-2 focus:ring-[#604399]/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-gray-500 hover:text-gray-800"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div>
                <label htmlFor="recovery-confirmation" className="mb-2 block text-sm font-medium text-gray-800">Confirm new password</label>
                <div className="relative">
                  <input
                    id="recovery-confirmation"
                    type={showConfirmation ? 'text' : 'password'}
                    value={confirmation}
                    onChange={(event) => setConfirmation(event.target.value)}
                    placeholder="Re-enter your password"
                    minLength={6}
                    autoComplete="new-password"
                    required
                    className="h-11 w-full rounded-md border border-gray-300 bg-white px-3 pr-11 text-base text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#604399] focus:ring-2 focus:ring-[#604399]/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmation((visible) => !visible)}
                    className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-gray-500 hover:text-gray-800"
                    aria-label={showConfirmation ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmation ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={isLoading || resetComplete}
                className="flex h-11 w-full items-center justify-center rounded-md bg-[#604399] px-4 text-sm font-semibold text-white transition hover:bg-[#503781] focus:outline-none focus:ring-2 focus:ring-[#604399] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isLoading ? <span className="loading loading-spinner loading-sm" /> : 'Reset password'}
              </button>
            </form>
          )}

          {message && (
            <p className={`mt-5 text-sm ${messageIsError ? 'text-red-600' : 'text-green-600'}`} role="status">
              {message}
            </p>
          )}
        </div>
      </section>

      <SupportIllustration />
    </main>
  );
}
