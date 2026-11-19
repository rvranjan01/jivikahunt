import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/unit/**/*.test.js', 'tests/api/**/*.test.js'],
    setupFiles: ['./tests/setup-origin.js'],
    env: {
      JWT_SECRET: 'test_super_secret_jwt_key_at_least_32_characters_long_1234',
      HASH_SALT: 'test_hash_salt_1234567890',
      NEXT_PUBLIC_SITE_URL: 'http://localhost:3000',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
