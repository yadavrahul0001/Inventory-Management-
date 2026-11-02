import { Router } from 'express';
import { salesController } from '../controllers/salesController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All sales routes require authentication
router.use(authenticate);

// List sales and query history
router.get('/', (req, res, next) => salesController.getSales(req, res, next));

// Get single sale by ID
router.get('/:id', (req, res, next) => salesController.getSaleById(req, res, next));

// Record a sale (accessible to staff, manager, and admin)
router.post('/', (req, res, next) => salesController.createSale(req, res, next));

export default router;
