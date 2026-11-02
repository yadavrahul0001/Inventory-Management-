import api from './api';
import { APIResponse, DashboardSummary, DashboardChartsData } from '../types';

export const dashboardService = {
  async getSummary(): Promise<DashboardSummary> {
    const res = await api.get<APIResponse<DashboardSummary>>('/dashboard/summary');
    if (!res.data.data) throw new Error('Failed to fetch dashboard summary');
    return res.data.data;
  },

  async getCharts(days: number = 30): Promise<DashboardChartsData> {
    const res = await api.get<APIResponse<DashboardChartsData>>(`/dashboard/charts?days=${days}`);
    if (!res.data.data) throw new Error('Failed to fetch dashboard charts');
    return res.data.data;
  },
};

export default dashboardService;
