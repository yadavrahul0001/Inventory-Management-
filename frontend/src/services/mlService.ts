import api from './api';
import {
  APIResponse,
  MLHealthStatus,
  MLModelStatus,
  MLTrainResult,
  MLForecastResult,
} from '../types';

export const mlService = {
  /**
   * Check ML service connectivity
   */
  async getHealth(): Promise<MLHealthStatus> {
    const res = await api.get<APIResponse<MLHealthStatus>>('/ml/health');
    if (!res.data.data) throw new Error(res.data.error || 'Failed to fetch ML health');
    return res.data.data;
  },

  /**
   * Get ML model status and evaluation metrics
   */
  async getModelStatus(): Promise<MLModelStatus> {
    const res = await api.get<APIResponse<MLModelStatus>>('/ml/status');
    if (!res.data.data) throw new Error(res.data.error || 'Failed to fetch ML status');
    return res.data.data;
  },

  /**
   * Trigger model retraining (admin only)
   */
  async trainModel(): Promise<MLTrainResult> {
    const res = await api.post<APIResponse<MLTrainResult>>('/ml/train');
    if (!res.data.data) throw new Error(res.data.error || 'Training failed');
    return res.data.data;
  },

  /**
   * Get demand forecast for a product (7 to 90 days)
   */
  async getForecast(productId: string, days: number = 7): Promise<MLForecastResult> {
    const res = await api.get<APIResponse<MLForecastResult>>(`/ml/forecast/${productId}?days=${days}`);
    if (!res.data.data) throw new Error(res.data.error || 'Failed to fetch forecast');
    return res.data.data;
  },
};

export default mlService;
