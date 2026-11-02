import mongoose from 'mongoose';
import Sale from '../models/Sale';
import Product from '../models/Product';
import { SalesAnomaly } from '../types';

export interface AnomalyQueryOptions {
  productId?: string;
  threshold?: number;
  windowDays?: number;
}

export class AnomalyService {
  /**
   * Detect sales anomalies using transparent statistical methods:
   * Rolling Mean, Standard Deviation, and Z-Score (|z| >= threshold).
   */
  async detectAnomalies(options: AnomalyQueryOptions = {}): Promise<SalesAnomaly[]> {
    const threshold = options.threshold || 2.0;
    const windowDays = Math.min(Math.max(options.windowDays || 60, 7), 180);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - windowDays);
    startDate.setHours(0, 0, 0, 0);

    // Filter products
    const productQuery: any = { status: 'active' };
    if (options.productId) {
      if (mongoose.Types.ObjectId.isValid(options.productId)) {
        productQuery._id = new mongoose.Types.ObjectId(options.productId);
      } else {
        productQuery.sku = options.productId;
      }
    }

    const products = await Product.find(productQuery).limit(50);
    const anomalies: SalesAnomaly[] = [];

    for (const product of products) {
      // 1. Aggregate daily sales for this product
      const dailySalesAgg = await Sale.aggregate([
        {
          $match: {
            product: product._id,
            date: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
            dailyQuantity: { $sum: '$quantity' },
            totalAmount: { $sum: '$totalAmount' },
            orderCount: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      if (dailySalesAgg.length < 5) {
        // Insufficient sales points to establish a statistical baseline
        continue;
      }

      // Map existing days
      const salesMap = new Map<string, { quantity: number; totalAmount: number }>();
      for (const item of dailySalesAgg) {
        salesMap.set(item._id, {
          quantity: item.dailyQuantity,
          totalAmount: item.totalAmount,
        });
      }

      // Build continuous daily timeline
      const dailyTimeline: Array<{ date: string; quantity: number; totalAmount: number }> = [];
      const cursor = new Date(startDate);
      const today = new Date();

      while (cursor <= today) {
        const key = cursor.toISOString().split('T')[0];
        const record = salesMap.get(key) || { quantity: 0, totalAmount: 0 };
        dailyTimeline.push({ date: key, ...record });
        cursor.setDate(cursor.getDate() + 1);
      }

      // Compute sample mean and standard deviation
      const quantities = dailyTimeline.map((d) => d.quantity);
      const totalUnits = quantities.reduce((sum, q) => sum + q, 0);
      const mean = totalUnits / quantities.length;

      const variance =
        quantities.reduce((sum, q) => sum + Math.pow(q - mean, 2), 0) / quantities.length;
      const stdDev = Math.sqrt(variance);

      if (stdDev === 0) continue;

      // 2. Identify Volume Anomalies (Spikes & Drops)
      for (const day of dailyTimeline) {
        // Only evaluate non-zero days or significant drop days
        if (day.quantity === 0 && mean < 5) continue;

        const zScore = Number(((day.quantity - mean) / stdDev).toFixed(2));

        if (zScore >= threshold) {
          anomalies.push({
            id: `anomaly-spike-${product._id}-${day.date}`,
            date: day.date,
            productId: product._id.toString(),
            productName: product.name,
            sku: product.sku,
            quantity: day.quantity,
            expectedMean: Number(mean.toFixed(1)),
            standardDeviation: Number(stdDev.toFixed(2)),
            zScore,
            anomalyType: 'SPIKE',
            severity: zScore >= 3.0 ? 'high' : 'medium',
            unitPrice: product.sellingPrice,
            totalAmount: day.totalAmount || day.quantity * product.sellingPrice,
          });
        } else if (zScore <= -threshold && mean >= 5) {
          anomalies.push({
            id: `anomaly-drop-${product._id}-${day.date}`,
            date: day.date,
            productId: product._id.toString(),
            productName: product.name,
            sku: product.sku,
            quantity: day.quantity,
            expectedMean: Number(mean.toFixed(1)),
            standardDeviation: Number(stdDev.toFixed(2)),
            zScore,
            anomalyType: 'DROP',
            severity: zScore <= -3.0 ? 'high' : 'medium',
            unitPrice: product.sellingPrice,
            totalAmount: day.totalAmount,
          });
        }
      }

      // 3. Identify Price Anomalies on recent transactions
      const recentSales = await Sale.find({
        product: product._id,
        date: { $gte: startDate },
      })
        .sort({ date: -1 })
        .limit(20);

      for (const sale of recentSales) {
        if (product.sellingPrice > 0) {
          const priceRatio = sale.unitPrice / product.sellingPrice;
          if (priceRatio > 1.5 || priceRatio < 0.5) {
            anomalies.push({
              id: `anomaly-price-${sale._id}`,
              date: new Date(sale.date).toISOString().split('T')[0],
              productId: product._id.toString(),
              productName: product.name,
              sku: product.sku,
              quantity: sale.quantity,
              expectedMean: product.sellingPrice,
              standardDeviation: Number((product.sellingPrice * 0.2).toFixed(2)),
              zScore: Number(((sale.unitPrice - product.sellingPrice) / (product.sellingPrice * 0.2)).toFixed(2)),
              anomalyType: 'UNUSUAL_PRICE',
              severity: 'medium',
              unitPrice: sale.unitPrice,
              totalAmount: sale.totalAmount,
            });
          }
        }
      }
    }

    // Sort by date descending
    return anomalies.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }
}

export const anomalyService = new AnomalyService();
