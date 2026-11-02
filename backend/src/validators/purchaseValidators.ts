import { z } from 'zod';

export const createPurchaseSchema = z.object({
  product: z
    .string({ required_error: 'Product ID is required' })
    .regex(/^[0-9a-fA-F]{24}$/, 'Product must be a valid 24-character hexadecimal ID'),
  supplier: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Supplier must be a valid 24-character hexadecimal ID')
    .optional(),
  quantity: z
    .number({ required_error: 'Quantity is required' })
    .int('Quantity must be an integer')
    .min(1, 'Quantity must be at least 1'),
  unitCost: z
    .number()
    .min(0, 'Unit cost cannot be negative')
    .optional(),
  date: z.coerce.date().optional(),
});

export const updatePurchaseSchema = z.object({
  status: z.enum(['pending', 'received', 'cancelled']).optional(),
  quantity: z.number().int().min(1).optional(),
  unitCost: z.number().min(0).optional(),
});

export const purchaseQuerySchema = z.object({
  product: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Product must be a valid 24-character hexadecimal ID')
    .optional(),
  supplier: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Supplier must be a valid 24-character hexadecimal ID')
    .optional(),
  status: z.enum(['pending', 'received', 'cancelled']).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  sort: z.string().optional().default('date'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type CreatePurchaseInput = z.infer<typeof createPurchaseSchema>;
export type UpdatePurchaseInput = z.infer<typeof updatePurchaseSchema>;
export type PurchaseQueryInput = z.infer<typeof purchaseQuerySchema>;
