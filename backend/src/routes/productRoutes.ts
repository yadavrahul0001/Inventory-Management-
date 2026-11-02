import { Router } from 'express';
import { productController } from '../controllers/productController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// All product routes require authentication
router.use(authenticate);

// Read endpoints: accessible to admin, manager, staff
router.get('/', (req, res, next) => productController.getProducts(req, res, next));
router.get('/:id', (req, res, next) => productController.getProductById(req, res, next));

// Write endpoints: accessible to admin and manager
router.post(
  '/',
  authorize('admin', 'manager'),
  (req, res, next) => productController.createProduct(req, res, next)
);

router.put(
  '/:id',
  authorize('admin', 'manager'),
  (req, res, next) => productController.updateProduct(req, res, next)
);

// Delete endpoint: restricted to admin
router.delete(
  '/:id',
  authorize('admin'),
  (req, res, next) => productController.deleteProduct(req, res, next)
);

export default router;
