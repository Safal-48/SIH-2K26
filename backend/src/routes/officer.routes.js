import { Router } from 'express';
import { authenticate, authorizeRoles } from '../middleware/auth.js';
import { ROLES } from '../services/auth.service.js';
import { query } from '../config/database.js';
import { ApiResponse } from '../utils/apiResponse.js';

const router = Router();

// All officer routes require authentication
router.use(authenticate);

/**
 * Education Officer: Education verification cases
 */
router.get(
  '/education/cases',
  authorizeRoles(ROLES.EDUCATION_OFFICER, ROLES.ADMIN),
  async (req, res, next) => {
    try {
      const result = await query(
        `SELECT a.application_id, a.citizen_id, a.scheme_name, a.student_id, a.status, a.current_step,
                e.institution_name, e.course, e.cgpa, e.enrollment_status
         FROM applications a
         LEFT JOIN education_records e ON a.student_id = e.student_id
         WHERE a.current_step = 'EDUCATION_VERIFICATION' OR a.status = 'SUBMITTED'
         ORDER BY a.submission_date ASC`
      );

      return ApiResponse.success(res, {
        message: 'Education verification cases retrieved',
        data: {
          department: 'EDU',
          role: req.user.role,
          count: result.rows.length,
          cases: result.rows,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Revenue Officer: Income verification cases
 */
router.get(
  '/revenue/cases',
  authorizeRoles(ROLES.REVENUE_OFFICER, ROLES.ADMIN),
  async (req, res, next) => {
    try {
      const result = await query(
        `SELECT a.application_id, a.citizen_id, a.scheme_name, a.income_certificate_no, a.declared_income, a.status, a.current_step,
                i.annual_income as verified_annual_income, i.certificate_category, i.status as cert_status
         FROM applications a
         LEFT JOIN income_records i ON a.income_certificate_no = i.income_certificate_no
         WHERE a.current_step = 'INCOME_VERIFICATION' OR a.status = 'SUBMITTED'
         ORDER BY a.submission_date ASC`
      );

      return ApiResponse.success(res, {
        message: 'Revenue/Income verification cases retrieved',
        data: {
          department: 'REV',
          role: req.user.role,
          count: result.rows.length,
          cases: result.rows,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Bank/DBT Officer: Bank verification cases
 */
router.get(
  '/bank/cases',
  authorizeRoles(ROLES.BANK_DBT_OFFICER, ROLES.ADMIN),
  async (req, res, next) => {
    try {
      const result = await query(
        `SELECT a.application_id, a.citizen_id, a.scheme_name, a.account_reference, a.benefit_amount, a.status, a.current_step,
                b.bank_name, b.account_number_masked, b.is_aadhaar_seeded, b.dbt_active
         FROM applications a
         LEFT JOIN bank_records b ON a.account_reference = b.account_reference
         WHERE a.current_step = 'BANK_VERIFICATION' OR a.status = 'SUBMITTED'
         ORDER BY a.submission_date ASC`
      );

      return ApiResponse.success(res, {
        message: 'Bank/DBT verification cases retrieved',
        data: {
          department: 'DBT',
          role: req.user.role,
          count: result.rows.length,
          cases: result.rows,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
