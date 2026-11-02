import Product from '../models/Product';
import Sale from '../models/Sale';
import Purchase from '../models/Purchase';
import InventoryEvent from '../models/InventoryEvent';
import { inventoryCalculationService } from './inventoryCalculationService';
import { DashboardChartsQueryInput } from '../validators/dashboardValidators';
import {
  CategoryDistributionItem,
  DashboardChartsData,
  DashboardSummary,
  InventoryStatus,
  SalesTimelinePoint,
  TopProductItem,
} from '../types';

export class DashboardService {
  /**
   * Get high-level KPI summary, asset valuations, sales volume, and inventory health counts
   */
  async getDashboardSummary(): Promise<DashboardSummary> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    // Parallel aggregate queries for maximum performance
    const [
      totalProducts,
      valuationResult,
      todaySalesResult,
      monthlySalesResult,
      pendingPurchasesResult,
      recentSales,
      recentEvents,
      activeProducts,
    ] = await Promise.all([
      Product.countDocuments({ status: 'active' }),
      Product.aggregate([
        { $match: { status: 'active' } },
        {
          $group: {
            _id: null,
            totalCostValue: { $sum: { $multiply: ['$currentStock', '$costPrice'] } },
            totalRetailValue: { $sum: { $multiply: ['$currentStock', '$sellingPrice'] } },
          },
        },
      ]),
      Sale.aggregate([
        { $match: { date: { $gte: todayStart } } },
        {
          $group: {
            _id: null,
            revenue: { $sum: '$totalAmount' },
            quantitySold: { $sum: '$quantity' },
            orderCount: { $sum: 1 },
          },
        },
      ]),
      Sale.aggregate([
        { $match: { date: { $gte: thirtyDaysAgo } } },
        {
          $group: {
            _id: null,
            revenue: { $sum: '$totalAmount' },
            quantitySold: { $sum: '$quantity' },
            orderCount: { $sum: 1 },
          },
        },
      ]),
      Purchase.aggregate([
        { $match: { status: 'pending' } },
        {
          $group: {
            _id: null,
            orderCount: { $sum: 1 },
            totalUnits: { $sum: '$quantity' },
            totalCost: { $sum: '$totalCost' },
          },
        },
      ]),
      Sale.find()
        .populate('product', 'name sku sellingPrice')
        .populate('createdBy', 'name')
        .sort({ date: -1 })
        .limit(5),
      InventoryEvent.find()
        .populate('product', 'name sku')
        .populate('createdBy', 'name')
        .sort({ timestamp: -1 })
        .limit(5),
      Product.find({ status: 'active' }),
    ]);

    // Live inventory health distribution calculated via calculation engine
    const inventoryMetrics = await Promise.all(
      activeProducts.map((p) => inventoryCalculationService.computeProductInventoryMetrics(p))
    );

    const inventoryHealth = {
      healthy: inventoryMetrics.filter((m) => m.status === 'Healthy').length,
      lowStock: inventoryMetrics.filter((m) => m.status === 'Low Stock').length,
      reorderRecommended: inventoryMetrics.filter((m) => m.status === 'Reorder Recommended').length,
      critical: inventoryMetrics.filter((m) => m.status === 'Critical').length,
      stockOutRisk: inventoryMetrics.filter((m) => m.status === 'Stock-out Risk').length,
    };

    return {
      kpis: {
        totalProducts,
        inventoryValueCost: Number((valuationResult[0]?.totalCostValue || 0).toFixed(2)),
        inventoryValueRetail: Number((valuationResult[0]?.totalRetailValue || 0).toFixed(2)),
        todaySales: {
          revenue: Number((todaySalesResult[0]?.revenue || 0).toFixed(2)),
          quantitySold: todaySalesResult[0]?.quantitySold || 0,
          orderCount: todaySalesResult[0]?.orderCount || 0,
        },
        monthlySales: {
          revenue: Number((monthlySalesResult[0]?.revenue || 0).toFixed(2)),
          quantitySold: monthlySalesResult[0]?.quantitySold || 0,
          orderCount: monthlySalesResult[0]?.orderCount || 0,
        },
        pendingPurchases: {
          orderCount: pendingPurchasesResult[0]?.orderCount || 0,
          totalUnits: pendingPurchasesResult[0]?.totalUnits || 0,
          totalCost: Number((pendingPurchasesResult[0]?.totalCost || 0).toFixed(2)),
        },
      },
      inventoryHealth,
      recentActivities: {
        recentSales,
        recentInventoryEvents: recentEvents,
      },
    };
  }

  /**
   * Get analytical time-series and categorical charts data with configurable window
   */
  async getDashboardCharts(query: DashboardChartsQueryInput): Promise<DashboardChartsData> {
    const periodDays =
      query.period === '7d' ? 7 : query.period === '90d' ? 90 : query.period === '1y' ? 365 : 30;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);
    startDate.setHours(0, 0, 0, 0);

    const matchSales: Record<string, any> = { date: { $gte: startDate } };
    if (query.category) {
      const categoryProducts = await Product.find({ category: query.category }).select('_id');
      matchSales.product = { $in: categoryProducts.map((p) => p._id) };
    }

    // 1. Sales over time aggregated by day
    const rawDailySales = await Sale.aggregate([
      { $match: matchSales },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          revenue: { $sum: '$totalAmount' },
          quantitySold: { $sum: '$quantity' },
          orderCount: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const salesMap = new Map<string, { revenue: number; quantitySold: number; orderCount: number }>();
    for (const item of rawDailySales) {
      salesMap.set(item._id, {
        revenue: Number(item.revenue.toFixed(2)),
        quantitySold: item.quantitySold,
        orderCount: item.orderCount,
      });
    }

    // Zero-fill daily timeline
    const salesOverTime: SalesTimelinePoint[] = [];
    const iterDate = new Date(startDate);
    const today = new Date();

    while (iterDate <= today) {
      const dateKey = iterDate.toISOString().split('T')[0];
      const data = salesMap.get(dateKey) || { revenue: 0, quantitySold: 0, orderCount: 0 };
      salesOverTime.push({
        date: dateKey,
        ...data,
      });
      iterDate.setDate(iterDate.getDate() + 1);
    }

    // 2. Category distribution
    const categoryDistributionRaw = await Product.aggregate([
      { $match: { status: 'active' } },
      {
        $group: {
          _id: '$category',
          productCount: { $sum: 1 },
          totalStock: { $sum: '$currentStock' },
          totalCostValue: { $sum: { $multiply: ['$currentStock', '$costPrice'] } },
          totalRetailValue: { $sum: { $multiply: ['$currentStock', '$sellingPrice'] } },
        },
      },
      { $sort: { totalRetailValue: -1 } },
    ]);

    const categoryDistribution: CategoryDistributionItem[] = categoryDistributionRaw.map((c) => ({
      category: c._id || 'Uncategorized',
      productCount: c.productCount,
      totalStock: c.totalStock,
      totalCostValue: Number((c.totalCostValue || 0).toFixed(2)),
      totalRetailValue: Number((c.totalRetailValue || 0).toFixed(2)),
    }));

    // 3. Top-selling products
    const topProductsRaw = await Sale.aggregate([
      { $match: matchSales },
      {
        $group: {
          _id: '$product',
          quantitySold: { $sum: '$quantity' },
          totalRevenue: { $sum: '$totalAmount' },
        },
      },
      { $sort: { quantitySold: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'productDetails',
        },
      },
      { $unwind: '$productDetails' },
    ]);

    const topSellingProducts: TopProductItem[] = topProductsRaw.map((item) => ({
      productId: item._id.toString(),
      productName: item.productDetails.name,
      sku: item.productDetails.sku,
      category: item.productDetails.category,
      quantitySold: item.quantitySold,
      totalRevenue: Number(item.totalRevenue.toFixed(2)),
      currentStock: item.productDetails.currentStock,
    }));

    // 4. Stock status distribution
    const activeProducts = await Product.find({ status: 'active' });
    const allProductMetrics = await Promise.all(
      activeProducts.map((p) => inventoryCalculationService.computeProductInventoryMetrics(p))
    );

    const statusCounts: Record<InventoryStatus, number> = {
      Healthy: 0,
      'Low Stock': 0,
      'Reorder Recommended': 0,
      Critical: 0,
      'Stock-out Risk': 0,
    };

    for (const m of allProductMetrics) {
      statusCounts[m.status] = (statusCounts[m.status] || 0) + 1;
    }

    const stockStatusDistribution = (Object.keys(statusCounts) as InventoryStatus[]).map((st) => ({
      status: st,
      count: statusCounts[st],
    }));

    // 5. Stock movement trend (daily additions vs deductions from InventoryEvent)
    const rawMovements = await InventoryEvent.aggregate([
      { $match: { timestamp: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
          added: {
            $sum: {
              $cond: [{ $gt: ['$quantity', 0] }, '$quantity', 0],
            },
          },
          deducted: {
            $sum: {
              $cond: [{ $lt: ['$quantity', 0] }, { $abs: '$quantity' }, 0],
            },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const movementMap = new Map<string, { added: number; deducted: number }>();
    for (const m of rawMovements) {
      movementMap.set(m._id, { added: m.added, deducted: m.deducted });
    }

    const stockMovementTrend: { date: string; added: number; deducted: number }[] = [];
    const moveIter = new Date(startDate);
    while (moveIter <= today) {
      const dateKey = moveIter.toISOString().split('T')[0];
      const m = movementMap.get(dateKey) || { added: 0, deducted: 0 };
      stockMovementTrend.push({ date: dateKey, ...m });
      moveIter.setDate(moveIter.getDate() + 1);
    }

    return {
      salesOverTime,
      categoryDistribution,
      topSellingProducts,
      stockStatusDistribution,
      stockMovementTrend,
    };
  }
}

export const dashboardService = new DashboardService();
