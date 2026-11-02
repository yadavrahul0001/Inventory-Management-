import { Router } from 'express';
import { insightsController } from '../controllers/insightsController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// GET /api/insights/summary — Severity counts
router.get('/summary', insightsController.getInsightsSummary);

// GET /api/insights — All generated insights
router.get('/', insightsController.getInsights);

export default router;
