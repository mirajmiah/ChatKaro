import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';
import { useTranslation } from '../lib/i18n.js';

export default function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-base-300 mb-2">
        <img src="/chatkaro-logo.png" alt="" className="brand-logo h-10 w-10 object-contain" />
      </div>
      <div>
        <h1 className="text-6xl font-extrabold text-primary">404</h1>
        <p className="text-xl font-semibold mt-2">{t('Page Not Found')}</p>
        <p className="text-base-content/60 mt-1 max-w-sm mx-auto">
          {t('The page you’re looking for doesn’t exist or has been moved.')}
        </p>
      </div>
      <Link to="/" className="btn btn-primary gap-2">
        <Home size={18} />
        {t('Back to Home')}
      </Link>
    </div>
  );
}
