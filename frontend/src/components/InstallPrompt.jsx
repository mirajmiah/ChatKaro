import { useState } from 'react';
import { Smartphone, Laptop, Download, X, CheckCircle2 } from 'lucide-react';
import { useInstallStore } from '../store/useInstallStore.js';
import { useTranslation } from '../lib/i18n.js';

export default function InstallPrompt() {
  const { t } = useTranslation();
  const {
    isInstalled,
    isMobile,
    isIOS,
    showTopBanner,
    showGuideModal,
    promptInstall,
    dismissTopBanner,
    setShowGuideModal,
  } = useInstallStore();

  const [dontAskAgain, setDontAskAgain] = useState(false);

  // If already running as an installed standalone app, do not show any prompt
  if (isInstalled) return null;

  return (
    <>
      {/* Top Banner / Message Pop-up for App Installation (Mobile & PC) */}
      {showTopBanner && (
        <aside
          role="region"
          aria-label={t('Install App Banner')}
          className="relative z-40 border-b border-primary/30 bg-base-200/95 px-3 py-2.5 text-base-content shadow-md backdrop-blur-md transition-all duration-300 sm:px-4"
        >
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-content shadow-sm">
                {isMobile ? <Smartphone size={19} strokeWidth={2.2} /> : <Laptop size={19} strokeWidth={2.2} />}
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold tracking-tight sm:text-base">
                    {t('Install ChatKaro App')}
                  </h3>
                  <span className="badge badge-primary badge-xs hidden font-medium uppercase tracking-wider sm:inline-flex">
                    {isMobile ? t('Mobile') : t('Desktop')}
                  </span>
                </div>
                <p className="hidden text-xs opacity-75 md:block">
                  {isMobile
                    ? t('Add to your home screen for fast access and real-time messaging.')
                    : t('Install for instant access, desktop notifications, and a dedicated app window.')}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={promptInstall}
                className="btn btn-primary btn-sm gap-1.5 font-medium shadow-sm"
              >
                <Download size={15} />
                <span>{t('Install App')}</span>
              </button>

              <button
                type="button"
                onClick={() => dismissTopBanner(true)}
                className="btn btn-ghost btn-sm btn-circle opacity-70 hover:opacity-100"
                aria-label={t('Dismiss')}
                title={t('Dismiss')}
              >
                <X size={17} />
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* Guide Modal: If browser requires installing via browser menu or address bar */}
      {showGuideModal && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="install-guide-title"
        >
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-base-300 bg-base-100 text-base-content shadow-2xl">
            <button
              type="button"
              onClick={() => setShowGuideModal(false)}
              className="btn btn-ghost btn-sm btn-circle absolute right-3 top-3 z-10"
              aria-label={t('Close')}
            >
              <X size={18} />
            </button>

            <div className="bg-gradient-to-br from-primary/20 via-base-100 to-secondary/20 px-6 pb-4 pt-7 text-center">
              <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-content shadow-lg">
                {isMobile ? (
                  <Smartphone size={32} strokeWidth={2.2} />
                ) : (
                  <Laptop size={32} strokeWidth={2.2} />
                )}
              </div>
              <h2 id="install-guide-title" className="text-xl font-bold">
                {t('Install ChatKaro App')}
              </h2>
              <p className="mt-1 text-xs opacity-75">
                {isMobile
                  ? t('Add ChatKaro to your phone home screen for quick, full-screen access.')
                  : t('Run ChatKaro as a standalone app on your PC or Mac.')}
              </p>
            </div>

            <div className="space-y-3 px-6 pb-6 pt-3">
              <div className="rounded-2xl border border-base-300 bg-base-200/50 p-3.5 text-xs space-y-2.5">
                {isIOS ? (
                  <>
                    <div className="flex items-start gap-2.5">
                      <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-primary" />
                      <div>
                        <strong className="font-semibold text-sm block">1. {t('Share Button')}</strong>
                        <span className="opacity-80">
                          {t('Tap the Share button at the bottom of Safari.')}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-primary" />
                      <div>
                        <strong className="font-semibold text-sm block">2. {t('Add to Home Screen')}</strong>
                        <span className="opacity-80">
                          {t('Scroll down and tap "Add to Home Screen".')}
                        </span>
                      </div>
                    </div>
                  </>
                ) : isMobile ? (
                  <>
                    <div className="flex items-start gap-2.5">
                      <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-primary" />
                      <div>
                        <strong className="font-semibold text-sm block">1. {t('Browser Menu')}</strong>
                        <span className="opacity-80">
                          {t('Tap the browser menu (⋮) in the top right corner.')}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-primary" />
                      <div>
                        <strong className="font-semibold text-sm block">2. {t('Install App')}</strong>
                        <span className="opacity-80">
                          {t('Tap "Install app" or "Add to Home screen".')}
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-start gap-2.5">
                      <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-primary" />
                      <div>
                        <strong className="font-semibold text-sm block">1. {t('Browser Address Bar')}</strong>
                        <span className="opacity-80">
                          {t('Look for the Install icon (💻 or ⊕) on the right side of your browser address bar and click it.')}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-primary" />
                      <div>
                        <strong className="font-semibold text-sm block">2. {t('Browser Menu')}</strong>
                        <span className="opacity-80">
                          {t('Or click browser menu (⋮) → "Save and share" / "Apps" → "Install ChatKaro".')}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="flex items-center justify-between gap-2 pt-1 text-xs opacity-75">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-primary checkbox-xs"
                    checked={dontAskAgain}
                    onChange={(e) => {
                      setDontAskAgain(e.target.checked);
                      if (e.target.checked) {
                        dismissTopBanner(true);
                      }
                    }}
                  />
                  <span>{t("Don't show prompt again")}</span>
                </label>
              </div>

              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="btn btn-primary w-full"
              >
                {t('Got it')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
