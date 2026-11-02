import { Router } from 'express';
import { purchaseController } from '../controllers/purchaseController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// All purchase routes require authentication
router.use(authenticate);

// List and view purchase orders
router.get('/', (req, res, next) => purchaseController.getPurchases(req, res, next));
router.get('/:id', (req, res, next) => purchaseController.getPurchaseById(req, res, next));

// Create purchase order (manager and admin only)
router.post(
  '/',
  authorize('admin', 'manager'),
  (req, res, next) => purchaseController.createPurchase(req, res, next)
);

// Update/Receive purchase order (manager and admin only)
router.put(
  '/:id',
  authorize('admin', 'manager'),
  (req, res, next) => purchaseController.updatePurchase(req, res, next)
);

export default router;
