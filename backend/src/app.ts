import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import config from './config';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/authRoutes';
import productRoutes from './routes/productRoutes';
import supplierRoutes from './routes/supplierRoutes';
import inventoryRoutes from './routes/inventoryRoutes';
import salesRoutes from './routes/salesRoutes';
import purchaseRoutes from './routes/purchaseRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import mlRoutes from './routes/mlRoutes';
import forecastRoutes from './routes/forecastRoutes';
import insightsRoutes from './routes/insightsRoutes';
import anomalyRoutes from './routes/anomalyRoutes';

const app = express();

// Middleware
app.use(cors({
  origin: config.corsOrigin,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

if (config.nodeEnv === 'development') {
  app.use(morgan('dev'));
}

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    data: {
      status: 'OK',
      service: 'inventory-ai-backend',
      timestamp: new Date().toISOString(),
    },
  });
});

// Mounted Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/ml', mlRoutes);
app.use('/api/forecast', forecastRoutes);
app.use('/api/insights', insightsRoutes);
app.use('/api/anomalies', anomalyRoutes);

// Error handling
app.use(errorHandler);

export default app;
