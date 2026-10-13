import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useSettingsStore = create(
  persist(
    (set) => ({
      theme: 'night',
      language: 'en',
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
    }),
    {
      name: 'nexus-settings',
      migrate: (persistedState) => ({
        ...persistedState,
        language: persistedState.language ?? persistedState.guideLanguage ?? 'en',
      }),
      version: 1,
    }
  )
);
