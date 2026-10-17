import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';

dotenv.config();

export function createApp(env: Record<string, any> = process.env) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'atria-tcg-backend', database: env.DATABASE_URL ? 'configured' : 'memory-fallback' });
  });

  app.use('/api/auth', authRoutes);
  return app;
}

const app = createApp();

const port = process.env.PORT || 3333;
if (require.main === module) {
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

export default app;
