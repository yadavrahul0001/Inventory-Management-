import axios, { AxiosInstance } from 'axios';
import config from '../config';
import { Sale } from '../models';

/**
 * ML Service client — communicates with the Python FastAPI ML microservice.
 *
 * The Node backend acts as a gateway: it fetches historical sales from MongoDB,
 * sends them to the ML service, and returns the results to the frontend.
 */

export interface MLModelStatus {
  model_loaded: boolean;
  model_version: string | null;
  feature_columns: string[];
  metrics: Record<string, number>;
  num_products: number | null;
  product_ids: string[];
}

export interface MLForecastResult {
  product_id: string;
  forecast_days: number;
  predictions: number[];
  total_predicted_demand: number;
  model_version: string;
  is_fallback: boolean;
  fallback_reason?: string;
}

export interface MLTrainResult {
  success: boolean;
  model_version: string;
  metrics: {
    mae: number;
    rmse: number;
    mape: number;
  };
  message: string;
}

export interface MLHealthStatus {
  status: string;
  service: string;
  model_loaded: boolean;
  model_version: string | null;
}

class MLClientService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: config.mlServiceUrl,
      timeout: 120000, // 2 minutes — training can take time
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Check ML service health.
   */
  async getHealth(): Promise<MLHealthStatus> {
    const response = await this.client.get<MLHealthStatus>('/health');
    return response.data;
  }

  /**
   * Get current model status and metadata.
   */
  async getModelStatus(): Promise<MLModelStatus> {
    const response = await this.client.get<MLModelStatus>('/model/status');
    return response.data;
  }

  /**
   * Trigger model training.
   * Optionally sends historical sales data from MongoDB to the ML service.
   */
  async triggerTraining(salesData?: Array<Record<string, unknown>>): Promise<MLTrainResult> {
    const payload: Record<string, unknown> = {};

    if (salesData && salesData.length > 0) {
      payload.sales_data = salesData;
    }

    const response = await this.client.post<MLTrainResult>('/train', payload);
    return response.data;
  }

  /**
   * Get demand forecast for a product.
   *
   * 1. Fetches historical sales data from MongoDB for the product.
   * 2. Sends the history to the ML service's /forecast endpoint.
   * 3. Returns the prediction results.
   */
  async getForecast(
    productId: string,
    forecastDays: number = 7
  ): Promise<MLForecastResult> {
    // Fetch historical sales from MongoDB
    const historicalSales = await this.fetchHistoricalSales(productId);

    const payload = {
      product_id: productId,
      forecast_days: forecastDays,
      historical_sales: historicalSales,
    };

    const response = await this.client.post<MLForecastResult>('/forecast', payload);
    return response.data;
  }

  /**
   * Fetch historical sales data from MongoDB for a given product.
   * Formats it as the ML service expects: { date, product_id, quantity, price }.
   */
  private async fetchHistoricalSales(
    productId: string
  ): Promise<Array<{ date: string; product_id: string; quantity: number; price: number }>> {
    const sales = await Sale.find({})
      .populate('product')
      .sort({ saleDate: 1 })
      .lean();

    // Filter and format sales for the given product
    const formatted = sales
      .filter((sale: any) => {
        const product = sale.product;
        if (!product) return false;
        // Match by product _id string or sku
        return (
          product._id?.toString() === productId ||
          product.sku === productId
        );
      })
      .map((sale: any) => ({
        date: new Date(sale.date || sale.createdAt).toISOString().split('T')[0],
        product_id: productId,
        quantity: sale.quantity,
        price: sale.unitPrice || (sale.quantity > 0 ? sale.totalAmount / sale.quantity : 0),
      }));

    return formatted;
  }

  /**
   * Check if the ML service is reachable.
   */
  async isAvailable(): Promise<boolean> {
    try {
      await this.client.get('/health', { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }
}

export const mlClientService = new MLClientService();
