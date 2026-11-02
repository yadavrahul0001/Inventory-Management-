import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ISale extends Document {
  product: Types.ObjectId;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  customer: string;
  date: Date;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const saleSchema = new Schema<ISale>(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product is required'],
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1'],
    },
    unitPrice: {
      type: Number,
      required: [true, 'Unit price is required'],
      min: [0, 'Unit price cannot be negative'],
    },
    totalAmount: {
      type: Number,
      required: [true, 'Total amount is required'],
      min: [0, 'Total amount cannot be negative'],
    },
    customer: {
      type: String,
      trim: true,
      default: 'Walk-in Customer',
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Created by is required'],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for analytics and filtering
saleSchema.index({ product: 1 });
saleSchema.index({ date: -1 });
saleSchema.index({ createdBy: 1 });
saleSchema.index({ product: 1, date: -1 });
saleSchema.index({ date: -1, product: 1 });

const Sale = mongoose.model<ISale>('Sale', saleSchema);

export default Sale;
