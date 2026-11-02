import { createApp } from './app.js';
import { config } from './config.js';
import { seed } from './seed.js';
seed();
const app = createApp();
const server = app.listen(config.port, config.host, () =>
  console.log(`Aurora Hotels: http://${config.host}:${config.port}`),
);
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => server.close(() => process.exit(0)));
