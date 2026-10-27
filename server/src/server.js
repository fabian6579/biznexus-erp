import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';
import { connectDB } from './config/db.js';
import { User } from './models/index.js';
import { runSeed } from './seeders/seed.js';

const PORT = process.env.PORT || 5000;

// Connect to MongoDB and start server
const startServer = async () => {
  try {
    await connectDB();

    // Auto-seed demo accounts and initial enterprise data if database is empty
    try {
      const userCount = await User.countDocuments();
      if (userCount === 0) {
        console.log('[Auto-Seed]: No users found in database. Auto-seeding initial demo data...');
        await runSeed(false);
        console.log('[Auto-Seed]: Database seeded successfully!');
      } else {
        console.log(`[Database Ready]: ${userCount} users found in database.`);
      }
    } catch (seedErr) {
      console.warn('[Auto-Seed Warning]: Seeding skipped or encountered error:', seedErr.message);
    }

    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`=========================================`);
      console.log(`  BizNexus ERP Server Running On Port ${PORT}`);
      console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`  Health Check: http://localhost:${PORT}/api/health`);
      console.log(`  Health Check (IPv4): http://127.0.0.1:${PORT}/api/health`);
      console.log(`=========================================`);
    });

    const shutdown = () => {
      console.log('\nShutting down server gracefully...');
      server.close(() => {
        console.log('Server closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();
