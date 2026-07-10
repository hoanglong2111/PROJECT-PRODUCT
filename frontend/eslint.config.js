import js from '@eslint/js';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// Flat config. Lints application source (`eslint src`); type-checking stays in
// `tsc` (typecheck), so the typescript-eslint *non* type-aware preset is used to
// keep lint fast and avoid duplicating tsc. react-hooks catches effect/deps and
// rules-of-hooks bugs; jsx-a11y catches accessibility mistakes at author time.
//
// The react-hooks/jsx-a11y presets still ship a legacy `plugins: [...]` shape, so
// we register the plugins as objects ourselves and borrow only their rule sets.
export default tseslint.config(
  { ignores: ['dist/**', 'coverage/**', 'node_modules/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      globals: { ...globals.browser },
    },
    plugins: {
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y,
    },
    rules: {
      ...reactHooks.configs['recommended-latest'].rules,
      ...jsxA11y.flatConfigs.recommended.rules,
      // Match existing convention: leading-underscore names are intentionally unused.
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      // --- Baseline downgrades for this first lint rollout (kept visible as warnings) ---
      // `rules-of-hooks` stays an error and still guards new code. The React-Compiler
      // oriented rules below would require rewriting working effects/memoization, which
      // is out of scope here and risks behavior changes — surface them, don't block.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-hooks/use-memo': 'warn',
      // Pre-existing intentional `any` at API-mapper/test boundaries — surface, don't block.
      '@typescript-eslint/no-explicit-any': 'warn',
      // Intentional UX (autofocus on a primary input) — advisory only.
      'jsx-a11y/no-autofocus': 'warn',
    },
  },
  {
    // Decomposition tripwire (see AGENTS.md "Component Decomposition"): a feature
    // component/page passing 600 real lines is a god-file — split it, don't ship the
    // warning. Column-definition factories are exempt (long but single-purpose).
    files: ['src/features/**/*.tsx', 'src/shared/components/**/*.tsx', 'src/entities/**/*.tsx'],
    ignores: ['src/features/master-data/components/referenceColumns.tsx'],
    rules: {
      'max-lines': ['warn', { max: 600, skipBlankLines: true, skipComments: true }],
    },
  },
);
