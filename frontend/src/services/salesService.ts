import api from './api';
import { APIResponse, Sale, PaginationInfo } from '../types';

export interface CreateSaleInput {
  product: string;
  quantity: number;
  unitPrice: number;
  customer: string;
  date?: string;
}

export const salesService = {
  async getSales(params?: {
    page?: number;
    limit?: number;
    productId?: string;
    customer?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{ sales: Sale[]; pagination?: PaginationInfo }> {
    const res = await api.get<any>('/sales', { params });
    const raw = res.data.data;
    const salesList: Sale[] = Array.isArray(raw)
      ? raw
      : Array.isArray(raw?.sales)
      ? raw.sales
      : [];
    return {
      sales: salesList,
      pagination: res.data.pagination,
    };
  },

  async createSale(data: CreateSaleInput): Promise<Sale> {
    const res = await api.post<APIResponse<Sale>>('/sales', data);
    if (!res.data.data) throw new Error('Failed to record sale');
    return res.data.data;
  },

  async getSaleById(id: string): Promise<Sale> {
    const res = await api.get<APIResponse<Sale>>(`/sales/${id}`);
    if (!res.data.data) throw new Error('Sale not found');
    return res.data.data;
  },
};

export default salesService;
