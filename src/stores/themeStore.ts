import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ThemeMode } from '../styles/tokens';

interface ThemeState {
  mode: ThemeMode;
  toggleTheme: () => void;
}

const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: 'dark',
      toggleTheme: () =>
        set((select) => ({ mode: select.mode === 'dark' ? 'light' : 'dark' })),
    }),
    { name: 'act-theme' }
  )
);

export default useThemeStore;
