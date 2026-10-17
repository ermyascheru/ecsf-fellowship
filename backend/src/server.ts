import app from './app.js';
import { ENV } from './config/env.js';
import { query } from './config/db.js';

async function startServer() {
  try {
    // Test PostgreSQL database connection
    const res = await query('SELECT current_database(), version()');
    const dbName = res.rows[0].current_database;
    console.log(`[Database] Successfully connected to PostgreSQL: ${dbName}`);

    app.listen(ENV.PORT, () => {
      console.log(`[Server] FTVTI ECSF Backend listening on http://localhost:${ENV.PORT}`);
      console.log(`[Server] Environment: ${ENV.NODE_ENV}`);
    });
  } catch (err) {
    console.error('[Startup Error] Failed to connect to PostgreSQL database:', err);
    process.exit(1);
  }
}

startServer();
