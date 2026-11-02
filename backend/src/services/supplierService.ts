import mongoose, { FilterQuery } from 'mongoose';
import Supplier, { ISupplier } from '../models/Supplier';
import Product from '../models/Product';
import {
  CreateSupplierInput,
  SupplierQueryInput,
  UpdateSupplierInput,
} from '../validators/supplierValidators';
import { AppError } from '../middleware/errorHandler';
import { PaginationInfo } from '../types';

export interface PaginatedSuppliers {
  suppliers: ISupplier[];
  pagination: PaginationInfo;
}

export class SupplierService {
  async createSupplier(input: CreateSupplierInput): Promise<ISupplier> {
    const existingSupplier = await Supplier.findOne({
      email: input.email.toLowerCase(),
    });
    if (existingSupplier) {
      throw new AppError(
        `A supplier with email '${input.email}' already exists.`,
        409
      );
    }

    const supplier = await Supplier.create({
      ...input,
      email: input.email.toLowerCase(),
    });

    return supplier;
  }

  async getSuppliers(query: SupplierQueryInput): Promise<PaginatedSuppliers> {
    const filter: FilterQuery<ISupplier> = {};

    if (query.search) {
      const searchRegex = new RegExp(query.search.trim(), 'i');
      filter.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
        { address: searchRegex },
      ];
    }

    if (query.status) {
      filter.status = query.status;
    }

    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const sortField = query.sort || 'createdAt';
    const sortOrder = query.order === 'asc' ? 1 : -1;
    const sortOptions: Record<string, 1 | -1> = { [sortField]: sortOrder };

    const [suppliers, total] = await Promise.all([
      Supplier.find(filter).sort(sortOptions).skip(skip).limit(limit),
      Supplier.countDocuments(filter),
    ]);

    const pages = Math.ceil(total / limit) || 1;

    return {
      suppliers,
      pagination: {
        page,
        limit,
        total,
        pages,
      },
    };
  }

  async getSupplierById(id: string): Promise<{ supplier: ISupplier; productsCount: number }> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid supplier ID format.', 400);
    }

    const supplier = await Supplier.findById(id);
    if (!supplier) {
      throw new AppError('Supplier not found.', 404);
    }

    const productsCount = await Product.countDocuments({ supplier: id });

    return { supplier, productsCount };
  }

  async updateSupplier(id: string, input: UpdateSupplierInput): Promise<ISupplier> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid supplier ID format.', 400);
    }

    const supplier = await Supplier.findById(id);
    if (!supplier) {
      throw new AppError('Supplier not found.', 404);
    }

    if (input.email && input.email.toLowerCase() !== supplier.email) {
      const existing = await Supplier.findOne({
        email: input.email.toLowerCase(),
        _id: { $ne: id },
      });
      if (existing) {
        throw new AppError(
          `A supplier with email '${input.email}' already exists.`,
          409
        );
      }
    }

    const updated = await Supplier.findByIdAndUpdate(
      id,
      {
        ...input,
        ...(input.email ? { email: input.email.toLowerCase() } : {}),
      },
      { new: true, runValidators: true }
    );

    return updated as ISupplier;
  }

  async deleteSupplier(id: string): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid supplier ID format.', 400);
    }

    const supplier = await Supplier.findById(id);
    if (!supplier) {
      throw new AppError('Supplier not found.', 404);
    }

    const linkedProductsCount = await Product.countDocuments({ supplier: id });
    if (linkedProductsCount > 0) {
      throw new AppError(
        `Cannot delete supplier '${supplier.name}' because ${linkedProductsCount} product(s) are associated with it. Please reassign or delete these products first.`,
        400
      );
    }

    await Supplier.findByIdAndDelete(id);
  }
}

export const supplierService = new SupplierService();
