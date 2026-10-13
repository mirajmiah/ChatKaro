import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Zap } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuthStore } from '../store/useAuthStore.js';

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

export default function SignupPage() {
  const { signup, googleLogin } = useAuthStore();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ fullName: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (event) => {
    setFormData((previous) => ({ ...previous, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    try {
      await signup(formData);
      navigate('/');
    } catch {
      // Errors are reported by the auth store.
    } finally {
      setIsLoading(false);
    }
  };

  const passwordStrength = () => {
    const { password } = formData;
    if (!password) return null;
    if (password.length < 6) return { label: 'Too short', color: 'text-red-600' };
    if (password.length < 8) return { label: 'Weak', color: 'text-amber-600' };
    if (/[A-Z]/.test(password) && /[0-9]/.test(password)) return { label: 'Strong', color: 'text-green-600' };
    return { label: 'Fair', color: 'text-blue-600' };
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
        <Link to="/" className="flex w-fit items-center gap-2.5 text-[#27202f]" aria-label="ChatKaro home">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#604399] text-white">
            <Zap size={19} fill="currentColor" />
          </span>
          <span className="text-lg font-bold tracking-tight">ChatKaro</span>
        </Link>

        <div className="mx-auto flex w-full max-w-[390px] flex-1 flex-col justify-center py-10">
          <div className="mb-7">
            <h1 className="text-3xl font-bold tracking-tight text-[#111] sm:text-4xl">Create account</h1>
            <p className="mt-2 text-sm text-gray-500">Join ChatKaro today — it&apos;s free</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label htmlFor="signup-full-name" className="mb-2 block text-sm font-medium text-gray-800">Full Name</label>
              <input
                id="signup-full-name"
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                required
                autoComplete="name"
                placeholder="Jane Doe"
                className="h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-base text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#604399] focus:ring-2 focus:ring-[#604399]/20"
              />
            </div>

            <div>
              <label htmlFor="signup-email" className="mb-2 block text-sm font-medium text-gray-800">Email address</label>
              <input
                id="signup-email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                autoComplete="email"
                placeholder="you@example.com"
                className="h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-base text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#604399] focus:ring-2 focus:ring-[#604399]/20"
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label htmlFor="signup-password" className="block text-sm font-medium text-gray-800">Password</label>
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
                  placeholder="Min 6 characters"
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

            <button
              type="submit"
              disabled={isLoading}
              className="flex h-11 w-full items-center justify-center rounded-md bg-[#604399] px-4 text-sm font-semibold text-white transition hover:bg-[#503781] focus:outline-none focus:ring-2 focus:ring-[#604399] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading ? <span className="loading loading-spinner loading-sm" /> : 'Create account'}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3 text-xs text-gray-400">
            <span className="h-px flex-1 bg-gray-200" />
            <span>OR</span>
            <span className="h-px flex-1 bg-gray-200" />
          </div>

          <div className="flex justify-center">
            <GoogleLogin onSuccess={handleGoogleSuccess} onError={() => {}} />
          </div>

          <p className="mt-5 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-[#604399] underline underline-offset-2 hover:text-[#493176]">
              Sign in
            </Link>
          </p>
        </div>
      </section>

      <SupportIllustration />
    </main>
  );
}
