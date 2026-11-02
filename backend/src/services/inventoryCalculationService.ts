import mongoose, { Types } from 'mongoose';
import Sale from '../models/Sale';
import Purchase from '../models/Purchase';
import { IProduct } from '../models/Product';
import {
  InventoryStatus,
  ProductInventoryMetrics,
  ReorderRecommendation,
  RiskLevel,
  StockRisk,
} from '../types';

export interface DemandStats {
  averageDailyDemand: number;
  demandStandardDeviation: number;
  dataPointsCount: number;
  hasSufficientData: boolean;
}

export class InventoryCalculationService {
  /**
   * Z-score corresponding to 95% service level cycle fill rate
   */
  private readonly DEFAULT_SERVICE_LEVEL_Z = 1.65;

  /**
   * Minimum number of days with sales data to consider statistical calculations valid
   */
  private readonly MIN_DATA_POINTS_FOR_STATS = 14;

  /**
   * Calculate historical daily demand average and standard deviation over a time window
   */
  async calculateHistoricalDemandStats(
    productId: string | Types.ObjectId,
    windowDays = 30
  ): Promise<DemandStats> {
    const objectId = typeof productId === 'string' ? new mongoose.Types.ObjectId(productId) : productId;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - windowDays);
    startDate.setHours(0, 0, 0, 0);

    const dailyAggregations = await Sale.aggregate([
      {
        $match: {
          product: objectId,
          date: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$date' },
          },
          dailyQuantity: { $sum: '$quantity' },
        },
      },
    ]);

    const salesByDay = new Map<string, number>();
    for (const record of dailyAggregations) {
      salesByDay.set(record._id, record.dailyQuantity);
    }

    // Build complete daily time series for the window
    const dailyQuantities: number[] = [];
    const currentDate = new Date(startDate);
    const today = new Date();

    while (currentDate <= today) {
      const dateKey = currentDate.toISOString().split('T')[0];
      dailyQuantities.push(salesByDay.get(dateKey) || 0);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    const totalDays = dailyQuantities.length || windowDays;
    const totalSold = dailyQuantities.reduce((sum, q) => sum + q, 0);
    const averageDailyDemand = Number((totalSold / totalDays).toFixed(2));

    // Standard deviation of daily demand
    const variance =
      dailyQuantities.reduce((sum, q) => sum + Math.pow(q - averageDailyDemand, 2), 0) /
      totalDays;
    const demandStandardDeviation = Number(Math.sqrt(variance).toFixed(2));

    const activeDaysCount = dailyAggregations.length;
    const hasSufficientData = activeDaysCount >= this.MIN_DATA_POINTS_FOR_STATS;

    return {
      averageDailyDemand,
      demandStandardDeviation,
      dataPointsCount: activeDaysCount,
      hasSufficientData,
    };
  }

  /**
   * Get pending incoming inventory from open purchase orders
   */
  async getPendingIncomingStock(productId: string | Types.ObjectId): Promise<number> {
    const objectId = typeof productId === 'string' ? new mongoose.Types.ObjectId(productId) : productId;

    const result = await Purchase.aggregate([
      {
        $match: {
          product: objectId,
          status: 'pending',
        },
      },
      {
        $group: {
          _id: null,
          totalIncoming: { $sum: '$quantity' },
        },
      },
    ]);

    return result.length > 0 ? result[0].totalIncoming : 0;
  }

  /**
   * Calculate safety stock using demand variance and lead time with documented fallback
   */
  calculateSafetyStock(
    _averageDailyDemand: number,
    demandStandardDeviation: number,
    leadTimeDays: number,
    minimumStock: number,
    hasSufficientData: boolean
  ): { safetyStock: number; isFallback: boolean } {
    if (hasSufficientData && demandStandardDeviation > 0) {
      // Statistical safety stock formula: Z * sigma_demand * sqrt(leadTime)
      const calculated = Math.ceil(
        this.DEFAULT_SERVICE_LEVEL_Z * demandStandardDeviation * Math.sqrt(leadTimeDays)
      );
      return {
        safetyStock: Math.max(1, calculated),
        isFallback: false,
      };
    }

    // Deterministic fallback: 50% of configured minimum stock or 1 unit
    const fallback = Math.max(1, Math.ceil(minimumStock * 0.5));
    return {
      safetyStock: fallback,
      isFallback: true,
    };
  }

  /**
   * Calculate Reorder Point = Expected Demand During Lead Time + Safety Stock
   */
  calculateReorderPoint(expectedLeadTimeDemand: number, safetyStock: number): number {
    return Math.ceil(expectedLeadTimeDemand + safetyStock);
  }

  /**
   * Calculate Recommended Order Quantity
   * Target Inventory Requirement = Reorder Point + Expected Lead Time Demand
   * Recommended = max(0, Target - Current Available - Pending Incoming)
   */
  calculateRecommendedOrderQuantity(
    reorderPoint: number,
    expectedLeadTimeDemand: number,
    currentStock: number,
    pendingIncomingStock: number
  ): number {
    const targetRequirement = reorderPoint + expectedLeadTimeDemand;
    const totalAvailable = currentStock + pendingIncomingStock;
    return Math.max(0, targetRequirement - totalAvailable);
  }

  /**
   * Assess stock-out risk level and calculate estimated days until stock depletion
   */
  assessStockOutRisk(
    currentStock: number,
    dailyDemand: number,
    leadTimeDays: number,
    pendingIncomingStock: number
  ): StockRisk {
    const effectiveDemand = Math.max(dailyDemand, 0.1);
    const estimatedDaysUntilStockOut = Number((currentStock / effectiveDemand).toFixed(1));

    let riskLevel: RiskLevel;
    let recommendedAction: string;

    if (currentStock === 0) {
      riskLevel = 'CRITICAL';
      recommendedAction =
        'Out of stock! Issue urgent purchase order immediately to minimize downtime.';
    } else if (estimatedDaysUntilStockOut <= leadTimeDays * 0.5) {
      riskLevel = 'CRITICAL';
      recommendedAction = `Critical risk: Stock will deplete in ~${estimatedDaysUntilStockOut} days, shorter than supplier lead time (${leadTimeDays} days). Expedite purchase order.`;
    } else if (estimatedDaysUntilStockOut <= leadTimeDays) {
      riskLevel = 'HIGH';
      recommendedAction = `High risk: Stock will run out within lead time (${leadTimeDays} days). Reorder immediately${
        pendingIncomingStock > 0 ? ` (Pending incoming: ${pendingIncomingStock} units)` : ''
      }.`;
    } else if (estimatedDaysUntilStockOut <= leadTimeDays * 1.5) {
      riskLevel = 'MEDIUM';
      recommendedAction = `Moderate risk: Stock is sufficient for approximately ${estimatedDaysUntilStockOut} days. Monitor and prepare next order cycle.`;
    } else {
      riskLevel = 'LOW';
      recommendedAction = `Healthy inventory level. Estimated runway is ~${estimatedDaysUntilStockOut} days.`;
    }

    return {
      riskLevel,
      estimatedDaysUntilStockOut,
      currentStock,
      predictedDailyDemand: dailyDemand,
      leadTimeDays,
      recommendedAction,
    };
  }

  /**
   * Determine categorical inventory status
   */
  determineInventoryStatus(
    currentStock: number,
    minimumStock: number,
    reorderPoint: number,
    stockRiskLevel: RiskLevel,
    pendingIncomingStock: number
  ): InventoryStatus {
    if (currentStock === 0 || currentStock <= Math.floor(minimumStock * 0.5)) {
      return 'Critical';
    }

    if (stockRiskLevel === 'CRITICAL' || (stockRiskLevel === 'HIGH' && pendingIncomingStock === 0)) {
      return 'Stock-out Risk';
    }

    if (currentStock <= minimumStock) {
      return 'Low Stock';
    }

    if (currentStock <= reorderPoint) {
      return 'Reorder Recommended';
    }

    return 'Healthy';
  }

  /**
   * Compute comprehensive inventory metrics for a product
   */
  async computeProductInventoryMetrics(
    product: IProduct,
    predictedDailyDemandOverride?: number
  ): Promise<ProductInventoryMetrics> {
    const demandStats = await this.calculateHistoricalDemandStats(product._id);
    const pendingIncomingQuantity = await this.getPendingIncomingStock(product._id);

    // Use ML override if passed, otherwise historical average (or fallback to minimum daily assumption)
    const averageDailyDemand =
      typeof predictedDailyDemandOverride === 'number'
        ? predictedDailyDemandOverride
        : demandStats.averageDailyDemand > 0
        ? demandStats.averageDailyDemand
        : 1;

    const leadTimeDays = product.leadTimeDays || 7;
    const expectedLeadTimeDemand = Number((averageDailyDemand * leadTimeDays).toFixed(2));

    const { safetyStock, isFallback } = this.calculateSafetyStock(
      averageDailyDemand,
      demandStats.demandStandardDeviation,
      leadTimeDays,
      product.minimumStock,
      demandStats.hasSufficientData
    );

    const reorderPoint = this.calculateReorderPoint(expectedLeadTimeDemand, safetyStock);

    const recommendedOrderQuantity = this.calculateRecommendedOrderQuantity(
      reorderPoint,
      expectedLeadTimeDemand,
      product.currentStock,
      pendingIncomingQuantity
    );

    const stockRisk = this.assessStockOutRisk(
      product.currentStock,
      averageDailyDemand,
      leadTimeDays,
      pendingIncomingQuantity
    );

    const status = this.determineInventoryStatus(
      product.currentStock,
      product.minimumStock,
      reorderPoint,
      stockRisk.riskLevel,
      pendingIncomingQuantity
    );

    return {
      productId: product._id.toString(),
      productName: product.name,
      sku: product.sku,
      category: product.category,
      currentStock: product.currentStock,
      minimumStock: product.minimumStock,
      reorderLevel: product.reorderLevel,
      leadTimeDays,
      averageDailyDemand,
      safetyStock,
      reorderPoint,
      recommendedOrderQuantity,
      pendingIncomingQuantity,
      daysUntilStockOut: stockRisk.estimatedDaysUntilStockOut,
      stockRisk,
      status,
      isFallbackCalculation: isFallback,
    };
  }

  /**
   * Build transparent reorder recommendation explanation
   */
  generateReorderRecommendation(metrics: ProductInventoryMetrics): ReorderRecommendation {
    const expectedLeadTimeDemand = Number(
      (metrics.averageDailyDemand * metrics.leadTimeDays).toFixed(2)
    );
    const targetRequirement = metrics.reorderPoint + expectedLeadTimeDemand;

    return {
      currentStock: metrics.currentStock,
      predictedDailyDemand: metrics.averageDailyDemand,
      leadTimeDays: metrics.leadTimeDays,
      expectedLeadTimeDemand,
      safetyStock: metrics.safetyStock,
      reorderPoint: metrics.reorderPoint,
      recommendedOrderQuantity: metrics.recommendedOrderQuantity,
      pendingIncomingQuantity: metrics.pendingIncomingQuantity,
      isFallback: metrics.isFallbackCalculation,
      explanation: {
        formula:
          'Recommended Order Quantity = Target Requirement (Reorder Point + Lead-Time Demand) - Available Inventory - Pending Incoming Orders',
        values: {
          targetRequirement,
          availableStock: metrics.currentStock,
          incomingStock: metrics.pendingIncomingQuantity,
          safetyStock: metrics.safetyStock,
          reorderPoint: metrics.reorderPoint,
        },
      },
    };
  }
}

export const inventoryCalculationService = new InventoryCalculationService();
