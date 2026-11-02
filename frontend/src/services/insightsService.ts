import api from './api';
import { APIResponse, AIInsight } from '../types';

export const insightsService = {
  /**
   * Fetch all AI-generated inventory insights
   */
  async getInsights(): Promise<AIInsight[]> {
    const res = await api.get<APIResponse<AIInsight[]>>('/insights');
    return res.data.data || [];
  },

  /**
   * Fetch summary counts by severity
   */
  async getSummary(): Promise<{
    total: number;
    critical: number;
    warning: number;
    info: number;
    success: number;
  }> {
    const res = await api.get<APIResponse<{
      total: number;
      critical: number;
      warning: number;
      info: number;
      success: number;
    }>>('/insights/summary');
    return res.data.data || { total: 0, critical: 0, warning: 0, info: 0, success: 0 };
  },
};

export default insightsService;
