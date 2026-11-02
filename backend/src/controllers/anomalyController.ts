import { Request, Response, NextFunction } from 'express';
import { anomalyService } from '../services/anomalyService';
import { APIResponse } from '../types';

export class AnomalyController {
  /**
   * GET /api/anomalies?productId=...&threshold=2.0&days=60
   */
  async getAnomalies(
    req: Request,
    res: Response<APIResponse>,
    next: NextFunction
  ): Promise<void> {
    try {
      const productId = req.query.productId as string | undefined;
      const threshold = req.query.threshold ? parseFloat(req.query.threshold as string) : undefined;
      const windowDays = req.query.days ? parseInt(req.query.days as string, 10) : undefined;

      const anomalies = await anomalyService.detectAnomalies({
        productId,
        threshold,
        windowDays,
      });

      res.status(200).json({
        success: true,
        data: anomalies,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const anomalyController = new AnomalyController();
