import { z } from 'zod';

export const adjustStockSchema = z.object({
  productId: z
    .string({ required_error: 'Product ID is required' })
    .regex(/^[0-9a-fA-F]{24}$/, 'Product must be a valid 24-character hexadecimal ID'),
  newStock: z
    .number({ required_error: 'New stock quantity is required' })
    .int('Stock must be an integer')
    .min(0, 'Stock cannot be negative'),
  reason: z
    .string({ required_error: 'Adjustment reason is required' })
    .trim()
    .min(3, 'Reason must be at least 3 characters')
    .max(500, 'Reason cannot exceed 500 characters'),
});

export const inventoryQuerySchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  status: z
    .enum(['Healthy', 'Low Stock', 'Reorder Recommended', 'Critical', 'Stock-out Risk'])
    .optional(),
  riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  sort: z.string().optional().default('currentStock'),
  order: z.enum(['asc', 'desc']).optional().default('asc'),
});

export type AdjustStockInput = z.infer<typeof adjustStockSchema>;
export type InventoryQueryInput = z.infer<typeof inventoryQuerySchema>;
