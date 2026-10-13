import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/useAuthStore.js';
import { useSettingsStore } from './store/useSettingsStore.js';
import HomePage from './pages/HomePage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import SignupPage from './pages/SignupPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import Navbar from './components/Navbar.jsx';

const Loader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <span className="loading loading-spinner loading-lg text-primary"></span>
  </div>
);

export default function App() {
  const { checkAuth, authUser, isCheckingAuth } = useAuthStore();
  const { theme, language } = useSettingsStore();
  const location = useLocation();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    const primary = getComputedStyle(document.documentElement).getPropertyValue('--p').trim();
    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (primary && themeColor) themeColor.setAttribute('content', `hsl(${primary})`);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute('lang', language === 'bn' ? 'bn' : language === 'hi' ? 'hi' : 'en');
  }, [language]);

  if (isCheckingAuth) return <Loader />;

  return (
    <div className={authUser && location.pathname === '/' ? 'app-authenticated-layout flex flex-col' : 'min-h-screen flex flex-col'}>
      {authUser && <Navbar />}
      <Routes>
        <Route path="/" element={authUser ? <HomePage /> : <Navigate to="/login" replace />} />
        <Route path="/login" element={!authUser ? <LoginPage /> : <Navigate to="/" replace />} />
        <Route path="/signup" element={!authUser ? <SignupPage /> : <Navigate to="/" replace />} />
        <Route path="/forgot-password" element={!authUser ? <ForgotPasswordPage /> : <Navigate to="/" replace />} />
        <Route path="/profile" element={authUser ? <ProfilePage /> : <Navigate to="/login" replace />} />
        <Route path="/settings" element={authUser ? <SettingsPage /> : <Navigate to="/login" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
    </div>
  );
}
