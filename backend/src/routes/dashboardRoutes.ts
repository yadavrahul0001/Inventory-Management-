import { Router } from 'express';
import { dashboardController } from '../controllers/dashboardController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All dashboard routes require authentication (staff, manager, admin can view)
router.use(authenticate);

router.get('/summary', (req, res, next) => dashboardController.getSummary(req, res, next));
router.get('/charts', (req, res, next) => dashboardController.getCharts(req, res, next));

export default router;
