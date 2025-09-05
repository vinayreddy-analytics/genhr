// server.js - FULL VERSION WITH ALL ROUTES
import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import cors from 'cors';
import candidateRoutes from './routes/candidate.js';
import recruiterRoutes from './routes/recruiter.js';
import authRoutes from './routes/auth.js';

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/test', (req, res) => {
  res.json({ 
    message: 'Backend is working!',
    database: mongoose.connection.name || 'Not connected',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/candidates', candidateRoutes);
app.use('/api/recruiters', recruiterRoutes);
app.use('/api/auth', authRoutes);

// Database connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'genhr';
const fullMongoUri = `${MONGO_URI}/${DB_NAME}`;

console.log('🔗 Connecting to unified genhr database...');
console.log(`   URI: ${fullMongoUri}`);

mongoose.connect(fullMongoUri, {
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  maxPoolSize: 10,
  minPoolSize: 1,
  maxIdleTimeMS: 30000,
})
.then(() => {
  console.log('✅ Connected to MongoDB successfully!');
  console.log(`   Database: ${mongoose.connection.name}`);
  
  mongoose.connection.db.listCollections().toArray()
    .then(collections => {
      console.log('📋 Available collections:');
      collections.forEach(col => console.log(`   - ${col.name}`));
    });
  
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`   Ready for unified database operations!`);
  });
})
.catch((error) => {
  console.error('❌ MongoDB connection error:', error.message);
  process.exit(1);
});

// Error handling
app.use((error, req, res, next) => {
  console.error('🚨 Error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});