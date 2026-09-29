import { Router } from 'express';
import { authenticate, authorizeRoles, authorizeCitizenOwnership } from '../middleware/auth.js';
import { ROLES } from '../services/auth.service.js';
import { query } from '../config/database.js';
import { ApiResponse } from '../utils/apiResponse.js';
import timelineService from '../services/timeline.service.js';

const router = Router();

// All citizen routes require authentication and CITIZEN (or ADMIN) role
router.use(authenticate, authorizeRoles(ROLES.CITIZEN, ROLES.ADMIN));

/**
 * Citizen: Own applications list
 */
router.get('/applications', async (req, res, next) => {
  try {
    const citizenId = req.user.citizenId;
    const result = await query(
      `SELECT a.*, c.full_name as citizen_name 
       FROM applications a 
       JOIN citizens c ON a.citizen_id = c.citizen_id 
       WHERE a.citizen_id = $1 
       ORDER BY a.submission_date DESC`,
      [citizenId]
    );

    return ApiResponse.success(res, {
      message: 'Citizen applications retrieved',
      data: {
        citizenId,
        count: result.rows.length,
        applications: result.rows,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Citizen: Own application details
 */
router.get('/applications/:id', authorizeCitizenOwnership('id'), async (req, res, next) => {
  try {
    const result = await query(
      `SELECT * FROM applications WHERE application_id = $1 LIMIT 1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return ApiResponse.error(res, { message: 'Application not found', statusCode: 404 });
    }
    return ApiResponse.success(res, {
      message: 'Application retrieved',
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Citizen: Own application timeline / workflow steps
 */
router.get('/applications/:id/timeline', authorizeCitizenOwnership('id'), async (req, res, next) => {
  try {
    const timelineData = await timelineService.getUnifiedTimeline(req.params.id);
    if (!timelineData) {
      return ApiResponse.error(res, { message: 'Application not found', statusCode: 404 });
    }

    return ApiResponse.success(res, {
      message: 'Application timeline retrieved',
      data: timelineData,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Citizen: Own notifications
 */
router.get('/notifications', async (req, res, next) => {
  try {
    const citizenId = req.user.citizenId;
    const result = await query(
      `SELECT * FROM notifications WHERE citizen_id = $1 ORDER BY timestamp DESC LIMIT 50`,
      [citizenId]
    );

    return ApiResponse.success(res, {
      message: 'Citizen notifications retrieved',
      data: {
        citizenId,
        count: result.rows.length,
        notifications: result.rows,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
