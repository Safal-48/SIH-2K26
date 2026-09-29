import { Router } from 'express';
import applicationController from '../controllers/application.controller.js';
import consentController from '../controllers/consent.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validate.js';
import { applicationSchemas, consentSchemas } from '../validators/schemas.js';

const router = Router();

// Middleware to optionally authenticate if Authorization header is present
const optionalAuth = (req, res, next) => {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    return authenticate(req, res, next);
  }
  next();
};

/**
 * 1. Submit Scholarship Application (with Zod validation)
 * POST /api/applications
 */
router.post(
  '/',
  optionalAuth,
  applicationController.createApplication
);

/**
 * 2. Get Application by ID
 * GET /api/applications/:id
 */
router.get('/:id', optionalAuth, applicationController.getById);

/**
 * 3. Get Application Workflow Timeline
 * GET /api/applications/:id/timeline
 */
router.get('/:id/timeline', optionalAuth, applicationController.getTimeline);

/**
 * 4. Citizen Consent Endpoints (with Zod validation)
 * POST /api/applications/:id/consent
 * GET /api/applications/:id/consent
 * POST /api/applications/:id/consent/revoke
 * DELETE /api/applications/:id/consent
 */
router.post(
  '/:id/consent',
  optionalAuth,
  validateRequest({ params: consentSchemas.paramsId, body: consentSchemas.grant }),
  consentController.grantConsent
);
router.get('/:id/consent', optionalAuth, consentController.getConsent);
router.post(
  '/:id/consent/revoke',
  optionalAuth,
  validateRequest({ params: consentSchemas.paramsId }),
  consentController.revokeConsent
);
router.delete(
  '/:id/consent',
  optionalAuth,
  validateRequest({ params: consentSchemas.paramsId }),
  consentController.revokeConsent
);

/**
 * 5. List Applications
 * GET /api/applications
 */
router.get('/', optionalAuth, applicationController.list);

export default router;
