import api from './api';
import { APIResponse, ProductInventoryMetrics, InventoryEventType } from '../types';

export interface StockAdjustmentInput {
  productId: string;
  quantity: number;
  type: InventoryEventType;
  reason?: string;
}

export const inventoryService = {
  async getInventoryMetrics(params?: {
    status?: string;
    riskLevel?: string;
    category?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<ProductInventoryMetrics[]> {
    const res = await api.get<any>('/inventory', { params });
    const raw = res.data.data;
    if (Array.isArray(raw)) return raw;
    if (Array.isArray(raw?.items)) return raw.items;
    if (Array.isArray(raw?.metrics)) return raw.metrics;
    return [];
  },

  async getProductMetrics(productId: string): Promise<ProductInventoryMetrics> {
    const res = await api.get<APIResponse<ProductInventoryMetrics>>(`/inventory/${productId}`);
    if (!res.data.data) throw new Error('Inventory metrics not found');
    return res.data.data;
  },

  async adjustStock(data: StockAdjustmentInput): Promise<{ message: string; currentStock: number }> {
    const res = await api.post<APIResponse<{ message: string; currentStock: number }>>('/inventory/adjust', data);
    if (!res.data.data) throw new Error('Stock adjustment failed');
    return res.data.data;
  },
};

export default inventoryService;
