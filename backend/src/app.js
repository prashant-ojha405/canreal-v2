// backend/src/app.js
import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cookieParser from 'cookie-parser';
import cors from 'cors';

import homeRoute from './routes/home-route.js';
import subjectRoute from './routes/subject-route.js';
import authRoutes from './routes/auth-route.js';
import uploadRoute from './routes/document-route.js';
import dashboardRoutes from './routes/dashboardRoute-route.js';
import courseRoutes from './routes/course-route.js';
import reportRoutes from './routes/report-route.js';

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URL = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/canreal';


mongoose
  .connect(MONGO_URL)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch((err) => console.error('❌ MongoDB connection error:', err));

app.use(
  cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true, // Allows browser to send/receive httpOnly JWT cookies
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// API Routes
app.use('/', homeRoute);
app.use('/subjects', subjectRoute);
app.use('/auth', authRoutes);
app.use('/documents', uploadRoute);
app.use('/dashboard', dashboardRoutes);
app.use('/courses', courseRoutes);
app.use('/reports', reportRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err.message);

  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size exceeds the allowed limit.',
      });
    }
    return res.status(400).json({
      success: false,
      message: `File upload error: ${err.message}`,
    });
  }

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server is listening on port: ${PORT}`);
});