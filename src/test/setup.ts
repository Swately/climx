import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// RTL auto-cleanup only hooks a GLOBAL afterEach; vitest here runs without
// globals, so the cleanup is wired explicitly.
afterEach(cleanup);

// Made with my soul - Swately <3
