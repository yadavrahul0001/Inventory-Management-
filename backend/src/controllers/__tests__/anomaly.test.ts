import { anomalyController } from '../anomalyController';
import { anomalyService } from '../../services/anomalyService';
import { Request, Response, NextFunction } from 'express';
import { SalesAnomaly } from '../../types';

jest.mock('../../services/anomalyService');

const mockAnomalyService = anomalyService as jest.Mocked<typeof anomalyService>;

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

describe('Anomaly Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAnomalies', () => {
    it('should return detected sales anomalies with z-scores', async () => {
      const mockAnomalies: SalesAnomaly[] = [
        {
          id: 'anomaly-spike-1',
          date: '2025-06-15',
          productId: 'prod1',
          productName: 'Wireless Mouse',
          sku: 'MOUSE001',
          quantity: 45,
          expectedMean: 10,
          standardDeviation: 3.5,
          zScore: 10.0,
          anomalyType: 'SPIKE',
          severity: 'high',
          unitPrice: 25.99,
          totalAmount: 1169.55,
        },
        {
          id: 'anomaly-drop-2',
          date: '2025-06-10',
          productId: 'prod2',
          productName: 'Keyboard',
          sku: 'KEYB001',
          quantity: 0,
          expectedMean: 12,
          standardDeviation: 2.8,
          zScore: -4.29,
          anomalyType: 'DROP',
          severity: 'high',
          unitPrice: 45.5,
          totalAmount: 0,
        },
      ];

      mockAnomalyService.detectAnomalies.mockResolvedValue(mockAnomalies);

      const req = {
        query: { threshold: '2.5', days: '30' },
      } as unknown as Request;
      const res = createMockRes();
      const next = createMockNext();

      await anomalyController.getAnomalies(req, res, next);

      expect(mockAnomalyService.detectAnomalies).toHaveBeenCalledWith({
        productId: undefined,
        threshold: 2.5,
        windowDays: 30,
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockAnomalies,
      });
    });

    it('should filter by productId when provided', async () => {
      mockAnomalyService.detectAnomalies.mockResolvedValue([]);

      const req = {
        query: { productId: 'MOUSE001' },
      } as unknown as Request;
      const res = createMockRes();
      const next = createMockNext();

      await anomalyController.getAnomalies(req, res, next);

      expect(mockAnomalyService.detectAnomalies).toHaveBeenCalledWith({
        productId: 'MOUSE001',
        threshold: undefined,
        windowDays: undefined,
      });
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should call next on error', async () => {
      const error = new Error('Database error');
      mockAnomalyService.detectAnomalies.mockRejectedValue(error);

      const req = { query: {} } as unknown as Request;
      const res = createMockRes();
      const next = createMockNext();

      await anomalyController.getAnomalies(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
