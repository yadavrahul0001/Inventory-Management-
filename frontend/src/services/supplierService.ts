import api from './api';
import { APIResponse, Supplier, PaginationInfo } from '../types';

export interface CreateSupplierInput {
  name: string;
  email: string;
  phone: string;
  address?: string;
  leadTimeDays: number;
  status?: 'active' | 'inactive';
}

export const supplierService = {
  async getSuppliers(params?: { page?: number; limit?: number; search?: string; status?: string }): Promise<{ suppliers: Supplier[]; pagination?: PaginationInfo }> {
    const res = await api.get<any>('/suppliers', { params });
    const raw = res.data.data;
    const suppliersList: Supplier[] = Array.isArray(raw)
      ? raw
      : Array.isArray(raw?.suppliers)
      ? raw.suppliers
      : [];
    return {
      suppliers: suppliersList,
      pagination: res.data.pagination,
    };
  },

  async getSupplierById(id: string): Promise<Supplier> {
    const res = await api.get<APIResponse<Supplier>>(`/suppliers/${id}`);
    if (!res.data.data) throw new Error('Supplier not found');
    return res.data.data;
  },

  async createSupplier(data: CreateSupplierInput): Promise<Supplier> {
    const res = await api.post<APIResponse<Supplier>>('/suppliers', data);
    if (!res.data.data) throw new Error('Failed to create supplier');
    return res.data.data;
  },

  async updateSupplier(id: string, data: Partial<CreateSupplierInput>): Promise<Supplier> {
    const res = await api.put<APIResponse<Supplier>>(`/suppliers/${id}`, data);
    if (!res.data.data) throw new Error('Failed to update supplier');
    return res.data.data;
  },

  async deleteSupplier(id: string): Promise<void> {
    await api.delete(`/suppliers/${id}`);
  },
};

export default supplierService;
