import { Request, Response, NextFunction } from 'express';
import { mlClientService } from '../services/mlClientService';
import { APIResponse } from '../types';
import { AppError } from '../middleware/errorHandler';

export class MLController {
  /**
   * GET /api/ml/health — Check if ML service is reachable.
   */
  async getHealth(
    _req: Request,
    res: Response<APIResponse>,
    next: NextFunction
  ): Promise<void> {
    try {
      const available = await mlClientService.isAvailable();
      if (!available) {
        res.status(503).json({
          success: false,
          error: 'ML service is not available',
        });
        return;
      }
      const health = await mlClientService.getHealth();
      res.status(200).json({ success: true, data: health });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/ml/status — Get model status and metadata.
   */
  async getModelStatus(
    _req: Request,
    res: Response<APIResponse>,
    next: NextFunction
  ): Promise<void> {
    try {
      const status = await mlClientService.getModelStatus();
      res.status(200).json({ success: true, data: status });
    } catch (error: any) {
      if (error?.code === 'ECONNREFUSED' || error?.code === 'ENOTFOUND') {
        throw new AppError('ML service is not running. Start it with: python -m uvicorn main:app', 503);
      }
      next(error);
    }
  }

  /**
   * POST /api/ml/train — Trigger model training.
   */
  async trainModel(
    _req: Request,
    res: Response<APIResponse>,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await mlClientService.triggerTraining();
      res.status(200).json({
        success: true,
        data: result,
        message: result.message,
      });
    } catch (error: any) {
      if (error?.code === 'ECONNREFUSED' || error?.code === 'ENOTFOUND') {
        throw new AppError('ML service is not running', 503);
      }
      next(error);
    }
  }

  /**
   * GET /api/ml/forecast/:productId — Get demand forecast for a product.
   * Query params: ?days=7 (default 7, max 90)
   */
  async getForecast(
    req: Request,
    res: Response<APIResponse>,
    next: NextFunction
  ): Promise<void> {
    try {
      const { productId } = req.params;
      const days = Math.min(Math.max(parseInt(req.query.days as string) || 7, 1), 90);

      if (!productId) {
        throw new AppError('Product ID is required', 400);
      }

      const forecast = await mlClientService.getForecast(productId, days);

      res.status(200).json({
        success: true,
        data: {
          ...forecast,
          forecast_type: forecast.is_fallback ? 'fallback' : 'ml_prediction',
        },
      });
    } catch (error: any) {
      if (error?.code === 'ECONNREFUSED' || error?.code === 'ENOTFOUND') {
        throw new AppError('ML service is not running', 503);
      }
      if (error?.response?.status === 404) {
        throw new AppError('No data found for this product', 404);
      }
      next(error);
    }
  }
}

export const mlController = new MLController();
