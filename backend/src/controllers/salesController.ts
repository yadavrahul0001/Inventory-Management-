import { Request, Response, NextFunction } from 'express';
import { salesService } from '../services/salesService';
import { createSaleSchema, salesQuerySchema } from '../validators/salesValidators';
import { AuthenticatedRequest, APIResponse } from '../types';
import { AppError } from '../middleware/errorHandler';

export class SalesController {
  async createSale(
    req: AuthenticatedRequest,
    res: Response<APIResponse>,
    next: NextFunction
  ): Promise<void> {
    try {
      const parsedBody = createSaleSchema.safeParse(req.body);
      if (!parsedBody.success) {
        const errorMessages = parsedBody.error.errors.map((e) => e.message).join(', ');
        throw new AppError(`Validation error: ${errorMessages}`, 400);
      }

      if (!req.user?.id) {
        throw new AppError('Authentication required.', 401);
      }

      const result = await salesService.createSale(req.user.id, parsedBody.data);
      res.status(201).json({
        success: true,
        message: 'Sale recorded successfully. Stock and inventory status updated.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getSales(
    req: Request,
    res: Response<APIResponse>,
    next: NextFunction
  ): Promise<void> {
    try {
      const parsedQuery = salesQuerySchema.safeParse(req.query);
      if (!parsedQuery.success) {
        const errorMessages = parsedQuery.error.errors.map((e) => e.message).join(', ');
        throw new AppError(`Invalid query parameters: ${errorMessages}`, 400);
      }

      const result = await salesService.getSales(parsedQuery.data);
      res.status(200).json({
        success: true,
        data: {
          sales: result.sales,
          summary: result.summary,
        },
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  async getSaleById(
    req: Request,
    res: Response<APIResponse>,
    next: NextFunction
  ): Promise<void> {
    try {
      const sale = await salesService.getSaleById(req.params.id);
      res.status(200).json({
        success: true,
        data: sale,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const salesController = new SalesController();
