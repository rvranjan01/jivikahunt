import { describe, it, expect } from 'vitest';
import { spawnSync } from 'child_process';
import path from 'path';

describe('CLI Scripts Dry-Run Execution', () => {
  const scripts = [
    'scripts/seed-admin.js',
    'scripts/enable-2fa.js',
    'scripts/daily-digest.js',
    'scripts/publish-scheduled.js',
  ];

  for (const script of scripts) {
    it(`should run ${script} with plain node and --dry-run exiting with code 0`, () => {
      const scriptPath = path.resolve(process.cwd(), script);
      const result = spawnSync(process.execPath, [scriptPath, '--dry-run'], {
        encoding: 'utf8',
        env: { ...process.env, NODE_ENV: 'test' },
      });

      expect(result.status).toBe(0);
      expect(result.stdout).toContain('Dry run:');
    });
  }
});
