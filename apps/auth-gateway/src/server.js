import 'dotenv/config';

import { startGateway } from './bootstrap.js';

startGateway().catch((error) => {
  console.error('PaperBanana auth gateway failed to start', {
    error: String(error?.message || error),
  });
  process.exitCode = 1;
});
