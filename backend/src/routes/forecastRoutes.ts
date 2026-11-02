import { Router } from 'express';
import { forecastController } from '../controllers/forecastController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// GET /api/forecast — Overview for all products
router.get('/', forecastController.getAllForecasts);

// GET /api/forecast/:productId — Single product forecast & risk
router.get('/:productId', forecastController.getProductForecast);

export default router;
