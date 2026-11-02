import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

// Własna baza i konta tylko dla przeglądarkowych testów. Dane dewelopera są bezpieczne.
const directory = mkdtempSync(path.join(tmpdir(), 'aurora-e2e-'));
process.env.DATABASE_PATH = path.join(directory, 'e2e.sqlite');
process.env.NODE_ENV = 'test';
process.env.COOKIE_SECURE = 'false';
process.env.PORT = '3101';
process.env.APP_ORIGIN = 'http://127.0.0.1:5174';
process.env.ADMIN_EMAIL = 'admin@e2e.test';
process.env.ADMIN_PASSWORD = 'E2e-admin-password-2026';
process.env.CONFIG_ENCRYPTION_KEY = 'd'.repeat(64);
process.env.LOGIN_RATE_LIMIT = '1000';
process.env.PUBLIC_RATE_LIMIT = '10000';
const { seed } = await import('../../backend/src/seed.js');
const { createApp } = await import('../../backend/src/app.js');
const { db, run } = await import('../../backend/src/db.js');
const { hashPassword } = await import('../../backend/src/security.js');
seed();
run(
  'INSERT INTO users(id,email,passwordHash,name,phone,role,createdAt) VALUES(?,?,?,?,?,?,?)',
  'e2e-reception',
  'reception@e2e.test',
  hashPassword('E2e-reception-password-2026'),
  'Recepcja Testowa',
  '',
  'receptionist',
  new Date().toISOString(),
);
const server = createApp().listen(3101, '127.0.0.1');
function stop() {
  server.close(() => {
    db.close();
    rmSync(directory, { recursive: true, force: true });
    process.exit(0);
  });
}
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
