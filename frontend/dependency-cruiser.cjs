module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
    {
      name: 'no-backend-imports',
      severity: 'error',
      from: { path: '^src' },
      to: { path: '(^|/)backend/' },
    },
    {
      name: 'no-legacy-root-imports',
      severity: 'warn',
      from: { path: '^src/(app|features|shared)' },
      to: {
        path: '^src/(api|auth|components|hooks|preferences|stores|theme|utils)/',
      },
    },
    {
      name: 'orphan-candidates',
      severity: 'warn',
      from: {
        orphan: true,
        pathNot: [
          '^src/main\\.tsx$',
          '^src/vite-env\\.d\\.ts$',
          '^src/mantine-types\\.d\\.ts$',
          '^src/test-setup\\.ts$',
          '^src/shared/model/',
          '\\.test\\.tsx?$',
          '__tests__',
        ],
      },
      to: {},
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsConfig: { fileName: 'tsconfig.json' },
  },
};
