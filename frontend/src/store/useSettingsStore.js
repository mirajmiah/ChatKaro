import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useSettingsStore = create(
  persist(
    (set) => ({
      theme: 'night',
      setTheme: (theme) => set({ theme }),
    }),
    { name: 'nexus-settings' }
  )
);
