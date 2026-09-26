import { defineConfig } from 'vitest/config';
import baseConfig from './vitest.config.mts';

export default defineConfig({
  ...baseConfig,
  envDir: false,
  test: {
    ...baseConfig.test,
    include: ['test/integration/**/*.spec.ts'],
    setupFiles: ['./test/integration/setup.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/*.e2e-spec.ts'],
    fileParallelism: false,
    hookTimeout: 300_000,
    testTimeout: 30_000,
  },
});
