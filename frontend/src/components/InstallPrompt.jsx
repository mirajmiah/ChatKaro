import { useEffect, useState } from 'react';
import { Download, X, Smartphone, ShieldCheck } from 'lucide-react';

const APK_URL = '/download/ChatKaro.apk';

function isAndroid() {
  return /Android/i.test(window.navigator.userAgent);
}

export default function InstallPrompt({ authUser }) {
  const [visible, setVisible] = useState(false);
  const [downloadStarted, setDownloadStarted] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    const userId = authUser?._id;
    const dismissedForUser = userId
      ? window.localStorage.getItem(`chatkaro-hide-install-prompt-${userId}`) === 'true'
      : false;

    setVisible(Boolean(userId) && isAndroid() && !dismissedForUser);
    setDownloadStarted(false);
    setDontShowAgain(false);
  }, [authUser?._id]);

  if (!authUser || !isAndroid() || !visible) return null;

  const dismiss = () => {
    if (dontShowAgain && authUser?._id) {
      window.localStorage.setItem(`chatkaro-hide-install-prompt-${authUser._id}`, 'true');
    }
    setVisible(false);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="chatkaro-apk-title"
    >
      <section className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-base-300 bg-base-100 text-base-content shadow-2xl">
        <button
          type="button"
          onClick={dismiss}
          aria-label="Close APK download popup"
          className="btn btn-ghost btn-sm btn-circle absolute right-3 top-3 z-10"
        >
          <X size={18} />
        </button>

        <div className="bg-gradient-to-br from-primary/20 via-base-100 to-secondary/20 px-6 pb-6 pt-8 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-primary text-primary-content shadow-lg">
            <Smartphone size={40} strokeWidth={2.2} />
          </div>
          <h2 id="chatkaro-apk-title" className="text-2xl font-bold">
            Get ChatKaro for Android
          </h2>
          <p className="mx-auto mt-2 max-w-xs text-sm opacity-75">
            Download the Android app for a dedicated ChatKaro experience on your phone.
          </p>
        </div>

        <div className="space-y-3 px-6 pb-6">
          <a
            href={APK_URL}
            onClick={() => setDownloadStarted(true)}
            referrerPolicy="no-referrer"
            className="btn btn-primary flex w-full gap-2"
          >
            <Download size={18} />
            Download Android APK
          </a>
          {downloadStarted && (
            <p className="text-center text-xs opacity-70">
              If Chrome stays at 100%, open Chrome Downloads and retry from the main Chrome browser. The APK is published on the official ChatKaro GitHub release.
            </p>
          )}
          <label className="flex cursor-pointer items-center justify-center gap-2 px-2 py-1 text-sm opacity-80">
            <input
              type="checkbox"
              className="checkbox checkbox-primary checkbox-sm"
              checked={dontShowAgain}
              onChange={(event) => {
                const checked = event.target.checked;
                setDontShowAgain(checked);

                if (checked && authUser?._id) {
                  window.localStorage.setItem(
                    `chatkaro-hide-install-prompt-${authUser._id}`,
                    'true'
                  );
                  setVisible(false);
                } else if (!checked && authUser?._id) {
                  window.localStorage.removeItem(
                    `chatkaro-hide-install-prompt-${authUser._id}`
                  );
                }
              }}
            />
            Don't show me again
          </label>
          <button type="button" onClick={dismiss} className="btn btn-ghost w-full">
            Maybe later
          </button>
          <p className="flex items-start justify-center gap-2 text-center text-xs opacity-60">
            <ShieldCheck size={15} className="mt-0.5 shrink-0" />
            Install only an APK published by the official ChatKaro repository.
          </p>
        </div>
      </section>
    </div>
  );
}
