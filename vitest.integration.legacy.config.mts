import { defineConfig } from 'vitest/config';
import baseConfig from './vitest.config.mts';

// Explicit opt-in for the pre-existing external verification database.
export default defineConfig({
  ...baseConfig,
  test: {
    ...baseConfig.test,
    include: ['src/**/*.integration-spec.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/*.e2e-spec.ts'],
    fileParallelism: false,
  },
});
