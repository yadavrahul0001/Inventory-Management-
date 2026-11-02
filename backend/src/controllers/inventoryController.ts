import { Request, Response, NextFunction } from 'express';
import { inventoryService } from '../services/inventoryService';
import {
  adjustStockSchema,
  inventoryQuerySchema,
} from '../validators/inventoryValidators';
import { AuthenticatedRequest, APIResponse } from '../types';
import { AppError } from '../middleware/errorHandler';

export class InventoryController {
  async getInventory(
    req: Request,
    res: Response<APIResponse>,
    next: NextFunction
  ): Promise<void> {
    try {
      const parsedQuery = inventoryQuerySchema.safeParse(req.query);
      if (!parsedQuery.success) {
        const errorMessages = parsedQuery.error.errors.map((e) => e.message).join(', ');
        throw new AppError(`Invalid query parameters: ${errorMessages}`, 400);
      }

      const result = await inventoryService.getInventoryList(parsedQuery.data);
      res.status(200).json({
        success: true,
        data: {
          items: result.items,
          summary: result.summary,
        },
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAlerts(
    _req: Request,
    res: Response<APIResponse>,
    next: NextFunction
  ): Promise<void> {
    try {
      const alerts = await inventoryService.getInventoryAlerts();
      res.status(200).json({
        success: true,
        data: alerts,
        message: `Found ${alerts.length} inventory alert(s) requiring attention.`,
      });
    } catch (error) {
      next(error);
    }
  }

  async getProductInventoryDetail(
    req: Request,
    res: Response<APIResponse>,
    next: NextFunction
  ): Promise<void> {
    try {
      const detail = await inventoryService.getProductInventoryDetail(req.params.productId);
      res.status(200).json({
        success: true,
        data: detail,
      });
    } catch (error) {
      next(error);
    }
  }

  async adjustStock(
    req: AuthenticatedRequest,
    res: Response<APIResponse>,
    next: NextFunction
  ): Promise<void> {
    try {
      const parsedBody = adjustStockSchema.safeParse(req.body);
      if (!parsedBody.success) {
        const errorMessages = parsedBody.error.errors.map((e) => e.message).join(', ');
        throw new AppError(`Validation error: ${errorMessages}`, 400);
      }

      if (!req.user?.id) {
        throw new AppError('Authentication required.', 401);
      }

      const result = await inventoryService.adjustStock(req.user.id, parsedBody.data);
      res.status(200).json({
        success: true,
        message: 'Stock adjusted successfully and inventory event logged.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const inventoryController = new InventoryController();
