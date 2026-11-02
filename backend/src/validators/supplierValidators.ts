import { z } from 'zod';

export const createSupplierSchema = z.object({
  name: z
    .string({ required_error: 'Supplier name is required' })
    .trim()
    .min(2, 'Supplier name must be at least 2 characters')
    .max(200, 'Supplier name cannot exceed 200 characters'),
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .email('Invalid email address')
    .toLowerCase(),
  phone: z
    .string({ required_error: 'Phone number is required' })
    .trim()
    .min(5, 'Phone number must be at least 5 characters'),
  address: z.string().trim().optional().default(''),
  leadTimeDays: z
    .number()
    .int('Lead time must be an integer')
    .min(1, 'Lead time must be at least 1 day')
    .max(365, 'Lead time cannot exceed 365 days')
    .optional()
    .default(7),
  status: z.enum(['active', 'inactive']).optional().default('active'),
});

export const updateSupplierSchema = createSupplierSchema.partial();

export const supplierQuerySchema = z.object({
  search: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  sort: z.string().optional().default('createdAt'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;
export type SupplierQueryInput = z.infer<typeof supplierQuerySchema>;
