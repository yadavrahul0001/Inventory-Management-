import { mlController } from '../mlController';
import { mlClientService } from '../../services/mlClientService';
import { Request, Response, NextFunction } from 'express';

// Mock the mlClientService
jest.mock('../../services/mlClientService');

const mockMlClientService = mlClientService as jest.Mocked<typeof mlClientService>;

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

describe('ML Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getHealth', () => {
    it('should return 200 with health data when ML service is available', async () => {
      const healthData = {
        status: 'healthy',
        service: 'inventory-ai-ml-service',
        model_loaded: true,
        model_version: 'xgb-v1-20260923',
      };

      mockMlClientService.isAvailable.mockResolvedValue(true);
      mockMlClientService.getHealth.mockResolvedValue(healthData);

      const req = {} as Request;
      const res = createMockRes();
      const next = createMockNext();

      await mlController.getHealth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: healthData,
      });
    });

    it('should return 503 when ML service is not available', async () => {
      mockMlClientService.isAvailable.mockResolvedValue(false);

      const req = {} as Request;
      const res = createMockRes();
      const next = createMockNext();

      await mlController.getHealth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'ML service is not available',
      });
    });
  });

  describe('getModelStatus', () => {
    it('should return model status when ML service responds', async () => {
      const statusData = {
        model_loaded: true,
        model_version: 'xgb-v1-20260923',
        feature_columns: ['lag_1', 'lag_7', 'rolling_7_mean'],
        metrics: { mae: 3.1, rmse: 3.9, mape: 59.4 },
        num_products: 5,
        product_ids: ['MOUSE001', 'KEYB001'],
      };

      mockMlClientService.getModelStatus.mockResolvedValue(statusData);

      const req = {} as Request;
      const res = createMockRes();
      const next = createMockNext();

      await mlController.getModelStatus(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: statusData,
      });
    });

    it('should call next on unexpected errors', async () => {
      const error = new Error('Something went wrong');
      mockMlClientService.getModelStatus.mockRejectedValue(error);

      const req = {} as Request;
      const res = createMockRes();
      const next = createMockNext();

      await mlController.getModelStatus(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('trainModel', () => {
    it('should return training results on success', async () => {
      const trainResult = {
        success: true,
        model_version: 'xgb-v1-20260923-120000',
        metrics: { mae: 3.1, rmse: 3.9, mape: 59.4 },
        message: 'Model trained successfully. MAE: 3.100, RMSE: 3.900, MAPE: 59.4%',
      };

      mockMlClientService.triggerTraining.mockResolvedValue(trainResult);

      const req = {} as Request;
      const res = createMockRes();
      const next = createMockNext();

      await mlController.trainModel(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: trainResult,
        message: trainResult.message,
      });
    });
  });

  describe('getForecast', () => {
    it('should return forecast data for a product', async () => {
      const forecastResult = {
        product_id: 'MOUSE001',
        forecast_days: 7,
        predictions: [10.5, 11.2, 9.8, 10.0, 12.1, 8.5, 11.0],
        total_predicted_demand: 73.1,
        model_version: 'xgb-v1-20260923',
        is_fallback: false,
      };

      mockMlClientService.getForecast.mockResolvedValue(forecastResult);

      const req = {
        params: { productId: 'MOUSE001' },
        query: { days: '7' },
      } as unknown as Request;
      const res = createMockRes();
      const next = createMockNext();

      await mlController.getForecast(req, res, next);

      expect(mockMlClientService.getForecast).toHaveBeenCalledWith('MOUSE001', 7);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          ...forecastResult,
          forecast_type: 'ml_prediction',
        },
      });
    });

    it('should label fallback forecasts correctly', async () => {
      const fallbackResult = {
        product_id: 'NEW_PRODUCT',
        forecast_days: 7,
        predictions: [5.0, 5.0, 5.0, 5.0, 5.0, 5.0, 5.0],
        total_predicted_demand: 35.0,
        model_version: 'fallback-moving-avg',
        is_fallback: true,
        fallback_reason: 'Insufficient data for ML model',
      };

      mockMlClientService.getForecast.mockResolvedValue(fallbackResult);

      const req = {
        params: { productId: 'NEW_PRODUCT' },
        query: {},
      } as unknown as Request;
      const res = createMockRes();
      const next = createMockNext();

      await mlController.getForecast(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            forecast_type: 'fallback',
            is_fallback: true,
          }),
        })
      );
    });

    it('should clamp forecast days between 1 and 90', async () => {
      const forecastResult = {
        product_id: 'MOUSE001',
        forecast_days: 90,
        predictions: Array(90).fill(10.0),
        total_predicted_demand: 900.0,
        model_version: 'xgb-v1',
        is_fallback: false,
      };

      mockMlClientService.getForecast.mockResolvedValue(forecastResult);

      const req = {
        params: { productId: 'MOUSE001' },
        query: { days: '200' }, // over max
      } as unknown as Request;
      const res = createMockRes();
      const next = createMockNext();

      await mlController.getForecast(req, res, next);

      // Should have clamped to 90
      expect(mockMlClientService.getForecast).toHaveBeenCalledWith('MOUSE001', 90);
    });

    it('should default to 7 days when no days param provided', async () => {
      const forecastResult = {
        product_id: 'MOUSE001',
        forecast_days: 7,
        predictions: Array(7).fill(10.0),
        total_predicted_demand: 70.0,
        model_version: 'xgb-v1',
        is_fallback: false,
      };

      mockMlClientService.getForecast.mockResolvedValue(forecastResult);

      const req = {
        params: { productId: 'MOUSE001' },
        query: {},
      } as unknown as Request;
      const res = createMockRes();
      const next = createMockNext();

      await mlController.getForecast(req, res, next);

      expect(mockMlClientService.getForecast).toHaveBeenCalledWith('MOUSE001', 7);
    });
  });
});
