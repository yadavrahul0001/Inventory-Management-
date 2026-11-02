import dotenv from 'dotenv';

dotenv.config();

interface Config {
  port: number;
  mongoUri: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  mlServiceUrl: string;
  nodeEnv: string;
  corsOrigin: string;
}

const config: Config = {
  port: parseInt(process.env.PORT || '5000', 10),
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/inventory-ai',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  mlServiceUrl: process.env.ML_SERVICE_URL || 'http://localhost:8000',
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
};

export default config;
