import mongoose from 'mongoose';
import logger from '../utils/logger';

export const connectToDb = async () => {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/virtual-classroom'
    );
    logger.info('Connected to MongoDB');
  } catch (error) {
    logger.error('Database connection failed:', JSON.stringify(error));
    process.exit(1);
  }
};
