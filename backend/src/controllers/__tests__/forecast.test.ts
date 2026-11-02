import { forecastController } from '../forecastController';
import { forecastService } from '../../services/forecastService';
import { Request, Response, NextFunction } from 'express';

jest.mock('../../services/forecastService');

const mockForecastService = forecastService as jest.Mocked<typeof forecastService>;

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

describe('Forecast Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getProductForecast', () => {
    it('should return product forecast with stock risk and reorder recommendation', async () => {
      const mockResult = {
        productId: 'prod123',
        productName: 'Ergonomic Mouse',
        sku: 'MOUSE001',
        category: 'Electronics',
        currentStock: 45,
        leadTimeDays: 7,
        forecastDays: 7,
        predictions: [10, 11, 9, 12, 10, 8, 11],
        totalPredictedDemand: 71,
        predictedDailyDemand: 10.14,
        expectedLeadTimeDemand: 71,
        safetyStock: 15,
        reorderPoint: 86,
        recommendedOrderQuantity: 41,
        pendingIncomingQuantity: 0,
        daysUntilStockOut: 4.4,
        stockRisk: {
          riskLevel: 'HIGH' as const,
          estimatedDaysUntilStockOut: 4.4,
          currentStock: 45,
          predictedDailyDemand: 10.14,
          leadTimeDays: 7,
          recommendedAction: 'High risk: Stock will run out within lead time (7 days). Reorder immediately.',
        },
        status: 'Reorder Recommended' as const,
        isFallback: false,
        modelVersion: 'xgb-v1',
      };

      mockForecastService.getProductForecast.mockResolvedValue(mockResult);

      const req = {
        params: { productId: 'MOUSE001' },
        query: { days: '7' },
      } as unknown as Request;
      const res = createMockRes();
      const next = createMockNext();

      await forecastController.getProductForecast(req, res, next);

      expect(mockForecastService.getProductForecast).toHaveBeenCalledWith('MOUSE001', 7);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult,
      });
    });

    it('should call next on error', async () => {
      const error = new Error('Product not found');
      mockForecastService.getProductForecast.mockRejectedValue(error);

      const req = {
        params: { productId: 'INVALID' },
        query: {},
      } as unknown as Request;
      const res = createMockRes();
      const next = createMockNext();

      await forecastController.getProductForecast(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('getAllForecasts', () => {
    it('should return all product forecasts', async () => {
      const mockList = [
        {
          productId: 'p1',
          productName: 'Mouse',
          sku: 'MOUSE001',
          category: 'Electronics',
          currentStock: 50,
          leadTimeDays: 5,
          forecastDays: 7,
          predictions: [10, 10, 10, 10, 10, 10, 10],
          totalPredictedDemand: 70,
          predictedDailyDemand: 10,
          expectedLeadTimeDemand: 50,
          safetyStock: 10,
          reorderPoint: 60,
          recommendedOrderQuantity: 10,
          pendingIncomingQuantity: 0,
          daysUntilStockOut: 5,
          stockRisk: {
            riskLevel: 'HIGH' as const,
            estimatedDaysUntilStockOut: 5,
            currentStock: 50,
            predictedDailyDemand: 10,
            leadTimeDays: 5,
            recommendedAction: 'Reorder now',
          },
          status: 'Reorder Recommended' as const,
          isFallback: false,
          modelVersion: 'xgb-v1',
        },
      ];

      mockForecastService.getAllForecasts.mockResolvedValue(mockList);

      const req = {
        query: { days: '7' },
      } as unknown as Request;
      const res = createMockRes();
      const next = createMockNext();

      await forecastController.getAllForecasts(req, res, next);

      expect(mockForecastService.getAllForecasts).toHaveBeenCalledWith(7);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockList,
      });
    });
  });
});
