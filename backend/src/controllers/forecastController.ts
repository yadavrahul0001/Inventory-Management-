import { Request, Response, NextFunction } from 'express';
import { forecastService } from '../services/forecastService';
import { APIResponse } from '../types';
import { AppError } from '../middleware/errorHandler';

export class ForecastController {
  /**
   * GET /api/forecast/:productId?days=7
   */
  async getProductForecast(
    req: Request,
    res: Response<APIResponse>,
    next: NextFunction
  ): Promise<void> {
    try {
      const { productId } = req.params;
      const days = parseInt(req.query.days as string, 10) || 7;

      if (!productId) {
        throw new AppError('Product ID or SKU is required', 400);
      }

      const forecast = await forecastService.getProductForecast(productId, days);
      res.status(200).json({
        success: true,
        data: forecast,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/forecast?days=7
   */
  async getAllForecasts(
    req: Request,
    res: Response<APIResponse>,
    next: NextFunction
  ): Promise<void> {
    try {
      const days = parseInt(req.query.days as string, 10) || 7;
      const forecasts = await forecastService.getAllForecasts(days);
      res.status(200).json({
        success: true,
        data: forecasts,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const forecastController = new ForecastController();
