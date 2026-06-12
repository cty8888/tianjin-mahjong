// ---------------------------------------------------------------------------
// Express server entry point for Tianjin Mahjong (天津麻将)
// Task 9 — REST API server with CORS support.
// ---------------------------------------------------------------------------

import express from 'express';
import cors from 'cors';
import path from 'path';
import { createGameRouter } from './routes/game';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

// Middleware
app.use(cors());
app.use(express.json());

// API routes
app.use('/api/games', createGameRouter());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Production: serve client static files
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Start server (only if not in test mode)
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`[tj-mahjong] Server running on http://localhost:${PORT}`);
  });
}

export { app };
