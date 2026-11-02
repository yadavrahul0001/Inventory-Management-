import { Request, Response, NextFunction } from 'express';
import { dashboardService } from '../services/dashboardService';
import { dashboardChartsQuerySchema } from '../validators/dashboardValidators';
import { APIResponse } from '../types';
import { AppError } from '../middleware/errorHandler';

export class DashboardController {
  async getSummary(
    _req: Request,
    res: Response<APIResponse>,
    next: NextFunction
  ): Promise<void> {
    try {
      const summary = await dashboardService.getDashboardSummary();
      res.status(200).json({
        success: true,
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  }

  async getCharts(
    req: Request,
    res: Response<APIResponse>,
    next: NextFunction
  ): Promise<void> {
    try {
      const parsedQuery = dashboardChartsQuerySchema.safeParse(req.query);
      if (!parsedQuery.success) {
        const errorMessages = parsedQuery.error.errors.map((e) => e.message).join(', ');
        throw new AppError(`Invalid query parameters: ${errorMessages}`, 400);
      }

      const chartsData = await dashboardService.getDashboardCharts(parsedQuery.data);
      res.status(200).json({
        success: true,
        data: chartsData,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const dashboardController = new DashboardController();
