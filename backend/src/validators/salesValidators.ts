import { z } from 'zod';

export const createSaleSchema = z.object({
  product: z
    .string({ required_error: 'Product ID is required' })
    .regex(/^[0-9a-fA-F]{24}$/, 'Product must be a valid 24-character hexadecimal ID'),
  quantity: z
    .number({ required_error: 'Quantity is required' })
    .int('Quantity must be an integer')
    .min(1, 'Quantity must be at least 1'),
  unitPrice: z
    .number()
    .min(0, 'Unit price cannot be negative')
    .optional(),
  customer: z
    .string()
    .trim()
    .max(100, 'Customer name cannot exceed 100 characters')
    .optional()
    .default('Walk-in Customer'),
  date: z.coerce.date().optional(),
});

export const salesQuerySchema = z.object({
  product: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Product must be a valid 24-character hexadecimal ID')
    .optional(),
  customer: z.string().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  sort: z.string().optional().default('date'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type CreateSaleInput = z.infer<typeof createSaleSchema>;
export type SalesQueryInput = z.infer<typeof salesQuerySchema>;
