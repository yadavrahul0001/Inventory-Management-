import api from './api';
import { APIResponse, SalesAnomaly } from '../types';

export const anomalyService = {
  /**
   * Fetch detected sales anomalies (Z-score spikes/drops and price anomalies)
   */
  async getAnomalies(params?: { productId?: string; threshold?: number; days?: number }): Promise<SalesAnomaly[]> {
    const res = await api.get<APIResponse<SalesAnomaly[]>>('/anomalies', { params });
    return res.data.data || [];
  },
};

export default anomalyService;
