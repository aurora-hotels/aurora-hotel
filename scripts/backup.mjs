import { DatabaseSync, backup } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
mkdirSync('backups', { recursive: true, mode: 0o700 });
const source = new DatabaseSync(process.env.DATABASE_PATH || './data/aurora.sqlite', {
  readOnly: true,
});
const target = resolve(
  'backups',
  `aurora-${new Date().toISOString().replace(/[:.]/g, '-')}.sqlite`,
);
try {
  await backup(source, target);
  console.log(`Zapisano kopię: ${target}`);
} finally {
  source.close();
}
