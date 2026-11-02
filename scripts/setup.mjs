import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
if (Number(process.versions.node.split('.')[0]) !== 24)
  throw new Error('Uruchom projekt na Node.js 24 LTS.');
if (!existsSync('.env')) {
  const password = randomBytes(18).toString('base64url');
  const template = readFileSync('.env.example', 'utf8')
    .replace(/^SESSION_SECRET=.*$/m, `SESSION_SECRET=${randomBytes(32).toString('hex')}`)
    .replace(
      /^CONFIG_ENCRYPTION_KEY=.*$/m,
      `CONFIG_ENCRYPTION_KEY=${randomBytes(32).toString('hex')}`,
    )
    .replace(/^ADMIN_PASSWORD=.*$/m, `ADMIN_PASSWORD=${password}`);
  writeFileSync('.env', template, { mode: 0o600 });
  console.log(
    'Utworzono .env. Dane logowania znajdziesz w ADMIN_EMAIL i ADMIN_PASSWORD. Nie udostępniaj tego pliku.',
  );
}
mkdirSync('data', { recursive: true });
for (const args of [['ci'], ['run', 'seed']]) {
  const result = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
console.log('Gotowe. Uruchom npm run dev i otwórz http://localhost:5173.');
