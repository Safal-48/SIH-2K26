import { ApiResponse } from '../utils/apiResponse.js';
import { checkDatabaseConnection } from '../config/database.js';
import config from '../config/env.js';

/**
 * Health Controller
 * Provides operational liveness and readiness monitoring endpoints.
 */
export const healthController = {
  /**
   * Basic liveness probe
   */
  getHealth: async (req, res) => {
    const dbStatus = await checkDatabaseConnection();

    return ApiResponse.success(res, {
      message: 'Service is operational',
      statusCode: 200,
      data: {
        status: 'UP',
        service: 'Cross-Department Service Interoperability & Orchestration Platform API',
        environment: config.env,
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
        database: {
          connected: dbStatus.isConnected,
          latencyMs: dbStatus.latencyMs ?? null,
          statusMessage: dbStatus.message,
        },
        version: '1.0.0',
      },
    });
  },

  /**
   * System readiness probe
   */
  getReadiness: async (req, res) => {
    const dbStatus = await checkDatabaseConnection();
    const isReady = dbStatus.isConnected;

    return ApiResponse.success(res, {
      message: isReady ? 'System ready to accept traffic' : 'System running with degraded dependencies',
      statusCode: 200,
      data: {
        ready: isReady,
        checks: {
          database: dbStatus,
          memoryUsageMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
        },
      },
    });
  },
};

export default healthController;
