import ServiceRegistryService from '../services/serviceRegistry.service.js';
import { ApiResponse } from '../utils/apiResponse.js';

export const ServiceRegistryController = {
  /**
   * GET /api/services
   * List all registered departmental services with health, connector type, and latency
   */
  listServices: async (req, res, next) => {
    try {
      const services = await ServiceRegistryService.getAllServices();
      return ApiResponse.success(res, {
        message: 'Departmental services retrieved successfully',
        data: services,
        count: services.length,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/services/:id
   * Get single service details
   */
  getService: async (req, res, next) => {
    try {
      const { id } = req.params;
      const srv = await ServiceRegistryService.getServiceById(id);
      if (!srv) {
        return ApiResponse.notFound(res, `Service "${id}" not found`);
      }
      return ApiResponse.success(res, {
        data: srv,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/services/:id/test
   * Execute real backend health/probe test against service connector and persist telemetry
   */
  testService: async (req, res, next) => {
    try {
      const { id } = req.params;
      const result = await ServiceRegistryService.testService(id, req.user || {});
      return ApiResponse.success(res, {
        message: `Connector test executed for ${result.service.serviceCode}. Health and latency persisted.`,
        data: result.service,
        testResult: result.testResult,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * PUT /api/services/:id
   * Update service configuration (connector type, endpoint, timeout, etc.)
   */
  updateConfig: async (req, res, next) => {
    try {
      const { id } = req.params;
      const updated = await ServiceRegistryService.updateServiceConfig(id, req.body, req.user || {});
      return ApiResponse.success(res, {
        message: `Service configuration updated for ${id}`,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  },
};

export default ServiceRegistryController;
