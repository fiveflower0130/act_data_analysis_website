import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Ant Design 的 Grid / 響應式系統需要 window.matchMedia，jsdom 未實作
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
