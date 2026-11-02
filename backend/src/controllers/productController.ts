import { Request, Response, NextFunction } from 'express';
import { productService } from '../services/productService';
import {
  createProductSchema,
  productQuerySchema,
  updateProductSchema,
} from '../validators/productValidators';
import { AuthenticatedRequest, APIResponse } from '../types';
import { AppError } from '../middleware/errorHandler';

export class ProductController {
  async getProducts(
    req: Request,
    res: Response<APIResponse>,
    next: NextFunction
  ): Promise<void> {
    try {
      const parsedQuery = productQuerySchema.safeParse(req.query);
      if (!parsedQuery.success) {
        const errorMessages = parsedQuery.error.errors.map((e) => e.message).join(', ');
        throw new AppError(`Invalid query parameters: ${errorMessages}`, 400);
      }

      const result = await productService.getProducts(parsedQuery.data);
      res.status(200).json({
        success: true,
        data: result.products,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  async getProductById(
    req: Request,
    res: Response<APIResponse>,
    next: NextFunction
  ): Promise<void> {
    try {
      const product = await productService.getProductById(req.params.id);
      res.status(200).json({
        success: true,
        data: product,
      });
    } catch (error) {
      next(error);
    }
  }

  async createProduct(
    req: AuthenticatedRequest,
    res: Response<APIResponse>,
    next: NextFunction
  ): Promise<void> {
    try {
      const parsedBody = createProductSchema.safeParse(req.body);
      if (!parsedBody.success) {
        const errorMessages = parsedBody.error.errors.map((e) => e.message).join(', ');
        throw new AppError(`Validation error: ${errorMessages}`, 400);
      }

      if (!req.user?.id) {
        throw new AppError('Authentication required.', 401);
      }

      const product = await productService.createProduct(req.user.id, parsedBody.data);
      res.status(201).json({
        success: true,
        message: 'Product created successfully',
        data: product,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateProduct(
    req: Request,
    res: Response<APIResponse>,
    next: NextFunction
  ): Promise<void> {
    try {
      const parsedBody = updateProductSchema.safeParse(req.body);
      if (!parsedBody.success) {
        const errorMessages = parsedBody.error.errors.map((e) => e.message).join(', ');
        throw new AppError(`Validation error: ${errorMessages}`, 400);
      }

      const product = await productService.updateProduct(req.params.id, parsedBody.data);
      res.status(200).json({
        success: true,
        message: 'Product updated successfully',
        data: product,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteProduct(
    req: Request,
    res: Response<APIResponse>,
    next: NextFunction
  ): Promise<void> {
    try {
      await productService.deleteProduct(req.params.id);
      res.status(200).json({
        success: true,
        message: 'Product deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const productController = new ProductController();
