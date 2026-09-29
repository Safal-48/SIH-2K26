import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import config from './config/env.js';
import apiRouter from './routes/index.js';
import mockDepartmentRoutes from './routes/mockDepartment.routes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFoundHandler } from './middleware/notFoundHandler.js';

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, '../../frontend/dist');

/**
 * Express Application Configuration
 * Integrates security headers, CORS policies, logging, and routing foundations.
 */
const app = express();

// Security HTTP headers configured for SPA support
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

// Cross-Origin Resource Sharing setup
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-mock-mode', 'x-mock-delay', 'x-correlation-id'],
  })
);

// Request Logging
if (config.env !== 'test') {
  app.use(morgan(config.isProduction ? 'combined' : 'dev'));
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.post('/api/v1/internal/db-query', async (req, res) => {
  const { text, params } = req.body;
  try {
    const { query: dbQuery } = await import('./config/database.js');
    const result = await dbQuery(text, params);
    res.json({ rows: result.rows, rowCount: result.rowCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

import authRoutes from './routes/auth.routes.js';
import applicationRoutes from './routes/application.routes.js';
import workflowRoutes from './routes/workflow.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import adminRoutes from './routes/admin.routes.js';
import exceptionRoutes from './routes/exception.routes.js';

// Mount Direct Departmental Mock APIs
app.use('/api', mockDepartmentRoutes);

import { getSlaMetrics, evaluateSlaAlerts } from './controllers/notification.controller.js';
import workflowDefinitionRoutes from './routes/workflowDefinition.routes.js';

import serviceRegistryRoutes from './routes/serviceRegistry.routes.js';
import dataMappingRoutes from './routes/dataMapping.routes.js';

import demoControlRoutes from './routes/demoControl.routes.js';

import citizenRoutes from './routes/citizen.routes.js';
import officerRoutes from './routes/officer.routes.js';

// Mount Direct Core Service APIs
app.use('/api/auth', authRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/citizen', citizenRoutes);
app.use('/api/officer', officerRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/mappings', dataMappingRoutes);
app.use('/api/services', serviceRegistryRoutes);
app.use('/api/admin/demo', demoControlRoutes);
app.use('/api/demo', demoControlRoutes);
app.get('/api/sla', getSlaMetrics);
app.post('/api/sla/evaluate', evaluateSlaAlerts);
app.use('/api/admin/workflow-builder', workflowDefinitionRoutes);
app.use('/api/admin/workflow-definitions', workflowDefinitionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/exceptions', exceptionRoutes);


// Mount Master API Gateway Router
app.use(config.apiPrefix, apiRouter);

// Serve static frontend assets from Vite build
app.use(express.static(distPath));

// SPA catch-all: return index.html for any GET request that doesn't start with /api
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(distPath, 'index.html'));
});

// 404 Catch-All Middleware for API routes
app.use(notFoundHandler);

// Centralized Error Handling Middleware
app.use(errorHandler);

export default app;
