import { Request, Response, NextFunction } from 'express';
import { supplierService } from '../services/supplierService';
import {
  createSupplierSchema,
  supplierQuerySchema,
  updateSupplierSchema,
} from '../validators/supplierValidators';
import { APIResponse } from '../types';
import { AppError } from '../middleware/errorHandler';

export class SupplierController {
  async getSuppliers(
    req: Request,
    res: Response<APIResponse>,
    next: NextFunction
  ): Promise<void> {
    try {
      const parsedQuery = supplierQuerySchema.safeParse(req.query);
      if (!parsedQuery.success) {
        const errorMessages = parsedQuery.error.errors.map((e) => e.message).join(', ');
        throw new AppError(`Invalid query parameters: ${errorMessages}`, 400);
      }

      const result = await supplierService.getSuppliers(parsedQuery.data);
      res.status(200).json({
        success: true,
        data: result.suppliers,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  async getSupplierById(
    req: Request,
    res: Response<APIResponse>,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await supplierService.getSupplierById(req.params.id);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async createSupplier(
    req: Request,
    res: Response<APIResponse>,
    next: NextFunction
  ): Promise<void> {
    try {
      const parsedBody = createSupplierSchema.safeParse(req.body);
      if (!parsedBody.success) {
        const errorMessages = parsedBody.error.errors.map((e) => e.message).join(', ');
        throw new AppError(`Validation error: ${errorMessages}`, 400);
      }

      const supplier = await supplierService.createSupplier(parsedBody.data);
      res.status(201).json({
        success: true,
        message: 'Supplier created successfully',
        data: supplier,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateSupplier(
    req: Request,
    res: Response<APIResponse>,
    next: NextFunction
  ): Promise<void> {
    try {
      const parsedBody = updateSupplierSchema.safeParse(req.body);
      if (!parsedBody.success) {
        const errorMessages = parsedBody.error.errors.map((e) => e.message).join(', ');
        throw new AppError(`Validation error: ${errorMessages}`, 400);
      }

      const supplier = await supplierService.updateSupplier(req.params.id, parsedBody.data);
      res.status(200).json({
        success: true,
        message: 'Supplier updated successfully',
        data: supplier,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteSupplier(
    req: Request,
    res: Response<APIResponse>,
    next: NextFunction
  ): Promise<void> {
    try {
      await supplierService.deleteSupplier(req.params.id);
      res.status(200).json({
        success: true,
        message: 'Supplier deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const supplierController = new SupplierController();
