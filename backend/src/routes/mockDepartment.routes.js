import { Router } from 'express';
import mockDepartmentController from '../controllers/mockDepartment.controller.js';

const router = Router();

// ==============================================================================
// 1. Education Verification Endpoint
// ==============================================================================
router.post('/education/verify', mockDepartmentController.verifyEducation);

// ==============================================================================
// 2. Income Verification Endpoint
// ==============================================================================
router.post('/income/verify', mockDepartmentController.verifyIncome);
router.get('/income/control', mockDepartmentController.getIncomeControl);
router.post('/income/control', mockDepartmentController.setIncomeControl);

// ==============================================================================
// 3. Bank / DBT Verification Endpoint
// ==============================================================================
router.post('/bank/verify', mockDepartmentController.verifyBank);
router.get('/bank/control', mockDepartmentController.getBankControl);
router.post('/bank/control', mockDepartmentController.setBankControl);

// ==============================================================================
// 4. Mock Diagnostic & State Reset Endpoints
// ==============================================================================
router.get('/mock/status', mockDepartmentController.getStatus);
router.post('/mock/reset', mockDepartmentController.resetControl);

export default router;
