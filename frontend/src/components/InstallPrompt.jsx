import { useEffect, useState } from 'react';
import { Download, X, MessageCircle, Share, MoreVertical } from 'lucide-react';

const DISMISS_KEY = 'chatkaro-install-prompt-dismissed';
const DISMISS_DAYS = 7;

function isStandalone() {
  return window.matchMedia?.('(display-mode: standalone)').matches ||
    window.matchMedia?.('(display-mode: fullscreen)').matches ||
    window.navigator.standalone === true;
}

function isIOS() {
  return /iPad|iPhone|iPod/.test(window.navigator.userAgent) ||
    (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [installed, setInstalled] = useState(false);
  const ios = isIOS();

  useEffect(() => {
    if (isStandalone()) {
      setInstalled(true);
      return;
    }

    const dismissedAt = Number(window.localStorage.getItem(DISMISS_KEY) || 0);
    const canShowAgain = !dismissedAt || Date.now() - dismissedAt > DISMISS_DAYS * 24 * 60 * 60 * 1000;

    const onBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
      if (canShowAgain) setVisible(true);
    };

    const onAppInstalled = () => {
      setInstalled(true);
      setVisible(false);
      setDeferredPrompt(null);
      window.localStorage.removeItem(DISMISS_KEY);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);

    // iOS does not expose beforeinstallprompt; show the manual Add to Home Screen steps.
    if (ios && canShowAgain) {
      const timer = window.setTimeout(() => setVisible(true), 1800);
      return () => {
        window.clearTimeout(timer);
        window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
        window.removeEventListener('appinstalled', onAppInstalled);
      };
    }

    // If this browser cannot expose a native prompt, offer browser-menu instructions.
    const timer = window.setTimeout(() => {
      if (canShowAgain && !deferredPrompt) setVisible(true);
    }, 3500);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, [ios]);

  const dismiss = () => {
    setVisible(false);
    window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
  };

  const install = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      if (choice?.outcome === 'accepted') {
        setVisible(false);
      } else {
        setShowInstructions(true);
      }
      return;
    }
    setShowInstructions(true);
  };

  if (installed || !visible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="install-chatkaro-title">
      <section className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-base-300 bg-base-100 text-base-content shadow-2xl">
        <button type="button" onClick={dismiss} aria-label="Close install popup" className="btn btn-ghost btn-sm btn-circle absolute right-3 top-3 z-10">
          <X size={18} />
        </button>
        <div className="bg-gradient-to-br from-primary/20 via-base-100 to-secondary/20 px-6 pb-6 pt-8 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-primary text-primary-content shadow-lg shadow-primary/25">
            <MessageCircle size={40} strokeWidth={2.2} />
          </div>
          <h2 id="install-chatkaro-title" className="text-2xl font-bold">Install ChatKaro</h2>
          <p className="mx-auto mt-2 max-w-xs text-sm opacity-75">
            Add ChatKaro to your home screen for quick access to your chats.
          </p>
        </div>

        <div className="space-y-3 px-6 pb-6">
          {!showInstructions ? (
            <>
              <button type="button" onClick={install} className="btn btn-primary w-full gap-2">
                <Download size={18} />
                Install app
              </button>
              <button type="button" onClick={dismiss} className="btn btn-ghost w-full">
                Maybe later
              </button>
            </>
          ) : (
            <div className="rounded-2xl bg-base-200 p-4 text-sm">
              <h3 className="mb-2 font-semibold">Add ChatKaro to your home screen</h3>
              {ios ? (
                <ol className="list-decimal space-y-2 pl-5">
                  <li>Tap the <Share className="inline" size={15} /> Share button in your browser.</li>
                  <li>Choose <strong>Add to Home Screen</strong>.</li>
                  <li>Tap <strong>Add</strong> to finish.</li>
                </ol>
              ) : (
                <ol className="list-decimal space-y-2 pl-5">
                  <li>Open your browser menu <MoreVertical className="inline" size={15} />.</li>
                  <li>Choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.</li>
                  <li>Confirm the installation.</li>
                </ol>
              )}
              <button type="button" onClick={dismiss} className="btn btn-primary mt-4 w-full">Got it</button>
            </div>
          )}
          <p className="text-center text-xs opacity-50">Free to install · No app store required</p>
        </div>
      </section>
    </div>
  );
}
