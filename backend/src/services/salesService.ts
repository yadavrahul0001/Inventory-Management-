import mongoose, { FilterQuery } from 'mongoose';
import Sale, { ISale } from '../models/Sale';
import Product from '../models/Product';
import InventoryEvent from '../models/InventoryEvent';
import { inventoryCalculationService } from './inventoryCalculationService';
import { CreateSaleInput, SalesQueryInput } from '../validators/salesValidators';
import { AppError } from '../middleware/errorHandler';
import { PaginationInfo, ProductInventoryMetrics } from '../types';

export interface CreateSaleResult {
  sale: ISale;
  updatedStock: number;
  inventoryMetrics: ProductInventoryMetrics;
}

export interface PaginatedSales {
  sales: ISale[];
  summary: {
    totalSalesCount: number;
    totalQuantitySold: number;
    totalRevenue: number;
  };
  pagination: PaginationInfo;
}

export class SalesService {
  /**
   * Process a sale with atomic stock reduction, audit event logging, and real-time inventory recalculation
   */
  async createSale(userId: string, input: CreateSaleInput): Promise<CreateSaleResult> {
    const product = await Product.findById(input.product);
    if (!product) {
      throw new AppError('Product not found.', 404);
    }

    if (product.status === 'discontinued') {
      throw new AppError(
        `Product '${product.name}' is discontinued and cannot be sold.`,
        400
      );
    }

    if (product.currentStock < input.quantity) {
      throw new AppError(
        `Insufficient stock for '${product.name}'. Available: ${product.currentStock}, requested: ${input.quantity}.`,
        400
      );
    }

    // Atomically decrement stock ensuring currentStock >= requested quantity (concurrency-safe)
    const updatedProduct = await Product.findOneAndUpdate(
      {
        _id: product._id,
        currentStock: { $gte: input.quantity },
      },
      {
        $inc: { currentStock: -input.quantity },
      },
      { new: true }
    );

    if (!updatedProduct) {
      throw new AppError(
        `Unable to complete sale: insufficient stock for '${product.name}'. Stock may have been modified concurrently.`,
        400
      );
    }

    const unitPrice = typeof input.unitPrice === 'number' ? input.unitPrice : product.sellingPrice;
    const totalAmount = Number((input.quantity * unitPrice).toFixed(2));
    const saleDate = input.date || new Date();

    // Create Sale record
    const sale = await Sale.create({
      product: product._id,
      quantity: input.quantity,
      unitPrice,
      totalAmount,
      customer: input.customer || 'Walk-in Customer',
      date: saleDate,
      createdBy: new mongoose.Types.ObjectId(userId),
    });

    // Create InventoryEvent log for audit trail
    await InventoryEvent.create({
      product: product._id,
      type: 'SALE',
      quantity: -input.quantity,
      previousStock: product.currentStock,
      newStock: updatedProduct.currentStock,
      reference: `Sale #${sale._id}`,
      createdBy: new mongoose.Types.ObjectId(userId),
      timestamp: saleDate,
    });

    // Recalculate inventory metrics and stock-out risk
    const inventoryMetrics = await inventoryCalculationService.computeProductInventoryMetrics(
      updatedProduct
    );

    const populatedSale = await Sale.findById(sale._id)
      .populate('product', 'name sku category sellingPrice')
      .populate('createdBy', 'name email role');

    return {
      sale: populatedSale as ISale,
      updatedStock: updatedProduct.currentStock,
      inventoryMetrics,
    };
  }

  /**
   * Get paginated sales with search, date range filtering, and revenue aggregation
   */
  async getSales(query: SalesQueryInput): Promise<PaginatedSales> {
    const filter: FilterQuery<ISale> = {};

    if (query.product) {
      filter.product = new mongoose.Types.ObjectId(query.product);
    }

    if (query.customer) {
      filter.customer = new RegExp(query.customer.trim(), 'i');
    }

    if (query.startDate || query.endDate) {
      filter.date = {};
      if (query.startDate) {
        filter.date.$gte = query.startDate;
      }
      if (query.endDate) {
        // Include end of the specified day
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        filter.date.$lte = end;
      }
    }

    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const sortField = query.sort || 'date';
    const sortOrder = query.order === 'asc' ? 1 : -1;
    const sortOptions: Record<string, 1 | -1> = { [sortField]: sortOrder };

    const [sales, total, aggregateSummary] = await Promise.all([
      Sale.find(filter)
        .populate('product', 'name sku category sellingPrice')
        .populate('createdBy', 'name email role')
        .sort(sortOptions)
        .skip(skip)
        .limit(limit),
      Sale.countDocuments(filter),
      Sale.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            totalQuantitySold: { $sum: '$quantity' },
            totalRevenue: { $sum: '$totalAmount' },
          },
        },
      ]),
    ]);

    const pages = Math.ceil(total / limit) || 1;
    const totalQuantitySold = aggregateSummary[0]?.totalQuantitySold || 0;
    const totalRevenue = Number((aggregateSummary[0]?.totalRevenue || 0).toFixed(2));

    return {
      sales,
      summary: {
        totalSalesCount: total,
        totalQuantitySold,
        totalRevenue,
      },
      pagination: {
        page,
        limit,
        total,
        pages,
      },
    };
  }

  /**
   * Get single sale by ID with populated details
   */
  async getSaleById(id: string): Promise<ISale> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid sale ID format.', 400);
    }

    const sale = await Sale.findById(id)
      .populate('product', 'name sku category sellingPrice')
      .populate('createdBy', 'name email role');

    if (!sale) {
      throw new AppError('Sale record not found.', 404);
    }

    return sale;
  }
}

export const salesService = new SalesService();
