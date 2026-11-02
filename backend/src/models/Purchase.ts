import mongoose, { Document, Schema, Types } from 'mongoose';

export type PurchaseStatus = 'pending' | 'received' | 'cancelled';

export interface IPurchase extends Document {
  product: Types.ObjectId;
  supplier: Types.ObjectId;
  quantity: number;
  unitCost: number;
  totalCost: number;
  date: Date;
  status: PurchaseStatus;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const purchaseSchema = new Schema<IPurchase>(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product is required'],
    },
    supplier: {
      type: Schema.Types.ObjectId,
      ref: 'Supplier',
      required: [true, 'Supplier is required'],
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1'],
    },
    unitCost: {
      type: Number,
      required: [true, 'Unit cost is required'],
      min: [0, 'Unit cost cannot be negative'],
    },
    totalCost: {
      type: Number,
      required: [true, 'Total cost is required'],
      min: [0, 'Total cost cannot be negative'],
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    status: {
      type: String,
      enum: {
        values: ['pending', 'received', 'cancelled'],
        message: 'Status must be pending, received, or cancelled',
      },
      default: 'pending',
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

// Indexes
purchaseSchema.index({ product: 1 });
purchaseSchema.index({ supplier: 1 });
purchaseSchema.index({ status: 1 });
purchaseSchema.index({ date: -1 });
purchaseSchema.index({ product: 1, status: 1 });

const Purchase = mongoose.model<IPurchase>('Purchase', purchaseSchema);

export default Purchase;
