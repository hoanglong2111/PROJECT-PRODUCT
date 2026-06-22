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
      from: { path: '^src/(app|features|shared|entities)' },
      to: {
        path: '^src/(api|auth|components|hooks|preferences|stores|theme|utils)/',
      },
    },
    {
      name: 'entities-no-upward-imports',
      comment: 'Layering is features -> entities -> shared. entities/ may use shared/ but must not import features/.',
      severity: 'error',
      from: { path: '^src/entities' },
      to: { path: '^src/features' },
    },
    {
      name: 'shared-no-upward-imports',
      comment: 'shared/ is the lowest layer and must not import from entities/ or features/.',
      severity: 'error',
      from: { path: '^src/shared' },
      to: { path: '^src/(entities|features)' },
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
