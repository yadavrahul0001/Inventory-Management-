import mongoose, { FilterQuery } from 'mongoose';
import Purchase, { IPurchase } from '../models/Purchase';
import Product from '../models/Product';
import Supplier from '../models/Supplier';
import InventoryEvent from '../models/InventoryEvent';
import { inventoryCalculationService } from './inventoryCalculationService';
import {
  CreatePurchaseInput,
  PurchaseQueryInput,
  UpdatePurchaseInput,
} from '../validators/purchaseValidators';
import { AppError } from '../middleware/errorHandler';
import { PaginationInfo, ProductInventoryMetrics } from '../types';

export interface UpdatePurchaseResult {
  purchase: IPurchase;
  updatedStock?: number;
  inventoryMetrics?: ProductInventoryMetrics;
}

export interface PaginatedPurchases {
  purchases: IPurchase[];
  summary: {
    totalPurchasesCount: number;
    totalQuantityOrdered: number;
    totalCost: number;
    pendingCount: number;
    receivedCount: number;
  };
  pagination: PaginationInfo;
}

export class PurchaseService {
  /**
   * Create a new purchase order in pending status
   */
  async createPurchase(userId: string, input: CreatePurchaseInput): Promise<IPurchase> {
    const product = await Product.findById(input.product);
    if (!product) {
      throw new AppError('Product not found.', 404);
    }

    const supplierId = input.supplier || product.supplier;
    const supplier = await Supplier.findById(supplierId);
    if (!supplier) {
      throw new AppError('Supplier not found.', 404);
    }

    const unitCost = typeof input.unitCost === 'number' ? input.unitCost : product.costPrice;
    const totalCost = Number((input.quantity * unitCost).toFixed(2));
    const purchaseDate = input.date || new Date();

    const purchase = await Purchase.create({
      product: product._id,
      supplier: supplier._id,
      quantity: input.quantity,
      unitCost,
      totalCost,
      status: 'pending',
      date: purchaseDate,
      createdBy: new mongoose.Types.ObjectId(userId),
    });

    const populated = await Purchase.findById(purchase._id)
      .populate('product', 'name sku currentStock costPrice unit')
      .populate('supplier', 'name email phone leadTimeDays')
      .populate('createdBy', 'name email role');

    return populated as IPurchase;
  }

  /**
   * Update purchase order status (receiving order replenishes product stock with audit logging)
   */
  async updatePurchase(
    id: string,
    userId: string,
    input: UpdatePurchaseInput
  ): Promise<UpdatePurchaseResult> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid purchase ID format.', 400);
    }

    const purchase = await Purchase.findById(id);
    if (!purchase) {
      throw new AppError('Purchase order not found.', 404);
    }

    // Handle transition to RECEIVED
    if (input.status === 'received') {
      if (purchase.status === 'received') {
        throw new AppError(
          'Duplicate receipt prevented: this purchase order has already been marked as received.',
          400
        );
      }

      if (purchase.status === 'cancelled') {
        throw new AppError(
          'Cannot receive a purchase order that has been cancelled.',
          400
        );
      }

      const product = await Product.findById(purchase.product);
      if (!product) {
        throw new AppError('Associated product no longer exists.', 404);
      }

      const previousStock = product.currentStock;
      const newStock = previousStock + purchase.quantity;

      // Atomically increment stock
      const updatedProduct = await Product.findByIdAndUpdate(
        product._id,
        { $inc: { currentStock: purchase.quantity } },
        { new: true }
      );

      // Create InventoryEvent log
      await InventoryEvent.create({
        product: product._id,
        type: 'PURCHASE',
        quantity: purchase.quantity,
        previousStock,
        newStock,
        reference: `Received PO #${purchase._id}`,
        createdBy: new mongoose.Types.ObjectId(userId),
        timestamp: new Date(),
      });

      // Update purchase status
      purchase.status = 'received';
      await purchase.save();

      // Recalculate inventory metrics
      const inventoryMetrics = await inventoryCalculationService.computeProductInventoryMetrics(
        updatedProduct!
      );

      const populated = await Purchase.findById(purchase._id)
        .populate('product', 'name sku currentStock costPrice unit')
        .populate('supplier', 'name email phone leadTimeDays')
        .populate('createdBy', 'name email role');

      return {
        purchase: populated as IPurchase,
        updatedStock: updatedProduct!.currentStock,
        inventoryMetrics,
      };
    }

    // Handle transition to CANCELLED
    if (input.status === 'cancelled') {
      if (purchase.status === 'received') {
        throw new AppError(
          'Cannot cancel a purchase order that has already been received into inventory.',
          400
        );
      }
      purchase.status = 'cancelled';
    }

    // Handle quantity/cost changes if still pending
    if (purchase.status === 'pending') {
      if (typeof input.quantity === 'number') {
        purchase.quantity = input.quantity;
      }
      if (typeof input.unitCost === 'number') {
        purchase.unitCost = input.unitCost;
      }
      purchase.totalCost = Number((purchase.quantity * purchase.unitCost).toFixed(2));
    }

    await purchase.save();

    const populated = await Purchase.findById(purchase._id)
      .populate('product', 'name sku currentStock costPrice unit')
      .populate('supplier', 'name email phone leadTimeDays')
      .populate('createdBy', 'name email role');

    return {
      purchase: populated as IPurchase,
    };
  }

  /**
   * Get paginated purchases with filtering and summary
   */
  async getPurchases(query: PurchaseQueryInput): Promise<PaginatedPurchases> {
    const filter: FilterQuery<IPurchase> = {};

    if (query.product) {
      filter.product = new mongoose.Types.ObjectId(query.product);
    }

    if (query.supplier) {
      filter.supplier = new mongoose.Types.ObjectId(query.supplier);
    }

    if (query.status) {
      filter.status = query.status;
    }

    if (query.startDate || query.endDate) {
      filter.date = {};
      if (query.startDate) {
        filter.date.$gte = query.startDate;
      }
      if (query.endDate) {
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

    const [purchases, total, aggregateSummary, pendingCount, receivedCount] =
      await Promise.all([
        Purchase.find(filter)
          .populate('product', 'name sku currentStock costPrice unit')
          .populate('supplier', 'name email phone leadTimeDays')
          .populate('createdBy', 'name email role')
          .sort(sortOptions)
          .skip(skip)
          .limit(limit),
        Purchase.countDocuments(filter),
        Purchase.aggregate([
          { $match: filter },
          {
            $group: {
              _id: null,
              totalQuantityOrdered: { $sum: '$quantity' },
              totalCost: { $sum: '$totalCost' },
            },
          },
        ]),
        Purchase.countDocuments({ ...filter, status: 'pending' }),
        Purchase.countDocuments({ ...filter, status: 'received' }),
      ]);

    const pages = Math.ceil(total / limit) || 1;
    const totalQuantityOrdered = aggregateSummary[0]?.totalQuantityOrdered || 0;
    const totalCost = Number((aggregateSummary[0]?.totalCost || 0).toFixed(2));

    return {
      purchases,
      summary: {
        totalPurchasesCount: total,
        totalQuantityOrdered,
        totalCost,
        pendingCount,
        receivedCount,
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
   * Get single purchase by ID
   */
  async getPurchaseById(id: string): Promise<IPurchase> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid purchase ID format.', 400);
    }

    const purchase = await Purchase.findById(id)
      .populate('product', 'name sku currentStock costPrice unit')
      .populate('supplier', 'name email phone leadTimeDays')
      .populate('createdBy', 'name email role');

    if (!purchase) {
      throw new AppError('Purchase order not found.', 404);
    }

    return purchase;
  }
}

export const purchaseService = new PurchaseService();
