import { Router } from 'express';
import { mlController } from '../controllers/mlController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// All ML routes require authentication
router.use(authenticate);

// GET /api/ml/health — Check ML service availability (any authenticated user)
router.get('/health', mlController.getHealth);

// GET /api/ml/status — Get model status (admin/manager)
router.get('/status', authorize('admin', 'manager'), mlController.getModelStatus);

// POST /api/ml/train — Trigger model training (admin only)
router.post('/train', authorize('admin'), mlController.trainModel);

// GET /api/ml/forecast/:productId — Get forecast for a product (any authenticated user)
router.get('/forecast/:productId', mlController.getForecast);

export default router;
