process.env.IS_SERVER_PROCESS = 'true';

import app from './app.js';
import config from './config/env.js';
import logger from './utils/logger.js';
import { checkDatabaseConnection, pool } from './config/database.js';

/**
 * Server Lifecycle & Startup Orchestrator
 */
const startServer = async () => {
  try {
    const server = app.listen(config.port, '0.0.0.0', async () => {
      logger.info(`=======================================================`);
      logger.info(`Cross-Department Interoperability Platform Backend`);
      logger.info(`Server running in [${config.env}] on port [${config.port}]`);
      logger.info(`API Base URL: http://localhost:${config.port}${config.apiPrefix}`);
      logger.info(`Health Endpoint: http://localhost:${config.port}${config.apiPrefix}/health`);
      logger.info(`=======================================================`);

      // Verify PostgreSQL connection status
      const dbStatus = await checkDatabaseConnection();
      if (dbStatus.isConnected) {
        logger.info(`Database: Connected to PostgreSQL successfully (${dbStatus.latencyMs}ms latency)`);
      } else {
        logger.warn(`Database: ${dbStatus.message}`);
        logger.warn(`Backend running in resilient mode (Database can be connected when ready)`);
      }
    });

    // Graceful Shutdown Handling
    const handleShutdown = async (signal) => {
      logger.info(`${signal} signal received: closing HTTP server gracefully...`);
      server.close(async () => {
        logger.info('HTTP server closed.');
        try {
          await pool.end();
          logger.info('PostgreSQL pool closed.');
        } catch (err) {
          logger.error('Error closing database pool:', err.message);
        }
        process.exit(0);
      });

      // Force close if graceful shutdown takes too long
      setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
    process.on('SIGINT', () => handleShutdown('SIGINT'));

    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled Promise Rejection:', reason);
    });

    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception thrown:', error);
      process.exit(1);
    });
  } catch (error) {
    logger.error('Fatal error during server startup:', error.message);
    process.exit(1);
  }
};

startServer();
