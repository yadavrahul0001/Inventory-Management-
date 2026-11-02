import api from './api';
import { APIResponse, Purchase, PaginationInfo, PurchaseStatus } from '../types';

export interface CreatePurchaseInput {
  product: string;
  supplier: string;
  quantity: number;
  unitCost: number;
  date?: string;
}

export const purchaseService = {
  async getPurchases(params?: {
    page?: number;
    limit?: number;
    status?: PurchaseStatus;
    supplierId?: string;
    productId?: string;
  }): Promise<{ purchases: Purchase[]; pagination?: PaginationInfo }> {
    const res = await api.get<any>('/purchases', { params });
    const raw = res.data.data;
    const purchasesList: Purchase[] = Array.isArray(raw)
      ? raw
      : Array.isArray(raw?.purchases)
      ? raw.purchases
      : [];
    return {
      purchases: purchasesList,
      pagination: res.data.pagination,
    };
  },

  async createPurchase(data: CreatePurchaseInput): Promise<Purchase> {
    const res = await api.post<APIResponse<Purchase>>('/purchases', data);
    if (!res.data.data) throw new Error('Failed to create purchase order');
    return res.data.data;
  },

  async getPurchaseById(id: string): Promise<Purchase> {
    const res = await api.get<APIResponse<Purchase>>(`/purchases/${id}`);
    if (!res.data.data) throw new Error('Purchase not found');
    return res.data.data;
  },

  async receivePurchase(id: string): Promise<Purchase> {
    const res = await api.patch<APIResponse<Purchase>>(`/purchases/${id}/receive`);
    if (!res.data.data) throw new Error('Failed to receive purchase');
    return res.data.data;
  },

  async cancelPurchase(id: string): Promise<Purchase> {
    const res = await api.patch<APIResponse<Purchase>>(`/purchases/${id}/cancel`);
    if (!res.data.data) throw new Error('Failed to cancel purchase');
    return res.data.data;
  },
};

export default purchaseService;
