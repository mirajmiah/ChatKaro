import { create } from 'zustand';

export const useInstallStore = create((set, get) => ({
  deferredPrompt: null,
  isInstalled: false,
  isInstallable: false,
  showTopBanner: false,
  showGuideModal: false,

  init: () => {
    // Check if running as a standalone app already
    const isStandalone =
      typeof window !== 'undefined' &&
      (window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true ||
        document.referrer.includes('android-app://'));

    if (isStandalone) {
      set({ isInstalled: true, showTopBanner: false });
      return;
    }

    const dismissed = typeof localStorage !== 'undefined'
      ? localStorage.getItem('chatkaro-hide-desktop-prompt') === 'true'
      : false;

    // Show banner on desktop if not dismissed and not installed
    if (!dismissed) {
      set({ showTopBanner: true });
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        set({
          deferredPrompt: e,
          isInstallable: true,
          showTopBanner: !dismissed,
        });
      });

      window.addEventListener('appinstalled', () => {
        set({
          deferredPrompt: null,
          isInstalled: true,
          showTopBanner: false,
          showGuideModal: false,
        });
        localStorage.removeItem('chatkaro-hide-desktop-prompt');
      });
    }
  },

  promptInstall: async () => {
    const { deferredPrompt } = get();
    if (deferredPrompt) {
      deferredPrompt.prompt();
      try {
        const choice = await deferredPrompt.userChoice;
        if (choice && choice.outcome === 'accepted') {
          set({ showTopBanner: false, deferredPrompt: null });
        }
      } catch (err) {
        console.warn('Install prompt error:', err);
      }
    } else {
      set({ showGuideModal: true });
    }
  },

  dismissTopBanner: (dontAskAgain = false) => {
    set({ showTopBanner: false });
    if (dontAskAgain && typeof localStorage !== 'undefined') {
      localStorage.setItem('chatkaro-hide-desktop-prompt', 'true');
    }
  },

  setShowGuideModal: (show) => set({ showGuideModal: show }),
}));
