import { createApp } from './app.js';
import { config } from './config.js';
import { seed } from './seed.js';
import { purgeExpired } from './security.js';
seed();
purgeExpired();
const cleanup = setInterval(purgeExpired, 3600000);
cleanup.unref();
const app = createApp();
const server = app.listen(config.port, config.host, () =>
  console.log(`Aurora Hotels: http://${config.host}:${config.port}`),
);
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => {
    clearInterval(cleanup);
    server.close(() => process.exit(0));
    // Otwarte połączenia keep-alive nie mogą wstrzymywać zamknięcia kontenera.
    server.closeIdleConnections();
  });
