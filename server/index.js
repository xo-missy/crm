import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';

// Import routes
import authRoutes from './routes/auth.js';
import contactRoutes from './routes/contacts.js';
import dealRoutes from './routes/deals.js';
import ticketRoutes from './routes/tickets.js';
import companyRoutes from './routes/company.js';
import notificationRoutes from './routes/notifications.js';
import aiRoutes from './routes/ai.js';
import dashboardRoutes from './routes/dashboard.js';

const app = express();
const PORT = process.env.PORT || 5000;
const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/multi-tenant-crm';

// Middlewares
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

// Logger middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Database connection
mongoose.connect(mongoURI)
  .then(() => console.log('MongoDB successfully connected'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/deals', dealRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/company', companyRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Base route for connectivity check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong on the server', error: err.message });
});

// Start listening
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
