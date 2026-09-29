import DemoControlService from '../services/demoControl.service.js';
import { ApiResponse } from '../utils/apiResponse.js';

export const DemoControlController = {
  /**
   * 1. POST /api/admin/demo/full-success
   */
  runFullSuccess: async (req, res, next) => {
    try {
      const result = await DemoControlService.runFullSuccess(req.user || {});
      return ApiResponse.success(res, {
        message: result.message,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * 2. POST /api/admin/demo/fail-bank
   */
  failBank: async (req, res, next) => {
    try {
      const result = await DemoControlService.failBankApi(req.user || {});
      return ApiResponse.success(res, {
        message: result.message,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * 3. POST /api/admin/demo/recover-bank
   */
  recoverBank: async (req, res, next) => {
    try {
      const result = await DemoControlService.recoverBankApi(req.user || {});
      return ApiResponse.success(res, {
        message: result.message,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * 4. POST /api/admin/demo/slow-income
   */
  slowIncome: async (req, res, next) => {
    try {
      const { delayMs } = req.body || {};
      const result = await DemoControlService.slowIncomeApi({ delayMs }, req.user || {});
      return ApiResponse.success(res, {
        message: result.message,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * 5. POST /api/admin/demo/invalid-income
   */
  invalidIncome: async (req, res, next) => {
    try {
      const result = await DemoControlService.invalidIncome(req.user || {});
      return ApiResponse.success(res, {
        message: result.message,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * 6. POST /api/admin/demo/duplicate
   */
  duplicate: async (req, res, next) => {
    try {
      const result = await DemoControlService.triggerDuplicate(req.user || {});
      // Return 409 status code to realistically represent duplicate detection HTTP response
      return res.status(409).json({
        success: false,
        statusCode: 409,
        error: {
          code: result.errorCode,
          message: result.message,
          details: result.details,
        },
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * 7. POST /api/admin/demo/reset
   */
  reset: async (req, res, next) => {
    try {
      const result = await DemoControlService.resetDemo(req.user || {});
      return ApiResponse.success(res, {
        message: result.message,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/admin/demo/status
   */
  getStatus: async (req, res, next) => {
    try {
      const status = await DemoControlService.getDemoStatus();
      return ApiResponse.success(res, {
        data: status,
      });
    } catch (err) {
      next(err);
    }
  },
};

export default DemoControlController;
