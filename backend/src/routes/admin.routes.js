import { Router } from 'express';
import { authenticate, authorizeRoles } from '../middleware/auth.js';
import { ROLES } from '../services/auth.service.js';
import { AdminService } from '../services/admin.service.js';
import { ExceptionService } from '../services/exception.service.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { workflowEngine } from '../workflow/workflowEngine.js';
import AuditLogModel from '../models/auditLog.model.js';
import logger from '../utils/logger.js';

const router = Router();

// Enforce authentication & ADMIN/SYSTEM role authorization on ALL admin endpoints
router.use(authenticate, authorizeRoles(ROLES.ADMIN, ROLES.SYSTEM));

/**
 * 1. Comprehensive Admin Dashboard Payload (All 10 Sections)
 * GET /api/admin/dashboard or GET /api/v1/admin/dashboard
 */
router.get('/dashboard', async (req, res, next) => {
  try {
    const data = await AdminService.getFullDashboardData();
    return ApiResponse.success(res, {
      message: 'Admin Control Center operational telemetry retrieved',
      data,
    });
  } catch (error) {
    logger.error('Error fetching admin dashboard data:', error);
    next(error);
  }
});

/**
 * 2. Overview KPIs
 * GET /api/admin/overview
 */
router.get('/overview', async (req, res, next) => {
  try {
    const overview = await AdminService.getOverviewKpis();
    return ApiResponse.success(res, {
      message: 'Overview KPIs retrieved',
      data: overview,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 3. Departmental Service Health
 * GET /api/admin/services
 */
router.get('/services', async (req, res, next) => {
  try {
    const services = await AdminService.getServiceHealth();
    return ApiResponse.success(res, {
      message: 'Departmental service health status retrieved',
      data: services,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 4. Filterable Workflows
 * GET /api/admin/workflows
 * Query params: status, search, department
 */
router.get('/workflows', async (req, res, next) => {
  try {
    const categorized = await AdminService.getCategorizedWorkflows();
    const { status, search, department } = req.query;

    let workflows = [];
    if (status === 'ACTIVE' || status === 'RUNNING') {
      workflows = categorized.active;
    } else if (status === 'COMPLETED' || status === 'SUCCESS') {
      workflows = categorized.completed;
    } else if (status === 'PENDING') {
      workflows = categorized.pending;
    } else if (status === 'FAILED' || status === 'QUEUED') {
      workflows = categorized.failed;
    } else {
      workflows = [
        ...categorized.active,
        ...categorized.completed,
        ...categorized.pending,
        ...categorized.failed,
      ];
    }

    if (search) {
      const q = search.toLowerCase();
      workflows = workflows.filter(
        (w) =>
          w.application_id?.toLowerCase().includes(q) ||
          w.citizen_id?.toLowerCase().includes(q) ||
          w.scheme_name?.toLowerCase().includes(q) ||
          w.correlation_id?.toLowerCase().includes(q)
      );
    }

    return ApiResponse.success(res, {
      message: 'Workflows retrieved',
      data: {
        count: workflows.length,
        workflows,
        summary: {
          activeCount: categorized.active.length,
          completedCount: categorized.completed.length,
          pendingCount: categorized.pending.length,
          failedCount: categorized.failed.length,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 5. Resume / Re-run Workflow (Admin Operation)
 * POST /api/admin/workflows/:id/resume
 */
router.post('/workflows/:id/resume', async (req, res, next) => {
  try {
    const applicationId = req.params.id;

    // Log admin intervention to immutable audit trail
    await AuditLogModel.log({
      requestId: `REQ-ADMIN-RESUME-${Date.now().toString().slice(-6)}`,
      actorType: 'ADMIN',
      actorId: req.user?.username || 'admin',
      departmentCode: 'INTEROP',
      action: 'ADMIN_WORKFLOW_RESUME',
      entityType: 'APPLICATION',
      entityId: applicationId,
      status: 'RUNNING',
      ipAddress: req.ip || '127.0.0.1',
      metadata: { initiatedBy: req.user?.username, role: req.user?.role },
    });

    const executionResult = await workflowEngine.executeWorkflow(applicationId, {
      mockMode: true,
      isResume: true,
    });

    return ApiResponse.success(res, {
      message: `Admin resumed workflow for application ${applicationId}`,
      data: executionResult,
    });
  } catch (error) {
    logger.error(`Error resuming workflow ${req.params.id}:`, error);
    next(error);
  }
});

/**
 * 6. SLA Monitoring
 * GET /api/admin/sla
 */
router.get('/sla', async (req, res, next) => {
  try {
    const sla = await AdminService.getSlaMonitoring();
    return ApiResponse.success(res, {
      message: 'SLA telemetry metrics retrieved',
      data: sla,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 7. Exception Queue (Failed and Retrying Steps)
 * GET /api/admin/exceptions
 */
router.get('/exceptions', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit || '50', 10);
    const exceptions = await AdminService.getRecentExceptions(limit);
    return ApiResponse.success(res, {
      message: 'Exception queue retrieved',
      data: {
        count: exceptions.length,
        exceptions,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 7b. Retry Exception from Admin Console
 * POST /api/admin/exceptions/:id/retry
 */
router.post('/exceptions/:id/retry', async (req, res, next) => {
  try {
    const { id } = req.params;
    const actorId = req.user?.username || 'ADMIN';
    const result = await ExceptionService.retryException(id, {
      ...req.body,
      actorId,
      actorType: 'ADMIN',
    });

    const statusCode = result.success ? 200 : 202;
    return ApiResponse.success(res, {
      message: result.message,
      data: result.data,
      statusCode,
    });
  } catch (error) {
    next(error);
  }
});


/**
 * 8. Audit Trail Logs
 * GET /api/admin/audit-logs
 */
router.get('/audit-logs', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit || '50', 10);
    const logs = await AdminService.getRecentAuditEvents(limit);
    return ApiResponse.success(res, {
      message: 'System audit logs retrieved',
      data: {
        count: logs.length,
        logs,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 9. Live Events Stream
 * GET /api/admin/live-events
 */
router.get('/live-events', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit || '50', 10);
    const events = await AdminService.getLiveEvents(limit);
    return ApiResponse.success(res, {
      message: 'Live operational events retrieved',
      data: {
        count: events.length,
        events,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 10. Backward-compatible /monitoring endpoint
 * GET /api/admin/monitoring
 */
router.get('/monitoring', async (req, res, next) => {
  try {
    const overview = await AdminService.getOverviewKpis();
    const serviceHealth = await AdminService.getServiceHealth();

    return ApiResponse.success(res, {
      message: 'System monitoring metrics retrieved',
      data: {
        overview,
        serviceHealth,
        applications: {
          total: overview.totalApplications,
          active: overview.activeWorkflows,
          completed: overview.completedWorkflows,
          pending: overview.pendingWorkflows,
          failed: overview.failedWorkflows,
        },
        workflowSteps: {
          totalDispatches: overview.totalApiDispatches,
          success: overview.successfulDispatches,
          failed: overview.failedDispatches,
        },
        activeEngines: [
          'PostgreSQL (Relational Grid)',
          'Workflow Engine v1',
          'Data Mapper v1',
          'Connector Abstraction Layer',
        ],
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
