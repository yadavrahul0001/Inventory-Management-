export type UserRole = 'admin' | 'manager' | 'staff';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
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

export type ProductStatus = 'active' | 'inactive' | 'discontinued';
export type ProductUnit = 'pieces' | 'kg' | 'liters' | 'meters' | 'boxes' | 'pairs';

export interface Product {
  _id: string;
  name: string;
  sku: string;
  category: string;
  supplier: string | { _id: string; name: string; email?: string; phone?: string; leadTimeDays?: number };
  description?: string;
  costPrice: number;
  sellingPrice: number;
  currentStock: number;
  minimumStock: number;
  reorderLevel: number;
  leadTimeDays: number;
  unit: ProductUnit;
  status: ProductStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Supplier {
  _id: string;
  name: string;
  email: string;
  phone: string;
  address?: string;
  leadTimeDays: number;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface Sale {
  _id: string;
  product: string | Product;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  customer: string;
  date: string;
  createdBy: string | User;
  createdAt: string;
}

export type PurchaseStatus = 'pending' | 'received' | 'cancelled';

export interface Purchase {
  _id: string;
  product: string | Product;
  supplier: string | Supplier;
  quantity: number;
  unitCost: number;
  totalCost: number;
  status: PurchaseStatus;
  date: string;
  createdBy: string | User;
  createdAt: string;
}

export type InventoryEventType = 'SALE' | 'PURCHASE' | 'ADJUSTMENT' | 'RETURN' | 'INITIAL_STOCK';

export interface InventoryEvent {
  _id: string;
  product: string | Product;
  type: InventoryEventType;
  quantity: number;
  previousStock: number;
  newStock: number;
  reference: string;
  createdBy: string | User;
  timestamp: string;
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

export interface MLModelStatus {
  model_loaded: boolean;
  model_version: string | null;
  feature_columns: string[];
  metrics: Record<string, number>;
  num_products: number | null;
  product_ids: string[];
}

export interface MLForecastResult {
  product_id: string;
  forecast_days: number;
  predictions: number[];
  total_predicted_demand: number;
  model_version: string;
  is_fallback: boolean;
  fallback_reason?: string;
  forecast_type?: 'fallback' | 'ml_prediction';
}

export interface MLTrainResult {
  success: boolean;
  model_version: string;
  metrics: {
    mae: number;
    rmse: number;
    mape: number;
  };
  message: string;
}

export interface MLHealthStatus {
  status: string;
  service: string;
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
