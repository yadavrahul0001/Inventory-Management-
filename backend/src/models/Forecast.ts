import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IForecast extends Document {
  product: Types.ObjectId;
  forecastDate: Date;
  predictedDemand: number;
  confidence: number;
  modelVersion: string;
  createdAt: Date;
  updatedAt: Date;
}

const forecastSchema = new Schema<IForecast>(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product is required'],
    },
    forecastDate: {
      type: Date,
      required: [true, 'Forecast date is required'],
    },
    predictedDemand: {
      type: Number,
      required: [true, 'Predicted demand is required'],
      min: [0, 'Predicted demand cannot be negative'],
    },
    confidence: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Confidence cannot be negative'],
      max: [1, 'Confidence cannot exceed 1'],
    },
    modelVersion: {
      type: String,
      required: [true, 'Model version is required'],
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for forecast queries
forecastSchema.index({ product: 1, forecastDate: -1 });
forecastSchema.index({ forecastDate: -1 });
forecastSchema.index({ product: 1, createdAt: -1 });

const Forecast = mongoose.model<IForecast>('Forecast', forecastSchema);

export default Forecast;
