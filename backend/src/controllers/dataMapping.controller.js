import DataMappingRuleService from '../services/dataMappingRule.service.js';
import { ApiResponse } from '../utils/apiResponse.js';

export const DataMappingController = {
  /**
   * GET /api/mappings
   * List all data mappings with optional sourceSystem or department filtering
   */
  listMappings: async (req, res, next) => {
    try {
      const { sourceSystem, department, departmentCode, search } = req.query;
      const filters = {
        sourceSystem,
        departmentCode: departmentCode || department,
        search,
      };

      const mappings = await DataMappingRuleService.getAllMappings(filters);
      return ApiResponse.success(res, {
        message: 'Data mappings retrieved successfully',
        data: mappings,
        count: mappings.length,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/mappings/:id
   */
  getMapping: async (req, res, next) => {
    try {
      const { id } = req.params;
      const mapping = await DataMappingRuleService.getMappingById(id);
      if (!mapping) {
        return ApiResponse.notFound(res, `Mapping with ID "${id}" not found`);
      }
      return ApiResponse.success(res, {
        data: mapping,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/mappings
   */
  createMapping: async (req, res, next) => {
    try {
      const created = await DataMappingRuleService.createMapping(req.body, req.user || {});
      return ApiResponse.created(res, {
        message: 'Data mapping rule created successfully',
        data: created,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * PUT /api/mappings/:id
   */
  updateMapping: async (req, res, next) => {
    try {
      const { id } = req.params;
      const updated = await DataMappingRuleService.updateMapping(id, req.body, req.user || {});
      return ApiResponse.success(res, {
        message: 'Data mapping rule updated successfully',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * DELETE /api/mappings/:id
   */
  deleteMapping: async (req, res, next) => {
    try {
      const { id } = req.params;
      const deleted = await DataMappingRuleService.deleteMapping(id, req.user || {});
      return ApiResponse.success(res, {
        message: 'Data mapping rule deleted successfully',
        data: deleted,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/mappings/test
   * Interactive rule testing
   */
  testRule: async (req, res, next) => {
    try {
      const value = req.body.value !== undefined ? req.body.value : req.body.sampleValue;
      const rule = req.body.rule || req.body.transformationRule;
      const result = DataMappingRuleService.testTransformation(value, rule);
      return ApiResponse.success(res, {
        message: 'Transformation evaluated successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },
};

export default DataMappingController;
