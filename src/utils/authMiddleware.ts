import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { users } from '../utils/userStore';

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'unauthorized' });
  const token = auth.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret') as any;
    const user = users.get(payload.sub);
    if (!user) return res.status(401).json({ error: 'unauthorized' });
    (req as any).user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'unauthorized' });
  }
}
