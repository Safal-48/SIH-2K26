import { Router } from 'express';
import healthRoutes from './health.routes.js';
import mockRoutes from './mockDepartment.routes.js';
import workflowRoutes from './workflow.routes.js';
import authRoutes from './auth.routes.js';
import applicationRoutes from './application.routes.js';
import citizenRoutes from './citizen.routes.js';
import officerRoutes from './officer.routes.js';
import adminRoutes from './admin.routes.js';
import notificationRoutes from './notification.routes.js';
import exceptionRoutes from './exception.routes.js';
import { ApiResponse } from '../utils/apiResponse.js';

const router = Router();

/**
 * Root API Gateway endpoint
 */
router.get('/', (req, res) => {
  return ApiResponse.success(res, {
    message: 'Welcome to the Cross-Department Service Interoperability & Orchestration Platform API Gateway',
    data: {
      version: 'v1',
      endpoints: {
        health: '/api/v1/health',
        auth: '/api/v1/auth',
        applications: '/api/v1/applications',
        workflows: '/api/v1/workflows',
        citizen: '/api/v1/citizen',
        officer: '/api/v1/officer',
        admin: '/api/v1/admin',
        exceptions: '/api/v1/exceptions',
        mockEducationVerify: '/api/education/verify',
        mockIncomeVerify: '/api/income/verify',
        mockBankVerify: '/api/bank/verify',
      },
    },
  });
});

import { getSlaMetrics, evaluateSlaAlerts } from '../controllers/notification.controller.js';
import workflowDefinitionRoutes from './workflowDefinition.routes.js';

import serviceRegistryRoutes from './serviceRegistry.routes.js';
import dataMappingRoutes from './dataMapping.routes.js';
import demoControlRoutes from './demoControl.routes.js';

// Mount module routes
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/applications', applicationRoutes);
router.use('/workflows', workflowRoutes);
router.use('/citizen', citizenRoutes);
router.use('/officer', officerRoutes);
router.use('/admin/workflow-builder', workflowDefinitionRoutes);
router.use('/admin/workflow-definitions', workflowDefinitionRoutes);
router.use('/admin/demo', demoControlRoutes);
router.use('/demo', demoControlRoutes);
router.use('/admin', adminRoutes);
router.use('/exceptions', exceptionRoutes);
router.use('/notifications', notificationRoutes);
router.use('/mappings', dataMappingRoutes);
router.use('/services', serviceRegistryRoutes);
router.get('/sla', getSlaMetrics);
router.post('/sla/evaluate', evaluateSlaAlerts);
router.use('/', mockRoutes);

export default router;
