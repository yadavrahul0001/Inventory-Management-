import Product from '../models/Product';
import { forecastService } from './forecastService';
import { inventoryCalculationService } from './inventoryCalculationService';
import { AIInsight, InsightSeverity } from '../types';

export class InsightsService {
  /**
   * Generate data-driven AI inventory insights from live inventory levels,
   * supplier lead times, and ML demand projections.
   */
  async generateInsights(): Promise<AIInsight[]> {
    const products = await Product.find({ status: 'active' }).populate('supplier').limit(50);
    const insights: AIInsight[] = [];

    for (const product of products) {
      try {
        const leadTimeDays = product.leadTimeDays || (product.supplier as any)?.leadTimeDays || 7;

        // Fetch forecast and historical stats
        const [forecast, demandStats] = await Promise.all([
          forecastService.getProductForecast(product._id.toString(), 7).catch(() => null),
          inventoryCalculationService.calculateHistoricalDemandStats(product._id).catch(() => null),
        ]);

        const currentStock = product.currentStock;
        const predictedDailyDemand = forecast ? forecast.predictedDailyDemand : (demandStats?.averageDailyDemand || 1);
        const averageDailyDemand = demandStats?.averageDailyDemand || predictedDailyDemand;
        const reorderPoint = forecast ? forecast.reorderPoint : (product.reorderLevel || 10);
        const recommendedOrderQuantity = forecast ? forecast.recommendedOrderQuantity : Math.max(0, product.minimumStock * 2 - currentStock);
        const daysUntilStockOut = forecast ? forecast.daysUntilStockOut : Number((currentStock / Math.max(predictedDailyDemand, 0.1)).toFixed(1));
        const pendingIncomingQuantity = forecast ? forecast.pendingIncomingQuantity : 0;

        const baseMetrics = {
          currentStock,
          predictedDailyDemand,
          leadTimeDays,
          daysUntilStockOut,
          reorderPoint,
          recommendedOrderQuantity,
        };

        // 1. Critical: Imminent Stock-Out
        if (currentStock === 0) {
          insights.push({
            id: `insight-stockout-${product._id}`,
            type: 'STOCKOUT_IMMINENT',
            severity: 'critical',
            productId: product._id.toString(),
            productName: product.name,
            sku: product.sku,
            message: `${product.name} is currently out of stock. Customer orders are at immediate risk of fulfillment failure.`,
            metrics: baseMetrics,
            recommendedAction: `Expedite an emergency purchase order of ${Math.max(recommendedOrderQuantity, product.minimumStock || 10)} units immediately.`,
            createdAt: new Date().toISOString(),
          });
        } else if (daysUntilStockOut <= leadTimeDays && pendingIncomingQuantity === 0) {
          insights.push({
            id: `insight-imminent-${product._id}`,
            type: 'STOCKOUT_IMMINENT',
            severity: 'critical',
            productId: product._id.toString(),
            productName: product.name,
            sku: product.sku,
            message: `${product.name} inventory will deplete in ~${daysUntilStockOut} days, which is less than the supplier lead time (${leadTimeDays} days).`,
            metrics: baseMetrics,
            recommendedAction: `Issue an urgent purchase order for at least ${recommendedOrderQuantity} units to avoid a complete stock-out.`,
            createdAt: new Date().toISOString(),
          });
        }

        // 2. Warning: Demand Surge
        if (averageDailyDemand > 0 && predictedDailyDemand >= 1.25 * averageDailyDemand) {
          const surgePct = Math.round(((predictedDailyDemand - averageDailyDemand) / averageDailyDemand) * 100);
          insights.push({
            id: `insight-surge-${product._id}`,
            type: 'DEMAND_SURGE',
            severity: 'warning',
            productId: product._id.toString(),
            productName: product.name,
            sku: product.sku,
            message: `${product.name} demand is projected to surge by +${surgePct}% compared to its recent historical baseline.`,
            metrics: { ...baseMetrics, demandChangePercent: surgePct },
            recommendedAction: `Increase safety stock allocation and advance reorder schedule with supplier before stock runs low.`,
            createdAt: new Date().toISOString(),
          });
        }

        // 3. Warning: Reorder Recommended
        if (currentStock <= reorderPoint && currentStock > 0 && pendingIncomingQuantity === 0 && daysUntilStockOut > leadTimeDays) {
          insights.push({
            id: `insight-reorder-${product._id}`,
            type: 'REORDER_RECOMMENDED',
            severity: 'warning',
            productId: product._id.toString(),
            productName: product.name,
            sku: product.sku,
            message: `${product.name} stock level (${currentStock} units) has dropped below the calculated reorder point (${reorderPoint} units).`,
            metrics: baseMetrics,
            recommendedAction: `Place a standard replenishment order for ${recommendedOrderQuantity} units.`,
            createdAt: new Date().toISOString(),
          });
        }

        // 4. Info: Overstock Risk
        if (daysUntilStockOut > 90 && predictedDailyDemand > 0) {
          insights.push({
            id: `insight-overstock-${product._id}`,
            type: 'OVERSTOCK_RISK',
            severity: 'info',
            productId: product._id.toString(),
            productName: product.name,
            sku: product.sku,
            message: `${product.name} stock (${currentStock} units) covers over ${daysUntilStockOut} days of predicted demand, tying up working capital.`,
            metrics: baseMetrics,
            recommendedAction: `Pause upcoming purchase orders and consider bundling or seasonal promotions to accelerate turnover.`,
            createdAt: new Date().toISOString(),
          });
        }

        // 5. Success: Healthy Runway
        if (daysUntilStockOut > leadTimeDays * 2 && currentStock > reorderPoint && daysUntilStockOut <= 90) {
          insights.push({
            id: `insight-healthy-${product._id}`,
            type: 'HEALTHY_RUNWAY',
            severity: 'success',
            productId: product._id.toString(),
            productName: product.name,
            sku: product.sku,
            message: `Current stock for ${product.name} covers ${daysUntilStockOut} days of projected demand, comfortably exceeding the ${leadTimeDays}-day supplier lead time.`,
            metrics: baseMetrics,
            recommendedAction: `No immediate replenishment required. Monitor next regular reorder review.`,
            createdAt: new Date().toISOString(),
          });
        }
      } catch {
        // Skip individual product calculation errors
      }
    }

    // Sort insights by severity: critical -> warning -> info -> success
    const severityOrder: Record<InsightSeverity, number> = {
      critical: 0,
      warning: 1,
      info: 2,
      success: 3,
    };

    return insights.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  }

  /**
   * Get high level insights count summary
   */
  async getInsightsSummary(): Promise<{
    total: number;
    critical: number;
    warning: number;
    info: number;
    success: number;
  }> {
    const insights = await this.generateInsights();
    return {
      total: insights.length,
      critical: insights.filter((i) => i.severity === 'critical').length,
      warning: insights.filter((i) => i.severity === 'warning').length,
      info: insights.filter((i) => i.severity === 'info').length,
      success: insights.filter((i) => i.severity === 'success').length,
    };
  }
}

export const insightsService = new InsightsService();
