import { describe, it, expect } from 'vitest';
import { spawnSync } from 'child_process';
import path from 'path';

describe('CLI Scripts Dry-Run Execution', () => {
  const scripts = [
    'scripts/seed-admin.js',
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

  it('scripts/seed-admin.js should reject passwords shorter than 8 characters', () => {
    const scriptPath = path.resolve(process.cwd(), 'scripts/seed-admin.js');
    const result = spawnSync(process.execPath, [scriptPath, 'test@example.com', 'short'], {
      encoding: 'utf8',
      env: { ...process.env, NODE_ENV: 'test' },
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('at least 8 characters');
  });
});
