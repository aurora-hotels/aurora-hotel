import { DatabaseSync, backup } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
// BACKUP_DIR pozwala zapisać kopię na osobnym woluminie (tak robi obraz Dockera).
const directory = process.env.BACKUP_DIR || 'backups';
mkdirSync(directory, { recursive: true, mode: 0o700 });
const source = new DatabaseSync(process.env.DATABASE_PATH || './data/aurora.sqlite', {
  readOnly: true,
});
const target = resolve(
  directory,
  `aurora-${new Date().toISOString().replace(/[:.]/g, '-')}.sqlite`,
);
try {
  await backup(source, target);
  console.log(`Zapisano kopię: ${target}`);
} finally {
  source.close();
}
