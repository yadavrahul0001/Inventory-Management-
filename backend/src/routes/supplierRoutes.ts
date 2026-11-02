import { Router } from 'express';
import { supplierController } from '../controllers/supplierController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// All supplier routes require authentication
router.use(authenticate);

// Read endpoints: accessible to admin, manager, staff
router.get('/', (req, res, next) => supplierController.getSuppliers(req, res, next));
router.get('/:id', (req, res, next) => supplierController.getSupplierById(req, res, next));

// Write endpoints: accessible to admin and manager
router.post(
  '/',
  authorize('admin', 'manager'),
  (req, res, next) => supplierController.createSupplier(req, res, next)
);

router.put(
  '/:id',
  authorize('admin', 'manager'),
  (req, res, next) => supplierController.updateSupplier(req, res, next)
);

// Delete endpoint: restricted to admin
router.delete(
  '/:id',
  authorize('admin'),
  (req, res, next) => supplierController.deleteSupplier(req, res, next)
);

export default router;
