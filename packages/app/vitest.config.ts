import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    // Each jsdom worker loads React/Arco and the crypto fixture environment.
    // Bound concurrency so native builds and CI runners do not starve UI waits.
    // Keep the normal assertion/test deadlines; resource pressure is not a retry.
    maxWorkers: 2,
    minWorkers: 1,
    environment: 'jsdom',
    include: ['tests/**/*.test.{ts,tsx}'],
    setupFiles: ['tests/setup.ts'],
    restoreMocks: true,
  },
});
