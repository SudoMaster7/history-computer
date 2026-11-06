import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'dev-dist', 'playwright-report', 'test-results'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  // Regra inviolavel: core/ e a logica dos minijogos nao importam React, Three, DOM nem rede.
  {
    // Scripts de build rodam no Node, fora do navegador.
    files: ['tools/**/*.mjs'],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    files: ['src/core/**/*.ts', 'src/minigames/**/logic.ts'],
    languageOptions: { globals: {} },
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react-dom', 'react/*', 'react-dom/*'],
              message: 'core/logic nao pode importar React.',
            },
            {
              group: ['three', 'three/*', '@react-three/*'],
              message: 'core/logic nao pode importar Three.js.',
            },
            { group: ['zustand', 'zustand/*'], message: 'core/logic nao pode importar o store.' },
            {
              group: [
                '@/ui/*',
                '@/render/*',
                '@/store/*',
                '@/services/*',
                '../ui/*',
                '../render/*',
                '../store/*',
                '../services/*',
              ],
              message: 'core/logic nao depende de camadas de cima.',
            },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        { name: 'window', message: 'core/logic nao acessa o DOM.' },
        { name: 'document', message: 'core/logic nao acessa o DOM.' },
        { name: 'localStorage', message: 'core/logic nao acessa o DOM.' },
        { name: 'fetch', message: 'core/logic nao acessa a rede.' },
      ],
      'no-restricted-properties': [
        'error',
        {
          object: 'Math',
          property: 'random',
          message: 'Use createRng(seed): core deve ser deterministico.',
        },
        {
          object: 'Date',
          property: 'now',
          message: 'core deve ser deterministico (passe a data como parametro).',
        },
      ],
    },
  },
);
