import nextPlugin from 'eslint-config-next';

const eslintConfig = [
  {
    ignores: [
      '.next/**',
      'out/**',
      'build/**',
      'node_modules/**',
      'next-env.d.ts',
      'code-review/**',
      'oldstuff/**',
      '**/*.config.js',
      '**/*.config.mjs',
    ],
  },
  ...nextPlugin,
];

export default eslintConfig;
