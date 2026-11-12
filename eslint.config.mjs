import nextConfig from 'eslint-config-next';

const eslintConfig = [
  ...nextConfig,
  {
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
      'prefer-const': 'error',
    },
  },
  {
    ignores: ['.next/**', 'node_modules/**', 'docs/docx/**', 'playwright-report/**'],
  },
];

export default eslintConfig;
