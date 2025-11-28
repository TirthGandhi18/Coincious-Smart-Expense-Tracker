import '@testing-library/jest-dom';
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Define the query builder mock separately to handle the 'then' property
const createQueryBuilderMock = () => {
  const builder = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: {}, error: null }),
  };

  // Attach 'then' dynamically to satisfy SonarLint S7739
  // This allows the builder to be awaited like a Promise
  Object.defineProperty(builder, 'then', {
    value: (resolve: (value: any) => void) => {
      return Promise.resolve({ data: [], error: null }).then(resolve);
    },
    writable: true,
  });

  return builder;
};

vi.mock('../utils/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
    from: vi.fn(() => createQueryBuilderMock()),
  },
}));

// --- Browser API Mocks ---

// 1. ResizeObserver (Required by many UI libraries)
// Solves S7764 (globalThis), S6647 (constructor), 6133 (cb), S1186 (empty methods)
globalThis.ResizeObserver = class ResizeObserver {
  disconnect() {
    // do nothing
  }
  observe() {
    // do nothing
  }
  unobserve() {
    // do nothing
  }
};

// 2. matchMedia (Required for responsive checks)
// Solves S7764 (globalThis)
Object.defineProperty(globalThis, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// 3. IntersectionObserver (Required for scroll detection)
// Solves S7764 (stubGlobal uses globalThis internally)
const IntersectionObserverMock = vi.fn(() => ({
  disconnect: vi.fn(),
  observe: vi.fn(),
  takeRecords: vi.fn(),
  unobserve: vi.fn(),
}));
vi.stubGlobal('IntersectionObserver', IntersectionObserverMock);

// 4. Pointer Events (Required by Radix UI primitives)
// JSDOM doesn't implement pointer capture, so we stub it on HTMLElement
if (typeof HTMLElement !== 'undefined') {
  HTMLElement.prototype.hasPointerCapture = () => false;
  HTMLElement.prototype.setPointerCapture = () => {
    // do nothing
  };
  HTMLElement.prototype.releasePointerCapture = () => {
    // do nothing
  };
  HTMLElement.prototype.scrollIntoView = () => {
    // do nothing
  };
}