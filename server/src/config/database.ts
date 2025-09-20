import mongoose from 'mongoose';

const connectDB = async (): Promise<void> => {
  try {
    // Check if MongoDB URI is provided
    const mongoURI = process.env.MONGODB_URI;
    
    if (!mongoURI) {
      console.log('⚠️  No MONGODB_URI found. Running in memory-only mode for development.');
      console.log('📝 To use MongoDB, set MONGODB_URI environment variable');
      console.log('🔗 Example: MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/planning-poker');
      return;
    }

    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      heartbeatFrequencyMS: 2000, // Check connection every 2s
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('📡 MongoDB disconnected');
    });

    // Graceful close on app termination
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('💤 MongoDB connection closed through app termination');
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ MongoDB connection failed:', (error as Error).message);
    console.log('⚠️  Falling back to memory-only mode for development');
    console.log('📝 To fix this, check your MONGODB_URI environment variable');
  }
};

export default connectDB;
