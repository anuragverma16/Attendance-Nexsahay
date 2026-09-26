import cors from 'cors';
import express from 'express';
import { isOriginAllowed } from './config/cors.js';
import routes from './routes/index.js';

const app = express();

// Trust proxy for better performance
app.set('trust proxy', 1);

// CORS with optimized settings
app.use(
  cors({
    origin(origin, callback) {
      if (isOriginAllowed(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    credentials: true,
    maxAge: 86400, // Cache CORS preflight for 24 hours
  })
);

// Optimized JSON parsing with size limit
app.use(express.json({ limit: '1mb' }));

// Request timing middleware
app.use((req, res, next) => {
  req.startTime = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - req.startTime;
    if (duration > 100) {
      console.log(`[${req.method}] ${req.path} - ${duration}ms`);
    }
  });
  next();
});

app.use('/api', routes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

export default app;
