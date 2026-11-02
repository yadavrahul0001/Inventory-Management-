import { Router } from 'express';
import { inventoryController } from '../controllers/inventoryController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// All inventory routes require authentication
router.use(authenticate);

// Specific paths before dynamic parameter path
router.get('/', (req, res, next) => inventoryController.getInventory(req, res, next));
router.get('/alerts', (req, res, next) => inventoryController.getAlerts(req, res, next));
router.get('/:productId', (req, res, next) =>
  inventoryController.getProductInventoryDetail(req, res, next)
);

// Manual stock adjustment: restricted to admin and manager
router.post(
  '/adjust',
  authorize('admin', 'manager'),
  (req, res, next) => inventoryController.adjustStock(req, res, next)
);

export default router;
