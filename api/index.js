import app from '../server/src/app.js';
import { connectDB } from '../server/src/config/db.js';

export default async function handler(req, res) {
  try {
    await connectDB();
  } catch (error) {
    console.warn('Initial serverless DB connection deferred:', error.message);
  }
  return app(req, res);
}
