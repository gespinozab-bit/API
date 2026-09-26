import { transform } from '@swc/core';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Nest requires decorator metadata for constructor injection and DTO validation.
  esbuild: false,
  plugins: [
    {
      name: 'nestjs-typescript',
      enforce: 'pre',
      async transform(code, id) {
        if (!/\.ts$/.test(id) || id.includes('node_modules')) return;
        return transform(code, {
          filename: id,
          sourceMaps: true,
          jsc: {
            parser: { syntax: 'typescript', decorators: true },
            transform: { legacyDecorator: true, decoratorMetadata: true },
            target: 'es2022',
          },
          module: { type: 'es6' },
        });
      },
    },
  ],
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./test/vitest.setup.ts'],
    include: ['src/**/*.spec.ts', 'test/unit/**/*.spec.ts'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/*.integration-spec.ts',
      '**/*.e2e-spec.ts',
    ],
  },
});
