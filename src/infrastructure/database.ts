import mongoose from 'mongoose';

export const connectDB = async (): Promise<void> => {
  try {
    const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/device-entry';
    const user = process.env.MONGO_USER;
    const pass = process.env.MONGO_PWD;
    const options: mongoose.ConnectOptions = {
      authSource: 'admin'
    };
    if (user) options.user = user;
    if (pass) options.pass = pass;
    
    await mongoose.connect(mongoURI, options);
    console.log('MongoDB Connected...');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
};
