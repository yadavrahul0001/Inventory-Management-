import { insightsController } from '../insightsController';
import { insightsService } from '../../services/insightsService';
import { Request, Response, NextFunction } from 'express';
import { AIInsight } from '../../types';

jest.mock('../../services/insightsService');

const mockInsightsService = insightsService as jest.Mocked<typeof insightsService>;

function createMockRes(): Response {
  const res: Partial<Response> = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res as Response;
}

function createMockNext(): NextFunction {
  return jest.fn();
}

describe('Insights Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getInsights', () => {
    it('should return generated insights ordered by severity', async () => {
      const mockInsights: AIInsight[] = [
        {
          id: 'insight-1',
          type: 'STOCKOUT_IMMINENT',
          severity: 'critical',
          productId: 'prod1',
          productName: 'Gaming Mouse',
          sku: 'MOUSE001',
          message: 'Gaming Mouse inventory will deplete in ~2 days, less than lead time (5 days).',
          metrics: {
            currentStock: 10,
            predictedDailyDemand: 5,
            leadTimeDays: 5,
            daysUntilStockOut: 2,
            reorderPoint: 35,
            recommendedOrderQuantity: 25,
          },
          recommendedAction: 'Expedite purchase order.',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'insight-2',
          type: 'DEMAND_SURGE',
          severity: 'warning',
          productId: 'prod2',
          productName: 'Mechanical Keyboard',
          sku: 'KEYB001',
          message: 'Mechanical Keyboard demand is projected to surge by +40%.',
          metrics: {
            currentStock: 80,
            predictedDailyDemand: 14,
            leadTimeDays: 7,
            daysUntilStockOut: 5.7,
            reorderPoint: 110,
            recommendedOrderQuantity: 30,
            demandChangePercent: 40,
          },
          recommendedAction: 'Increase safety stock allocation.',
          createdAt: new Date().toISOString(),
        },
      ];

      mockInsightsService.generateInsights.mockResolvedValue(mockInsights);

      const req = {} as Request;
      const res = createMockRes();
      const next = createMockNext();

      await insightsController.getInsights(req, res, next);

      expect(mockInsightsService.generateInsights).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockInsights,
      });
    });

    it('should call next on error', async () => {
      const error = new Error('Database failure');
      mockInsightsService.generateInsights.mockRejectedValue(error);

      const req = {} as Request;
      const res = createMockRes();
      const next = createMockNext();

      await insightsController.getInsights(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('getInsightsSummary', () => {
    it('should return counts grouped by severity', async () => {
      const mockSummary = {
        total: 5,
        critical: 1,
        warning: 2,
        info: 1,
        success: 1,
      };

      mockInsightsService.getInsightsSummary.mockResolvedValue(mockSummary);

      const req = {} as Request;
      const res = createMockRes();
      const next = createMockNext();

      await insightsController.getInsightsSummary(req, res, next);

      expect(mockInsightsService.getInsightsSummary).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockSummary,
      });
    });
  });
});
