import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

const bannedMath = ['sin', 'cos', 'tan', 'atan2', 'pow', 'sqrt', 'exp', 'log', 'random', 'hypot', 'cbrt'];

export default tseslint.config(
  {
    ignores: [
      'dist',
      'dist-e2e',
      'out',
      'prototype',
      'node_modules',
      'public',
      'test-results',
      'playwright-report',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-restricted-globals': [
        'error',
        { name: 'alert', message: 'Use in-app UI.' },
        { name: 'confirm', message: 'Use in-app UI.' },
        { name: 'prompt', message: 'Use in-app UI.' },
      ],
      'no-restricted-properties': [
        'error',
        { object: 'window', property: 'alert' },
        { object: 'window', property: 'confirm' },
        { object: 'window', property: 'prompt' },
      ],
    },
  },
  {
    // ENG-A6: the logic layer is pure. The unit test tests/unit/purity.test.ts checks the same rules.
    files: ['src/engine/logic/**/*.ts'],
    languageOptions: { globals: {} },
    rules: {
      'no-restricted-globals': [
        'error',
        'document',
        'window',
        'navigator',
        'performance',
        'Date',
        'CanvasRenderingContext2D',
        'Path2D',
        'OffscreenCanvas',
        'Image',
        'localStorage',
      ],
      'no-restricted-properties': ['error', ...bannedMath.map((property) => ({ object: 'Math', property }))],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '^(?!\\./|\\.\\./config|\\.\\./\\.\\./config).*',
              message: 'Logic may only import from src/engine/logic and src/config.',
            },
          ],
        },
      ],
    },
  },
);
