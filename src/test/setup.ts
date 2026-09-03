import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

// jsdom has no layout engine, so window.scrollTo is unimplemented and logs
// a noisy "Not implemented" on every route change the Layout drives.
vi.spyOn(window, 'scrollTo').mockImplementation(() => {});

afterEach(() => {
  cleanup();
});
