import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { PGlite } from '@electric-sql/pglite';
import config from './env.js';
import logger from '../utils/logger.js';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pgDataDir = path.resolve(__dirname, '../../../database/pgdata');

/**
 * Native PostgreSQL Pool
 */
export const pool = new Pool(config.db);

pool.on('error', (err) => {
  logger.error('Unexpected idle native PostgreSQL client error:', err.message);
});

// Singleton embedded PostgreSQL instance (PGlite)
let embeddedDb = null;
let activeEngine = 'native'; // 'native' | 'embedded'

async function getEmbeddedDb() {
  if (!embeddedDb) {
    if (!fs.existsSync(pgDataDir)) {
      fs.mkdirSync(pgDataDir, { recursive: true });
    }
    embeddedDb = new PGlite(pgDataDir);
    await embeddedDb.waitReady;
    logger.info(`Initialized persistent embedded PostgreSQL engine at: ${pgDataDir}`);
  }
  return embeddedDb;
}

/**
 * Health check function for PostgreSQL connection
 * Tests native PostgreSQL first; if offline, verifies embedded PostgreSQL engine.
 * @returns {Promise<{ isConnected: boolean, latencyMs?: number, message: string, engine: string }>}
 */
export const checkDatabaseConnection = async () => {
  const start = Date.now();
  // 1. Check Native PostgreSQL Pool
  try {
    const client = await pool.connect();
    try {
      await client.query('SELECT 1');
      const latencyMs = Date.now() - start;
      activeEngine = 'native';
      return {
        isConnected: true,
        latencyMs,
        engine: 'PostgreSQL (Native)',
        message: 'Connected to native PostgreSQL server',
      };
    } finally {
      client.release();
    }
  } catch (nativeErr) {
    // 2. Check Persistent Embedded PostgreSQL Engine
    try {
      const db = await getEmbeddedDb();
      await db.query('SELECT 1');
      const latencyMs = Date.now() - start;
      activeEngine = 'embedded';
      return {
        isConnected: true,
        latencyMs,
        engine: 'PostgreSQL (Embedded PGlite)',
        message: 'Operating on persistent embedded PostgreSQL engine',
      };
    } catch (embeddedErr) {
      return {
        isConnected: false,
        latencyMs: null,
        engine: 'none',
        message: `Database connection unavailable: ${nativeErr.message}; ${embeddedErr.message}`,
      };
    }
  }
};

let serverRunningCache = null;
let lastCheckTime = 0;

async function isServerRunning() {
  const now = Date.now();
  if (serverRunningCache !== null && now - lastCheckTime < 2000) {
    return serverRunningCache;
  }
  lastCheckTime = now;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1000);
    const res = await fetch(`http://localhost:${config.port || 5000}/api/v1/health`, { signal: controller.signal });
    clearTimeout(timeout);
    serverRunningCache = res.ok;
    return serverRunningCache;
  } catch {
    serverRunningCache = false;
    return false;
  }
}

/**
 * Fallback to query running server process over HTTP if local embedded directory is locked
 */
async function queryHttpBridge(text, params = []) {
  const port = config.port || 5000;
  const url = `http://localhost:${port}/api/v1/internal/db-query`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, params }),
    });
    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      throw new Error(errBody.error || `HTTP DB query failed with status ${response.status}`);
    }
    return await response.json();
  } catch (err) {
    throw new Error(`Database unavailable locally and HTTP fallback to ${url} failed: ${err.message}`);
  }
}

/**
 * Global BigInt serialization for JSON responses
 */
if (typeof BigInt !== 'undefined' && !BigInt.prototype.toJSON) {
  BigInt.prototype.toJSON = function () {
    const n = Number(this);
    return Number.isSafeInteger(n) ? n : this.toString();
  };
}

let embeddedQueue = Promise.resolve();

async function execEmbeddedQuery(text, params) {
  const db = await getEmbeddedDb();
  return new Promise((resolve, reject) => {
    const run = async () => {
      try {
        const res = await db.query(text, params);
        resolve(res);
      } catch (err) {
        reject(err);
      }
    };
    embeddedQueue = embeddedQueue.then(run, run);
  });
}


/**
 * Execute a query with parameterization across active PostgreSQL engine
 * @param {string} text - SQL query string
 * @param {Array} params - Parameter values
 * @returns {Promise<{ rows: Array, rowCount: number }>}
 */
export const query = async (text, params = []) => {
  const start = Date.now();
  try {
    if (activeEngine === 'native') {
      try {
        const res = await pool.query(text, params);
        const duration = Date.now() - start;
        logger.debug('Native PostgreSQL query executed', { text, duration: `${duration}ms`, rows: res.rowCount });
        return res;
      } catch (err) {
        // If native query fails because server disconnected, switch immediately to embedded
        activeEngine = 'embedded';
        logger.warn('Native PostgreSQL query failed, attempting embedded engine...', err.message);
        if (process.env.IS_SERVER_PROCESS !== 'true' && (await isServerRunning())) {
          return await queryHttpBridge(text, params);
        }
        try {
          const res = await execEmbeddedQuery(text, params);
          const duration = Date.now() - start;
          return { rows: res.rows, rowCount: res.rows.length };
        } catch (embeddedErr) {
          if (await isServerRunning()) {
            return await queryHttpBridge(text, params);
          }
          throw embeddedErr;
        }
      }
    } else {
      // If we are NOT the primary server process and the server is running on port 5000,
      // proactively route query through HTTP bridge to avoid Windows file-lock contention on database/pgdata
      if (process.env.IS_SERVER_PROCESS !== 'true' && (await isServerRunning())) {
        return await queryHttpBridge(text, params);
      }

      try {
        const res = await execEmbeddedQuery(text, params);
        const duration = Date.now() - start;
        logger.debug('Embedded PostgreSQL query executed', { duration: `${duration}ms`, rows: res.rows.length });
        return { rows: res.rows, rowCount: res.rows.length };
      } catch (embeddedErr) {
        if (await isServerRunning()) {
          return await queryHttpBridge(text, params);
        }
        throw embeddedErr;
      }
    }
  } catch (error) {
    logger.error('Database query error:', { text, error: error.message });
    throw error;
  }
};


/**
 * Helper to acquire transaction client
 */
export const getClient = async () => {
  if (activeEngine === 'native') {
    return await pool.connect();
  }
  const db = await getEmbeddedDb();
  return {
    query: (text, params) => db.query(text, params),
    release: () => {},
  };
};

export default {
  pool,
  query,
  getClient,
  checkDatabaseConnection,
};
