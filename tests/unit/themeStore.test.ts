import { describe, it, expect, beforeEach } from 'vitest';
import useThemeStore from '../../src/stores/themeStore';

describe('themeStore', () => {
  beforeEach(() => {
    useThemeStore.setState({ mode: 'dark' });
    localStorage.clear();
  });

  it('初始狀態：mode 預設為 dark', () => {
    expect(useThemeStore.getState().mode).toBe('dark');
  });

  it('toggleTheme()：dark → light', () => {
    useThemeStore.getState().toggleTheme();
    expect(useThemeStore.getState().mode).toBe('light');
  });

  it('toggleTheme()：light → dark（連續呼叫兩次應回到原狀態）', () => {
    useThemeStore.getState().toggleTheme();
    useThemeStore.getState().toggleTheme();
    expect(useThemeStore.getState().mode).toBe('dark');
  });

  it('會持久化至 localStorage（key: act-theme）', () => {
    useThemeStore.getState().toggleTheme();
    const persisted = localStorage.getItem('act-theme');
    expect(persisted).not.toBeNull();
    expect(JSON.parse(persisted as string).state.mode).toBe('light');
  });
});
