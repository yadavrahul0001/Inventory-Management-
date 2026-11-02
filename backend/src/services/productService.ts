import mongoose, { FilterQuery } from 'mongoose';
import Product, { IProduct } from '../models/Product';
import Supplier from '../models/Supplier';
import InventoryEvent from '../models/InventoryEvent';
import Sale from '../models/Sale';
import Purchase from '../models/Purchase';
import {
  CreateProductInput,
  ProductQueryInput,
  UpdateProductInput,
} from '../validators/productValidators';
import { AppError } from '../middleware/errorHandler';
import { PaginationInfo } from '../types';

export interface PaginatedProducts {
  products: IProduct[];
  pagination: PaginationInfo;
}

export class ProductService {
  async createProduct(userId: string, input: CreateProductInput): Promise<IProduct> {
    const existingSku = await Product.findOne({ sku: input.sku.toUpperCase() });
    if (existingSku) {
      throw new AppError(`A product with SKU '${input.sku}' already exists.`, 409);
    }

    const supplierExists = await Supplier.findById(input.supplier);
    if (!supplierExists) {
      throw new AppError('The specified supplier does not exist.', 404);
    }

    const product = await Product.create({
      ...input,
      sku: input.sku.toUpperCase(),
      leadTimeDays: input.leadTimeDays || supplierExists.leadTimeDays || 7,
    });

    // Record INITIAL_STOCK inventory event if stock is initialized > 0
    if (product.currentStock > 0) {
      await InventoryEvent.create({
        product: product._id,
        type: 'INITIAL_STOCK',
        quantity: product.currentStock,
        previousStock: 0,
        newStock: product.currentStock,
        reference: 'Initial product stock creation',
        createdBy: new mongoose.Types.ObjectId(userId),
        timestamp: new Date(),
      });
    }

    return (await Product.findById(product._id).populate('supplier')) as IProduct;
  }

  async getProducts(query: ProductQueryInput): Promise<PaginatedProducts> {
    const filter: FilterQuery<IProduct> = {};

    // Search query
    if (query.search) {
      const searchRegex = new RegExp(query.search.trim(), 'i');
      filter.$or = [{ name: searchRegex }, { sku: searchRegex }, { description: searchRegex }];
    }

    // Category filter
    if (query.category) {
      filter.category = query.category;
    }

    // Supplier filter
    if (query.supplier) {
      filter.supplier = new mongoose.Types.ObjectId(query.supplier);
    }

    // Status filter
    if (query.status) {
      filter.status = query.status;
    }

    // Stock filter
    if (query.stockFilter) {
      if (query.stockFilter === 'outOfStock') {
        filter.currentStock = 0;
      } else if (query.stockFilter === 'inStock') {
        filter.currentStock = { $gt: 0 };
      } else if (query.stockFilter === 'lowStock') {
        filter.$expr = { $lte: ['$currentStock', '$minimumStock'] };
      }
    }

    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const sortField = query.sort || 'createdAt';
    const sortOrder = query.order === 'asc' ? 1 : -1;
    const sortOptions: Record<string, 1 | -1> = { [sortField]: sortOrder };

    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate('supplier', 'name email phone leadTimeDays')
        .sort(sortOptions)
        .skip(skip)
        .limit(limit),
      Product.countDocuments(filter),
    ]);

    const pages = Math.ceil(total / limit) || 1;

    return {
      products,
      pagination: {
        page,
        limit,
        total,
        pages,
      },
    };
  }

  async getProductById(id: string): Promise<IProduct> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid product ID format.', 400);
    }

    const product = await Product.findById(id).populate('supplier');
    if (!product) {
      throw new AppError('Product not found.', 404);
    }

    return product;
  }

  async updateProduct(id: string, input: UpdateProductInput): Promise<IProduct> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid product ID format.', 400);
    }

    const product = await Product.findById(id);
    if (!product) {
      throw new AppError('Product not found.', 404);
    }

    if (input.sku && input.sku.toUpperCase() !== product.sku) {
      const existingSku = await Product.findOne({
        sku: input.sku.toUpperCase(),
        _id: { $ne: id },
      });
      if (existingSku) {
        throw new AppError(`A product with SKU '${input.sku}' already exists.`, 409);
      }
    }

    if (input.supplier) {
      const supplierExists = await Supplier.findById(input.supplier);
      if (!supplierExists) {
        throw new AppError('The specified supplier does not exist.', 404);
      }
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      {
        ...input,
        ...(input.sku ? { sku: input.sku.toUpperCase() } : {}),
      },
      { new: true, runValidators: true }
    ).populate('supplier');

    return updatedProduct as IProduct;
  }

  async deleteProduct(id: string): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid product ID format.', 400);
    }

    const product = await Product.findById(id);
    if (!product) {
      throw new AppError('Product not found.', 404);
    }

    // Check if product has sales or purchases
    const [salesCount, purchasesCount] = await Promise.all([
      Sale.countDocuments({ product: id }),
      Purchase.countDocuments({ product: id }),
    ]);

    if (salesCount > 0 || purchasesCount > 0) {
      throw new AppError(
        `Cannot delete product '${product.name}' because it has linked transactions (${salesCount} sales, ${purchasesCount} purchases). Set status to 'discontinued' or 'inactive' instead.`,
        400
      );
    }

    await Product.findByIdAndDelete(id);
  }
}

export const productService = new ProductService();
