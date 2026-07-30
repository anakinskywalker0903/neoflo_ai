import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import activityRoutes from './routes/activityRoutes.js';
import db from './db/database.js';
import { seedDatabase } from './db/seed.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS & JSON parsing (with increased limit for screenshot payloads)
app.use(cors());
app.use(express.json({ limit: '15mb' }));

// API Routes
app.use('/api', activityRoutes);

// Healthcheck route
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'VisionPulse AI Backend',
    timestamp: new Date().toISOString()
  });
});

// Serve frontend static build if available
const publicPath = path.join(__dirname, '../public');
app.use(express.static(publicPath));

app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Endpoint not found' });
  const indexPath = path.join(publicPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.send(`
      <!DOCTYPE html>
      <html>
        <head><title>VisionPulse AI API Server</title></head>
        <body style="font-family: sans-serif; background: #0f172a; color: #f8fafc; padding: 2rem; text-align: center;">
          <h1>🚀 VisionPulse Visual AI Agent Server</h1>
          <p>Backend API is active on port <code>${PORT}</code></p>
          <p>Access API endpoints at <a href="/api/activities" style="color: #38bdf8;">/api/activities</a> or launch the Chrome Extension / Dashboard UI.</p>
        </body>
      </html>
    `);
  }
});

// Auto-seed if database is brand new
const count = db.prepare('SELECT COUNT(*) as count FROM activities').get().count;
if (count === 0) {
  seedDatabase();
}

app.listen(PORT, () => {
  console.log(`=================================================`);
  console.log(`👁️  VisionPulse Visual AI Agent Backend Running`);
  console.log(`🌐 Server URL: http://localhost:${PORT}`);
  console.log(`=================================================`);
});
