import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

// Katalog endpointów w dokumentacji ma opisywać każdą operację z kontraktu OpenAPI.
// Test pilnuje, żeby nowa operacja nie została dodana bez wpisu w katalogu i karty.
describe('Dokumentacja API', () => {
  const openapi = readFileSync('docs/openapi.yaml', 'utf8');
  const catalog = readFileSync('docs/api/projekt-endpointow.md', 'utf8');
  const cards = readFileSync('docs/api/karty-endpointow.md', 'utf8');
  const operations: string[] = [];
  let path = '';
  for (const line of openapi.slice(openapi.indexOf('\npaths:')).split('\n')) {
    if (/^\S/.test(line) && !line.startsWith('paths:')) break;
    const pathMatch = /^  (\/\S*):$/.exec(line);
    if (pathMatch) path = pathMatch[1]!;
    const method = /^    (get|post|patch|put|delete):$/.exec(line);
    if (method)
      operations.push(
        `${method[1]!.toUpperCase()} ${path === '/health' ? path : `/api/v1${path}`}`,
      );
  }
  it('każda operacja OpenAPI ma wpis w katalogu endpointów i kartę', () => {
    expect(operations.length).toBeGreaterThan(40);
    const missing = operations.filter(
      (operation) => !catalog.includes(`\`${operation}\``) || !cards.includes(`\`${operation}\``),
    );
    expect(missing).toEqual([]);
  });
  it('katalog nie opisuje operacji usuniętych z kontraktu', () => {
    const section = catalog.slice(
      catalog.indexOf('## Katalog endpointów'),
      catalog.indexOf('## Macierz uprawnień'),
    );
    const documented = [
      ...section.matchAll(/`(GET|POST|PATCH|PUT|DELETE) (\/(?:api\/v1|health)[^`]*)`/g),
    ].map((match) => `${match[1]} ${match[2]}`);
    expect(documented.length).toBe(operations.length);
    const unknown = [...new Set(documented)].filter((operation) => !operations.includes(operation));
    expect(unknown).toEqual([]);
  });
});
