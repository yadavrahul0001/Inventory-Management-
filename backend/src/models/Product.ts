import mongoose, { Document, Schema, Types } from 'mongoose';

export type ProductStatus = 'active' | 'inactive' | 'discontinued';
export type ProductUnit = 'pieces' | 'kg' | 'liters' | 'meters' | 'boxes' | 'pairs';

export interface IProduct extends Document {
  name: string;
  sku: string;
  category: string;
  supplier: Types.ObjectId;
  description: string;
  costPrice: number;
  sellingPrice: number;
  currentStock: number;
  minimumStock: number;
  reorderLevel: number;
  leadTimeDays: number;
  unit: ProductUnit;
  status: ProductStatus;
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<IProduct>(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      maxlength: [200, 'Product name cannot exceed 200 characters'],
    },
    sku: {
      type: String,
      required: [true, 'SKU is required'],
      unique: true,
      trim: true,
      uppercase: true,
      maxlength: [50, 'SKU cannot exceed 50 characters'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
    },
    supplier: {
      type: Schema.Types.ObjectId,
      ref: 'Supplier',
      required: [true, 'Supplier is required'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    costPrice: {
      type: Number,
      required: [true, 'Cost price is required'],
      min: [0, 'Cost price cannot be negative'],
    },
    sellingPrice: {
      type: Number,
      required: [true, 'Selling price is required'],
      min: [0, 'Selling price cannot be negative'],
    },
    currentStock: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Stock cannot be negative'],
    },
    minimumStock: {
      type: Number,
      required: true,
      default: 10,
      min: [0, 'Minimum stock cannot be negative'],
    },
    reorderLevel: {
      type: Number,
      required: true,
      default: 20,
      min: [0, 'Reorder level cannot be negative'],
    },
    leadTimeDays: {
      type: Number,
      required: true,
      default: 7,
      min: [0, 'Lead time cannot be negative'],
    },
    unit: {
      type: String,
      enum: {
        values: ['pieces', 'kg', 'liters', 'meters', 'boxes', 'pairs'],
        message: 'Invalid unit type',
      },
      default: 'pieces',
    },
    status: {
      type: String,
      enum: {
        values: ['active', 'inactive', 'discontinued'],
        message: 'Status must be active, inactive, or discontinued',
      },
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for search and filtering performance
productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ category: 1 });
productSchema.index({ supplier: 1 });
productSchema.index({ status: 1 });
productSchema.index({ currentStock: 1 });
productSchema.index({ category: 1, status: 1 });

const Product = mongoose.model<IProduct>('Product', productSchema);

export default Product;
