import { z } from 'zod';

export const dashboardChartsQuerySchema = z.object({
  period: z
    .enum(['7d', '30d', '90d', '1y'])
    .optional()
    .default('30d'),
  category: z.string().optional(),
});

export type DashboardChartsQueryInput = z.infer<typeof dashboardChartsQuerySchema>;
