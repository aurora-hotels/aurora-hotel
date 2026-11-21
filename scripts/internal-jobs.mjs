// Zadania usług wewnętrznych do uruchamiania z crona na serwerze (API /internal/v1).
//   node scripts/internal-jobs.mjs ready       monitoring: kod wyjścia 1, gdy stan nie jest ok
//   node scripts/internal-jobs.mjs reconcile   harmonogram: wyjaśnia niepewne operacje A/B/D
//   node scripts/internal-jobs.mjs cleanup     harmonogram: usuwa wygasłe sesje i klucze ponowienia
//   node scripts/internal-jobs.mjs backup      kopia zapasowa bazy w BACKUP_DIR serwera
// Tokeny: MONITORING_TOKEN, SCHEDULER_TOKEN, BACKUP_TOKEN (npm run service-token -- create ...).
// Adres: INTERNAL_URL, domyślnie http://127.0.0.1:3001.
const base = (process.env.INTERNAL_URL || 'http://127.0.0.1:3001').replace(/\/$/, '');
const jobs = {
  ready: 'MONITORING_TOKEN',
  reconcile: 'SCHEDULER_TOKEN',
  cleanup: 'SCHEDULER_TOKEN',
  backup: 'BACKUP_TOKEN',
};
const job = process.argv[2];
if (!jobs[job]) {
  console.error(`Użycie: node scripts/internal-jobs.mjs <${Object.keys(jobs).join('|')}>`);
  process.exit(2);
}
const token = process.env[jobs[job]];
if (!token) {
  console.error(`Brak zmiennej ${jobs[job]} z tokenem usługi.`);
  process.exit(2);
}
async function call(method, path) {
  const response = await fetch(`${base}/internal/v1${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(60000),
  });
  const body = await response.json().catch(() => null);
  return { status: response.status, body };
}
function fail(result) {
  console.error(`HTTP ${result.status}: ${result.body?.error?.code ?? 'brak odpowiedzi'}`);
  process.exit(1);
}
try {
  if (job === 'ready') {
    const result = await call('GET', '/health/ready');
    if (result.status !== 200) fail(result);
    console.log(JSON.stringify(result.body));
    if (result.body.status !== 'ok') process.exit(1);
  } else if (job === 'cleanup') {
    const result = await call('POST', '/maintenance/cleanup');
    if (result.status !== 200) fail(result);
    console.log(JSON.stringify(result.body));
  } else if (job === 'backup') {
    const result = await call('POST', '/backups');
    if (result.status !== 201) fail(result);
    console.log(`Kopia: ${result.body.file} (${result.body.sizeBytes} B)`);
  } else {
    // Najpierw zbieramy całą listę, bo wyjaśnione operacje znikają z kolejnych stron.
    const operations = [];
    for (let page = 1; ; page++) {
      const result = await call('GET', `/operations/pending?page=${page}&pageSize=100`);
      if (result.status !== 200) fail(result);
      operations.push(...result.body.items);
      if (page * result.body.pageSize >= result.body.total) break;
    }
    let changed = 0,
      failed = 0;
    for (const operation of operations) {
      const result = await call(
        'POST',
        `/operations/${encodeURIComponent(operation.operationId)}/reconcile`,
      );
      if (result.status === 200) changed += result.body.changed ? 1 : 0;
      // 409 oznacza, że operację w międzyczasie wyjaśniła recepcja albo jest zajęta.
      else if (result.status !== 409) failed++;
    }
    console.log(`Operacje: ${operations.length}, zmienione: ${changed}, błędy: ${failed}`);
    if (failed) process.exit(1);
  }
} catch (error) {
  console.error(`Nie udało się połączyć z ${base}: ${error.message}`);
  process.exit(1);
}
