import { Request, Response, NextFunction } from 'express';
import { insightsService } from '../services/insightsService';
import { APIResponse } from '../types';

export class InsightsController {
  /**
   * GET /api/insights
   */
  async getInsights(
    _req: Request,
    res: Response<APIResponse>,
    next: NextFunction
  ): Promise<void> {
    try {
      const insights = await insightsService.generateInsights();
      res.status(200).json({
        success: true,
        data: insights,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/insights/summary
   */
  async getInsightsSummary(
    _req: Request,
    res: Response<APIResponse>,
    next: NextFunction
  ): Promise<void> {
    try {
      const summary = await insightsService.getInsightsSummary();
      res.status(200).json({
        success: true,
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const insightsController = new InsightsController();
