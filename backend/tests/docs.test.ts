import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

// Katalog endpointów w dokumentacji ma opisywać każdą operację z kontraktów OpenAPI.
// Test pilnuje, żeby nowa operacja nie została dodana bez wpisu w katalogu i karty.
function operationsOf(file: string, prefix: string) {
  const text = readFileSync(file, 'utf8');
  const operations: string[] = [];
  let path = '';
  for (const line of text.slice(text.indexOf('\npaths:')).split('\n').slice(2)) {
    if (/^\S/.test(line)) break;
    const pathMatch = /^ {2}(\/\S*):$/.exec(line);
    if (pathMatch) path = pathMatch[1]!;
    const method = /^ {4}(get|post|patch|put|delete):$/.exec(line);
    if (method)
      operations.push(
        `${method[1]!.toUpperCase()} ${path === '/health' ? path : `${prefix}${path}`}`,
      );
  }
  return operations;
}
describe('Dokumentacja API', () => {
  const operations = [
    ...operationsOf('docs/openapi.yaml', '/api/v1'),
    ...operationsOf('docs/openapi-internal.yaml', '/internal/v1'),
  ];
  const catalog = readFileSync('docs/api/projekt-endpointow.md', 'utf8');
  const cards = readFileSync('docs/api/karty-endpointow.md', 'utf8');
  it('każda operacja OpenAPI ma wpis w katalogu endpointów i kartę', () => {
    expect(operations.length).toBeGreaterThan(50);
    expect(new Set(operations).size).toBe(operations.length);
    const missing = operations.filter(
      (operation) => !catalog.includes(`\`${operation}\``) || !cards.includes(`\`${operation}\``),
    );
    expect(missing).toEqual([]);
  });
  it('katalog nie opisuje operacji spoza kontraktów', () => {
    const section = catalog.slice(
      catalog.indexOf('## Katalog endpointów'),
      catalog.indexOf('## Macierz uprawnień'),
    );
    const documented = [
      ...section.matchAll(
        /`(GET|POST|PATCH|PUT|DELETE) (\/(?:api\/v1|internal\/v1|health)[^`]*)`/g,
      ),
    ].map((match) => `${match[1]} ${match[2]}`);
    expect(documented.length).toBe(operations.length);
    const unknown = [...new Set(documented)].filter((operation) => !operations.includes(operation));
    expect(unknown).toEqual([]);
  });
});
