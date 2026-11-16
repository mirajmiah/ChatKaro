import { create } from 'zustand';

const checkIsMobile = () =>
  typeof navigator !== 'undefined' &&
  /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

const checkIsIOS = () =>
  typeof navigator !== 'undefined' &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

export const useInstallStore = create((set, get) => ({
  deferredPrompt: null,
  isInstalled: false,
  isInstallable: false,
  showTopBanner: false,
  showGuideModal: false,
  isMobile: false,
  isIOS: false,

  init: () => {
    const isMobile = checkIsMobile();
    const isIOS = checkIsIOS();

    // Check if running as a standalone app already
    const isStandalone =
      typeof window !== 'undefined' &&
      (window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true ||
        document.referrer.includes('android-app://'));

    if (isStandalone) {
      set({ isInstalled: true, showTopBanner: false, isMobile, isIOS });
      return;
    }

    const dismissed = typeof localStorage !== 'undefined'
      ? (localStorage.getItem('chatkaro-hide-install-prompt') === 'true' ||
         localStorage.getItem('chatkaro-hide-desktop-prompt') === 'true')
      : false;

    // Show banner if not dismissed and not installed
    if (!dismissed) {
      set({ showTopBanner: true, isMobile, isIOS });
    } else {
      set({ isMobile, isIOS });
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
        localStorage.removeItem('chatkaro-hide-install-prompt');
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
      localStorage.setItem('chatkaro-hide-install-prompt', 'true');
    }
  },

  setShowGuideModal: (show) => set({ showGuideModal: show }),
}));
