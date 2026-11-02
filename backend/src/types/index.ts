import { Request } from 'express';

export type UserRole = 'admin' | 'manager' | 'staff';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  pagination?: PaginationInfo;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export type InventoryStatus =
  | 'Healthy'
  | 'Low Stock'
  | 'Reorder Recommended'
  | 'Critical'
  | 'Stock-out Risk';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface StockRisk {
  riskLevel: RiskLevel;
  estimatedDaysUntilStockOut: number;
  currentStock: number;
  predictedDailyDemand: number;
  leadTimeDays: number;
  recommendedAction: string;
}

export interface ReorderRecommendation {
  currentStock: number;
  predictedDailyDemand: number;
  leadTimeDays: number;
  expectedLeadTimeDemand: number;
  safetyStock: number;
  reorderPoint: number;
  recommendedOrderQuantity: number;
  pendingIncomingQuantity: number;
  isFallback: boolean;
  explanation: {
    formula: string;
    values: {
      targetRequirement: number;
      availableStock: number;
      incomingStock: number;
      safetyStock: number;
      reorderPoint: number;
    };
  };
}

export interface ProductInventoryMetrics {
  productId: string;
  productName: string;
  sku: string;
  category: string;
  currentStock: number;
  minimumStock: number;
  reorderLevel: number;
  leadTimeDays: number;
  averageDailyDemand: number;
  safetyStock: number;
  reorderPoint: number;
  recommendedOrderQuantity: number;
  pendingIncomingQuantity: number;
  daysUntilStockOut: number;
  stockRisk: StockRisk;
  status: InventoryStatus;
  isFallbackCalculation: boolean;
}

export interface DashboardSummary {
  kpis: {
    totalProducts: number;
    inventoryValueCost: number;
    inventoryValueRetail: number;
    todaySales: {
      revenue: number;
      quantitySold: number;
      orderCount: number;
    };
    monthlySales: {
      revenue: number;
      quantitySold: number;
      orderCount: number;
    };
    pendingPurchases: {
      orderCount: number;
      totalUnits: number;
      totalCost: number;
    };
  };
  inventoryHealth: {
    healthy: number;
    lowStock: number;
    reorderRecommended: number;
    critical: number;
    stockOutRisk: number;
  };
  recentActivities: {
    recentSales: any[];
    recentInventoryEvents: any[];
  };
}

export interface SalesTimelinePoint {
  date: string;
  revenue: number;
  quantitySold: number;
  orderCount: number;
}

export interface CategoryDistributionItem {
  category: string;
  productCount: number;
  totalStock: number;
  totalCostValue: number;
  totalRetailValue: number;
}

export interface TopProductItem {
  productId: string;
  productName: string;
  sku: string;
  category: string;
  quantitySold: number;
  totalRevenue: number;
  currentStock: number;
}

export interface DashboardChartsData {
  salesOverTime: SalesTimelinePoint[];
  categoryDistribution: CategoryDistributionItem[];
  topSellingProducts: TopProductItem[];
  stockStatusDistribution: { status: InventoryStatus; count: number }[];
  stockMovementTrend: { date: string; added: number; deducted: number }[];
}

export interface MLForecastRequest {
  product_id: string;
  forecast_days: number;
}

export interface MLForecastResponse {
  product_id: string;
  forecast_days: number;
  predictions: number[];
  total_predicted_demand: number;
  model_version: string;
}

export interface MLHealthResponse {
  status: string;
  model_loaded: boolean;
  model_version: string | null;
}

export type InsightType =
  | 'STOCKOUT_IMMINENT'
  | 'DEMAND_SURGE'
  | 'REORDER_RECOMMENDED'
  | 'LEAD_TIME_DEFICIT'
  | 'OVERSTOCK_RISK'
  | 'HEALTHY_RUNWAY';

export type InsightSeverity = 'critical' | 'warning' | 'info' | 'success';

export interface AIInsight {
  id: string;
  type: InsightType;
  severity: InsightSeverity;
  productId: string;
  productName: string;
  sku: string;
  message: string;
  metrics: {
    currentStock: number;
    predictedDailyDemand: number;
    leadTimeDays: number;
    daysUntilStockOut: number;
    reorderPoint: number;
    recommendedOrderQuantity: number;
    demandChangePercent?: number;
  };
  recommendedAction: string;
  createdAt: string;
}

export type AnomalyType = 'SPIKE' | 'DROP' | 'UNUSUAL_PRICE';

export interface SalesAnomaly {
  id: string;
  date: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  expectedMean: number;
  standardDeviation: number;
  zScore: number;
  anomalyType: AnomalyType;
  severity: 'low' | 'medium' | 'high';
  unitPrice: number;
  totalAmount: number;
}

export interface ProductForecastWithRisk {
  productId: string;
  productName: string;
  sku: string;
  category: string;
  currentStock: number;
  leadTimeDays: number;
  forecastDays: number;
  predictions: number[];
  totalPredictedDemand: number;
  predictedDailyDemand: number;
  expectedLeadTimeDemand: number;
  safetyStock: number;
  reorderPoint: number;
  recommendedOrderQuantity: number;
  pendingIncomingQuantity: number;
  daysUntilStockOut: number;
  stockRisk: StockRisk;
  status: InventoryStatus;
  isFallback: boolean;
  modelVersion: string;
}
