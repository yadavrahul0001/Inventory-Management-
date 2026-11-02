import { Router } from 'express';
import { anomalyController } from '../controllers/anomalyController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// GET /api/anomalies
router.get('/', anomalyController.getAnomalies);

export default router;
