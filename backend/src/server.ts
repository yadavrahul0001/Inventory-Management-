import mongoose from 'mongoose';
import app from './app';
import config from './config';

const startServer = async (): Promise<void> => {
  try {
    // Connect to MongoDB
    await mongoose.connect(config.mongoUri);
    console.log('✅ Connected to MongoDB');

    // Start server
    app.listen(config.port, () => {
      console.log(`🚀 Server running on port ${config.port}`);
      console.log(`📊 Environment: ${config.nodeEnv}`);
      console.log(`🤖 ML Service URL: ${config.mlServiceUrl}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: Error) => {
  console.error('Unhandled Rejection:', err.message);
  process.exit(1);
});

startServer();
