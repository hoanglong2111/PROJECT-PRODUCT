module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
    {
      name: 'routes-only-use-http-layer',
      severity: 'error',
      from: { path: '^routes' },
      to: { path: '^(models|services|config/database)' },
    },
    {
      name: 'controllers-no-persistence',
      severity: 'error',
      from: { path: '^controllers' },
      to: { path: '^(models|config/database)' },
    },
    {
      name: 'services-no-http-layer',
      severity: 'error',
      from: { path: '^services' },
      to: { path: '^(routes|controllers|middlewares)' },
    },
    {
      name: 'models-no-upper-layers',
      severity: 'error',
      from: { path: '^models' },
      to: { path: '^(routes|controllers|middlewares|services)' },
    },
    {
      name: 'no-frontend-imports',
      severity: 'error',
      from: {},
      to: { path: '(^|/)frontend/' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsConfig: { fileName: 'tsconfig.json' },
  },
};
