// Tokeny usług wewnętrznych wydaje osoba z dostępem do serwera, a nie przez API:
// administrator aplikacji nie ma uprawnień do operacji wewnętrznych.
//   npm run service-token -- create monitoring "Uptime Kuma"
//   npm run service-token -- list
//   npm run service-token -- revoke <id>
// W kontenerze: docker compose exec hotel node backend/dist/service-tokens.js create backup
import { SERVICES, createServiceToken, listServiceTokens, revokeServiceToken } from './internal.js';
import type { Service } from './internal.js';

const [command, ...args] = process.argv.slice(2);
const services = Object.keys(SERVICES) as Service[];
function usage(): never {
  console.error(
    [
      'Użycie:',
      `  create <${services.join('|')}> [nazwa]  utworzenie tokenu (wartość pokazujemy jeden raz)`,
      '  list                                   lista tokenów bez ich wartości',
      '  revoke <id>                            wyłączenie tokenu',
    ].join('\n'),
  );
  process.exit(2);
}
if (command === 'create') {
  const service = args[0] as Service;
  if (!services.includes(service)) usage();
  const name = (args[1] || service).trim().slice(0, 100) || service;
  const token = createServiceToken(service, name);
  console.log(
    `Utworzono token usługi ${service} (${token.id}), zakresy: ${token.scopes.join(', ')}`,
  );
  console.log('Zapisz go teraz, później nie da się go odczytać:');
  console.log(token.token);
} else if (command === 'list') {
  const tokens = listServiceTokens();
  if (!tokens.length) console.log('Brak tokenów usług.');
  for (const t of tokens)
    console.log(
      `${t.id}  ${t.service.padEnd(10)}  ${t.active ? 'aktywny ' : 'wyłączony'}  ${t.name}  ostatnio: ${t.lastUsedAt ?? 'nigdy'}`,
    );
} else if (command === 'revoke' && args[0]) {
  if (!revokeServiceToken(args[0])) {
    console.error('Nie znaleziono aktywnego tokenu o takim identyfikatorze.');
    process.exit(1);
  }
  console.log('Token wyłączony.');
} else usage();
