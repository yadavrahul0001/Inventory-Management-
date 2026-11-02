import mongoose from 'mongoose';
import Product from '../models/Product';
import InventoryEvent, { IInventoryEvent } from '../models/InventoryEvent';
import Sale from '../models/Sale';
import Purchase from '../models/Purchase';
import {
  inventoryCalculationService,
} from './inventoryCalculationService';
import { AdjustStockInput, InventoryQueryInput } from '../validators/inventoryValidators';
import { AppError } from '../middleware/errorHandler';
import {
  PaginationInfo,
  ProductInventoryMetrics,
  ReorderRecommendation,
} from '../types';

export interface PaginatedInventory {
  items: ProductInventoryMetrics[];
  summary: {
    totalProducts: number;
    healthyCount: number;
    lowStockCount: number;
    reorderRecommendedCount: number;
    criticalCount: number;
    stockOutRiskCount: number;
  };
  pagination: PaginationInfo;
}

export interface ProductInventoryDetail {
  product: any;
  metrics: ProductInventoryMetrics;
  recommendation: ReorderRecommendation;
  recentEvents: IInventoryEvent[];
  recentSales: any[];
  pendingPurchases: any[];
}

export class InventoryService {
  /**
   * Get searchable, filterable, and paginated inventory with real-time calculated statuses
   */
  async getInventoryList(query: InventoryQueryInput): Promise<PaginatedInventory> {
    const filter: Record<string, any> = { status: 'active' };

    if (query.search) {
      const searchRegex = new RegExp(query.search.trim(), 'i');
      filter.$or = [{ name: searchRegex }, { sku: searchRegex }];
    }

    if (query.category) {
      filter.category = query.category;
    }

    // Retrieve matching products
    const products = await Product.find(filter).populate('supplier', 'name leadTimeDays');

    // Compute live inventory metrics for all matching products
    const allMetrics: ProductInventoryMetrics[] = await Promise.all(
      products.map((product) =>
        inventoryCalculationService.computeProductInventoryMetrics(product)
      )
    );

    // Compute summary counts across all active items
    const summary = {
      totalProducts: allMetrics.length,
      healthyCount: allMetrics.filter((m) => m.status === 'Healthy').length,
      lowStockCount: allMetrics.filter((m) => m.status === 'Low Stock').length,
      reorderRecommendedCount: allMetrics.filter((m) => m.status === 'Reorder Recommended').length,
      criticalCount: allMetrics.filter((m) => m.status === 'Critical').length,
      stockOutRiskCount: allMetrics.filter((m) => m.status === 'Stock-out Risk').length,
    };

    // Filter by calculated status or risk level if specified
    let filteredMetrics = allMetrics;
    if (query.status) {
      filteredMetrics = filteredMetrics.filter((m) => m.status === query.status);
    }
    if (query.riskLevel) {
      filteredMetrics = filteredMetrics.filter((m) => m.stockRisk.riskLevel === query.riskLevel);
    }

    // Sort in memory based on sort field
    const sortField = (query.sort || 'currentStock') as keyof ProductInventoryMetrics;
    const sortOrder = query.order === 'desc' ? -1 : 1;

    filteredMetrics.sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];
      if (typeof valA === 'number' && typeof valB === 'number') {
        return (valA - valB) * sortOrder;
      }
      return String(valA).localeCompare(String(valB)) * sortOrder;
    });

    // Pagination
    const page = query.page || 1;
    const limit = query.limit || 10;
    const total = filteredMetrics.length;
    const skip = (page - 1) * limit;
    const items = filteredMetrics.slice(skip, skip + limit);
    const pages = Math.ceil(total / limit) || 1;

    return {
      items,
      summary,
      pagination: {
        page,
        limit,
        total,
        pages,
      },
    };
  }

  /**
   * Get active inventory alerts (products requiring immediate or upcoming action)
   */
  async getInventoryAlerts(): Promise<ProductInventoryMetrics[]> {
    const products = await Product.find({ status: 'active' }).populate('supplier', 'name leadTimeDays');

    const metrics = await Promise.all(
      products.map((p) => inventoryCalculationService.computeProductInventoryMetrics(p))
    );

    // Filter to items needing attention
    const alertItems = metrics.filter((m) => m.status !== 'Healthy');

    // Sort by risk priority: CRITICAL > HIGH > MEDIUM > LOW
    const riskPriority: Record<string, number> = {
      CRITICAL: 4,
      HIGH: 3,
      MEDIUM: 2,
      LOW: 1,
    };

    alertItems.sort(
      (a, b) =>
        (riskPriority[b.stockRisk.riskLevel] || 0) - (riskPriority[a.stockRisk.riskLevel] || 0) ||
        a.daysUntilStockOut - b.daysUntilStockOut
    );

    return alertItems;
  }

  /**
   * Get detailed product inventory analysis with calculations and audit history
   */
  async getProductInventoryDetail(productId: string): Promise<ProductInventoryDetail> {
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      throw new AppError('Invalid product ID format.', 400);
    }

    const product = await Product.findById(productId).populate('supplier');
    if (!product) {
      throw new AppError('Product not found.', 404);
    }

    const metrics = await inventoryCalculationService.computeProductInventoryMetrics(product);
    const recommendation = inventoryCalculationService.generateReorderRecommendation(metrics);

    const [recentEvents, recentSales, pendingPurchases] = await Promise.all([
      InventoryEvent.find({ product: productId })
        .populate('createdBy', 'name email role')
        .sort({ timestamp: -1 })
        .limit(20),
      Sale.find({ product: productId })
        .populate('createdBy', 'name')
        .sort({ date: -1 })
        .limit(10),
      Purchase.find({ product: productId, status: 'pending' })
        .populate('supplier', 'name leadTimeDays')
        .sort({ date: -1 }),
    ]);

    return {
      product,
      metrics,
      recommendation,
      recentEvents,
      recentSales,
      pendingPurchases,
    };
  }

  /**
   * Manually adjust product stock level and log inventory audit event
   */
  async adjustStock(
    userId: string,
    input: AdjustStockInput
  ): Promise<{ product: any; metrics: ProductInventoryMetrics; event: IInventoryEvent }> {
    const product = await Product.findById(input.productId);
    if (!product) {
      throw new AppError('Product not found.', 404);
    }

    const previousStock = product.currentStock;
    const newStock = input.newStock;
    const difference = newStock - previousStock;

    if (difference === 0) {
      throw new AppError('New stock is identical to current stock. No adjustment needed.', 400);
    }

    // Update product stock
    product.currentStock = newStock;
    await product.save();

    // Create InventoryEvent log
    const event = await InventoryEvent.create({
      product: product._id,
      type: 'ADJUSTMENT',
      quantity: difference,
      previousStock,
      newStock,
      reference: input.reason,
      createdBy: new mongoose.Types.ObjectId(userId),
      timestamp: new Date(),
    });

    const metrics = await inventoryCalculationService.computeProductInventoryMetrics(product);

    return {
      product,
      metrics,
      event,
    };
  }
}

export const inventoryService = new InventoryService();
