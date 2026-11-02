import Product from '../models/Product';
import { inventoryCalculationService } from './inventoryCalculationService';
import { mlClientService } from './mlClientService';
import { ProductForecastWithRisk } from '../types';
import { AppError } from '../middleware/errorHandler';

export class ForecastService {
  /**
   * Get demand forecast with dynamic stock-out risk and reorder recommendations
   * calculated using ML predicted demand over the supplier lead time.
   */
  async getProductForecast(
    productId: string,
    forecastDays: number = 7
  ): Promise<ProductForecastWithRisk> {
    const days = Math.min(Math.max(forecastDays, 1), 90);

    // Find product
    const product = await Product.findOne({
      $or: [{ _id: productId.match(/^[0-9a-fA-F]{24}$/) ? productId : null }, { sku: productId }],
    }).populate('supplier');

    if (!product) {
      throw new AppError(`Product not found: ${productId}`, 404);
    }

    // Call ML service
    const mlResult = await mlClientService.getForecast(product.sku || product._id.toString(), days);

    const totalPredictedDemand = mlResult.total_predicted_demand;
    const predictedDailyDemand = Number(
      (days > 0 ? totalPredictedDemand / days : 0).toFixed(2)
    );

    // Supplier lead time
    const leadTimeDays = product.leadTimeDays || (product.supplier as any)?.leadTimeDays || 7;
    const expectedLeadTimeDemand = Math.ceil(predictedDailyDemand * leadTimeDays);

    // Historical demand stats for safety stock calculation
    const demandStats = await inventoryCalculationService.calculateHistoricalDemandStats(product._id);
    const { safetyStock } = inventoryCalculationService.calculateSafetyStock(
      predictedDailyDemand,
      demandStats.demandStandardDeviation,
      leadTimeDays,
      product.minimumStock,
      demandStats.hasSufficientData
    );

    // Pending incoming purchases
    const pendingIncomingQuantity = await inventoryCalculationService.getPendingIncomingStock(product._id);

    // Reorder Point & Recommended Quantity based on ML Demand
    const reorderPoint = inventoryCalculationService.calculateReorderPoint(
      expectedLeadTimeDemand,
      safetyStock
    );

    const recommendedOrderQuantity = inventoryCalculationService.calculateRecommendedOrderQuantity(
      reorderPoint,
      expectedLeadTimeDemand,
      product.currentStock,
      pendingIncomingQuantity
    );

    // Stock-out Risk Assessment
    const stockRisk = inventoryCalculationService.assessStockOutRisk(
      product.currentStock,
      predictedDailyDemand,
      leadTimeDays,
      pendingIncomingQuantity
    );

    // Categorical Inventory Status
    const status = inventoryCalculationService.determineInventoryStatus(
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
      leadTimeDays,
      forecastDays: days,
      predictions: mlResult.predictions,
      totalPredictedDemand,
      predictedDailyDemand,
      expectedLeadTimeDemand,
      safetyStock,
      reorderPoint,
      recommendedOrderQuantity,
      pendingIncomingQuantity,
      daysUntilStockOut: stockRisk.estimatedDaysUntilStockOut,
      stockRisk,
      status,
      isFallback: mlResult.is_fallback,
      modelVersion: mlResult.model_version,
    };
  }

  /**
   * Get forecast and stock-out risk overview across all products
   */
  async getAllForecasts(forecastDays: number = 7): Promise<ProductForecastWithRisk[]> {
    const products = await Product.find({ status: 'active' }).limit(50);
    const results: ProductForecastWithRisk[] = [];

    for (const product of products) {
      try {
        const forecast = await this.getProductForecast(product._id.toString(), forecastDays);
        results.push(forecast);
      } catch {
        // Skip or continue if ML is unavailable for a specific product
      }
    }

    return results;
  }
}

export const forecastService = new ForecastService();
