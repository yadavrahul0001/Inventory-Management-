import { z } from 'zod';

export const createProductSchema = z.object({
  name: z
    .string({ required_error: 'Product name is required' })
    .trim()
    .min(2, 'Product name must be at least 2 characters')
    .max(200, 'Product name cannot exceed 200 characters'),
  sku: z
    .string({ required_error: 'SKU is required' })
    .trim()
    .min(2, 'SKU must be at least 2 characters')
    .max(50, 'SKU cannot exceed 50 characters')
    .toUpperCase(),
  category: z
    .string({ required_error: 'Category is required' })
    .trim()
    .min(1, 'Category is required'),
  supplier: z
    .string({ required_error: 'Supplier ID is required' })
    .regex(/^[0-9a-fA-F]{24}$/, 'Supplier must be a valid 24-character hexadecimal ID'),
  description: z.string().trim().max(1000).optional().default(''),
  costPrice: z
    .number({ required_error: 'Cost price is required' })
    .min(0, 'Cost price cannot be negative'),
  sellingPrice: z
    .number({ required_error: 'Selling price is required' })
    .min(0, 'Selling price cannot be negative'),
  currentStock: z
    .number()
    .int('Stock must be an integer')
    .min(0, 'Stock cannot be negative')
    .optional()
    .default(0),
  minimumStock: z
    .number()
    .int('Minimum stock must be an integer')
    .min(0, 'Minimum stock cannot be negative')
    .optional()
    .default(10),
  reorderLevel: z
    .number()
    .int('Reorder level must be an integer')
    .min(0, 'Reorder level cannot be negative')
    .optional()
    .default(20),
  leadTimeDays: z
    .number()
    .int('Lead time must be an integer')
    .min(1, 'Lead time must be at least 1 day')
    .max(365, 'Lead time cannot exceed 365 days')
    .optional()
    .default(7),
  unit: z
    .enum(['pieces', 'kg', 'liters', 'meters', 'boxes', 'pairs'])
    .optional()
    .default('pieces'),
  status: z
    .enum(['active', 'inactive', 'discontinued'])
    .optional()
    .default('active'),
});

export const updateProductSchema = createProductSchema.partial();

export const productQuerySchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  supplier: z.string().optional(),
  status: z.enum(['active', 'inactive', 'discontinued']).optional(),
  stockFilter: z.enum(['all', 'inStock', 'lowStock', 'outOfStock']).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  sort: z.string().optional().default('createdAt'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ProductQueryInput = z.infer<typeof productQuerySchema>;
