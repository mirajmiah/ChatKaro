import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useSettingsStore = create(
  persist(
    (set) => ({
      theme: 'night',
      guideLanguage: 'en',
      setTheme: (theme) => set({ theme }),
      setGuideLanguage: (guideLanguage) => set({ guideLanguage }),
    }),
    { name: 'nexus-settings' }
  )
);
