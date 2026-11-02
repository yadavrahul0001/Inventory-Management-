import mongoose, { Document, Schema } from 'mongoose';

export type SupplierStatus = 'active' | 'inactive';

export interface ISupplier extends Document {
  name: string;
  email: string;
  phone: string;
  address: string;
  leadTimeDays: number;
  status: SupplierStatus;
  createdAt: Date;
  updatedAt: Date;
}

const supplierSchema = new Schema<ISupplier>(
  {
    name: {
      type: String,
      required: [true, 'Supplier name is required'],
      trim: true,
      maxlength: [200, 'Supplier name cannot exceed 200 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    address: {
      type: String,
      trim: true,
      default: '',
    },
    leadTimeDays: {
      type: Number,
      required: true,
      default: 7,
      min: [1, 'Lead time must be at least 1 day'],
      max: [365, 'Lead time cannot exceed 365 days'],
    },
    status: {
      type: String,
      enum: {
        values: ['active', 'inactive'],
        message: 'Status must be active or inactive',
      },
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
supplierSchema.index({ name: 'text' });
supplierSchema.index({ status: 1 });

const Supplier = mongoose.model<ISupplier>('Supplier', supplierSchema);

export default Supplier;
