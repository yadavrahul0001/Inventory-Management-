import { Request, Response, NextFunction } from 'express';
import { purchaseService } from '../services/purchaseService';
import {
  createPurchaseSchema,
  purchaseQuerySchema,
  updatePurchaseSchema,
} from '../validators/purchaseValidators';
import { AuthenticatedRequest, APIResponse } from '../types';
import { AppError } from '../middleware/errorHandler';

export class PurchaseController {
  async createPurchase(
    req: AuthenticatedRequest,
    res: Response<APIResponse>,
    next: NextFunction
  ): Promise<void> {
    try {
      const parsedBody = createPurchaseSchema.safeParse(req.body);
      if (!parsedBody.success) {
        const errorMessages = parsedBody.error.errors.map((e) => e.message).join(', ');
        throw new AppError(`Validation error: ${errorMessages}`, 400);
      }

      if (!req.user?.id) {
        throw new AppError('Authentication required.', 401);
      }

      const purchase = await purchaseService.createPurchase(req.user.id, parsedBody.data);
      res.status(201).json({
        success: true,
        message: 'Purchase order created successfully with status pending.',
        data: purchase,
      });
    } catch (error) {
      next(error);
    }
  }

  async updatePurchase(
    req: AuthenticatedRequest,
    res: Response<APIResponse>,
    next: NextFunction
  ): Promise<void> {
    try {
      const parsedBody = updatePurchaseSchema.safeParse(req.body);
      if (!parsedBody.success) {
        const errorMessages = parsedBody.error.errors.map((e) => e.message).join(', ');
        throw new AppError(`Validation error: ${errorMessages}`, 400);
      }

      if (!req.user?.id) {
        throw new AppError('Authentication required.', 401);
      }

      const result = await purchaseService.updatePurchase(
        req.params.id,
        req.user.id,
        parsedBody.data
      );

      res.status(200).json({
        success: true,
        message:
          parsedBody.data.status === 'received'
            ? 'Purchase order received. Stock increased and inventory event logged.'
            : 'Purchase order updated successfully.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getPurchases(
    req: Request,
    res: Response<APIResponse>,
    next: NextFunction
  ): Promise<void> {
    try {
      const parsedQuery = purchaseQuerySchema.safeParse(req.query);
      if (!parsedQuery.success) {
        const errorMessages = parsedQuery.error.errors.map((e) => e.message).join(', ');
        throw new AppError(`Invalid query parameters: ${errorMessages}`, 400);
      }

      const result = await purchaseService.getPurchases(parsedQuery.data);
      res.status(200).json({
        success: true,
        data: {
          purchases: result.purchases,
          summary: result.summary,
        },
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  async getPurchaseById(
    req: Request,
    res: Response<APIResponse>,
    next: NextFunction
  ): Promise<void> {
    try {
      const purchase = await purchaseService.getPurchaseById(req.params.id);
      res.status(200).json({
        success: true,
        data: purchase,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const purchaseController = new PurchaseController();
