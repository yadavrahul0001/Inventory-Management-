import api from './api';
import { APIResponse, Product, PaginationInfo, ProductUnit, ProductStatus } from '../types';

export interface CreateProductInput {
  name: string;
  sku: string;
  category: string;
  supplier: string;
  description?: string;
  costPrice: number;
  sellingPrice: number;
  currentStock: number;
  minimumStock: number;
  reorderLevel: number;
  leadTimeDays: number;
  unit?: ProductUnit;
  status?: ProductStatus;
}

export const productService = {
  async getProducts(params?: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    status?: string;
  }): Promise<{ products: Product[]; pagination?: PaginationInfo }> {
    const res = await api.get<any>('/products', { params });
    const raw = res.data.data;
    const productsList: Product[] = Array.isArray(raw)
      ? raw
      : Array.isArray(raw?.products)
      ? raw.products
      : [];
    return {
      products: productsList,
      pagination: res.data.pagination,
    };
  },

  async getProductById(id: string): Promise<Product> {
    const res = await api.get<APIResponse<Product>>(`/products/${id}`);
    if (!res.data.data) throw new Error('Product not found');
    return res.data.data;
  },

  async createProduct(data: CreateProductInput): Promise<Product> {
    const res = await api.post<APIResponse<Product>>('/products', data);
    if (!res.data.data) throw new Error('Failed to create product');
    return res.data.data;
  },

  async updateProduct(id: string, data: Partial<CreateProductInput>): Promise<Product> {
    const res = await api.put<APIResponse<Product>>(`/products/${id}`, data);
    if (!res.data.data) throw new Error('Failed to update product');
    return res.data.data;
  },

  async deleteProduct(id: string): Promise<void> {
    await api.delete(`/products/${id}`);
  },
};

export default productService;
