import mongoose, { Document, Schema, Types } from 'mongoose';

export type InventoryEventType = 'SALE' | 'PURCHASE' | 'ADJUSTMENT' | 'RETURN' | 'INITIAL_STOCK';

export interface IInventoryEvent extends Document {
  product: Types.ObjectId;
  type: InventoryEventType;
  quantity: number;
  previousStock: number;
  newStock: number;
  reference: string;
  createdBy: Types.ObjectId;
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

const inventoryEventSchema = new Schema<IInventoryEvent>(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product is required'],
    },
    type: {
      type: String,
      enum: {
        values: ['SALE', 'PURCHASE', 'ADJUSTMENT', 'RETURN', 'INITIAL_STOCK'],
        message: 'Invalid event type',
      },
      required: [true, 'Event type is required'],
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
    },
    previousStock: {
      type: Number,
      required: [true, 'Previous stock is required'],
    },
    newStock: {
      type: Number,
      required: [true, 'New stock is required'],
    },
    reference: {
      type: String,
      trim: true,
      default: '',
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Created by is required'],
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for event history queries
inventoryEventSchema.index({ product: 1, timestamp: -1 });
inventoryEventSchema.index({ type: 1 });
inventoryEventSchema.index({ timestamp: -1 });

const InventoryEvent = mongoose.model<IInventoryEvent>('InventoryEvent', inventoryEventSchema);

export default InventoryEvent;
