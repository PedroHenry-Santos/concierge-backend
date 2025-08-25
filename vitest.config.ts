import path from 'node:path';

import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['**/*.spec.ts'],
    globals: true,
    alias: {
      '@/sharedModules': path.resolve(__dirname, './src/module/shared/module'),
      '@/sharedLibs': path.resolve(__dirname, './src/module/shared'),
      '@/infra': path.resolve(__dirname, './src/infra'),
    },
    root: './',
  },
  plugins: [
    swc.vite({
      module: { type: 'es6' },
    }),
  ],
  resolve: {
    alias: {
      '@/sharedModules': path.resolve(__dirname, './src/module/shared/module'),
      '@/sharedLibs': path.resolve(__dirname, './src/module/shared'),
      '@/infra': path.resolve(__dirname, './src/infra'),
    },
  },
});
