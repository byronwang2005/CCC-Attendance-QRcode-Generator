import globals from 'globals';
import tseslint from 'typescript-eslint';

const browserFiles = ['src/**/*.{js,ts,tsx}'];
const workerFiles = ['functions/**/*.js'];
const toolingFiles = ['scripts/**/*.js', 'shared/**/*.js', 'eslint.config.js'];

export default [
  {
    ignores: ['node_modules/**', 'dist/**', '.wrangler/**', 'public/app/**']
  },
  ...tseslint.configs.recommended,
  {
    files: browserFiles,
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: tseslint.parser,
      globals: {
        ...globals.browser
      }
    },
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }]
    }
  },
  {
    files: workerFiles,
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.worker
      }
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }]
    }
  },
  {
    files: toolingFiles,
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node
      }
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }]
    }
  }
];
