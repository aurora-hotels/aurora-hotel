import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    include: ['backend/tests/**/*.test.ts'],
    fileParallelism: false,
    maxWorkers: 1,
    testTimeout: 20000,
    hookTimeout: 30000,
  },
});
