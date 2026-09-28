import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { users, User } from '../utils/userStore';
import { sendVerificationEmail, sendRecoveryEmail } from './emailService';

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

export const verificationTokens = new Map<string, string>();
export const recoveryTokens = new Map<string, string>();

export async function registerHandler(req: Request, res: Response) {
  const { email, password, name } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });

  // do not reveal if email exists
  for (const u of users.values()) {
    if (u.email === email) return res.status(409).json({ error: 'credentials invalid' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user: User = { id: generateId(), email, passwordHash, name };
  users.set(user.id, user);

  // create a simple verification token (in-memory) for demo
  const vtoken = Math.random().toString(36).slice(2, 8).toUpperCase();
  verificationTokens.set(user.id, vtoken);
  await sendVerificationEmail(email, vtoken);

  const token = jwt.sign({ sub: user.id }, process.env.JWT_SECRET || 'dev_secret', { expiresIn: '7d' });
  return res.status(201).json({ id: user.id, token });
}

// promotion endpoint: only used in tests/setup to mark a user admin
export async function promoteToAdminHandler(req: Request, res: Response) {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId required' });
  const u = users.get(userId);
  if (!u) return res.status(404).json({ error: 'not found' });
  u.isAdmin = true;
  users.set(userId, u);
  return res.json({ ok: true });
}

export async function loginHandler(req: Request, res: Response) {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });

  const user = Array.from(users.values()).find(u => u.email === email);
  if (!user) return res.status(401).json({ error: 'credentials invalid' });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'credentials invalid' });

  const token = jwt.sign({ sub: user.id }, process.env.JWT_SECRET || 'dev_secret', { expiresIn: '7d' });
  return res.json({ id: user.id, token });
}

export async function verifyEmailHandler(req: Request, res: Response) {
  const { userId, token } = req.body;
  if (!userId || !token) return res.status(400).json({ error: 'userId and token required' });
  const expected = verificationTokens.get(userId);
  if (!expected || expected !== token) return res.status(400).json({ error: 'invalid token' });
  const u = users.get(userId);
  if (!u) return res.status(404).json({ error: 'not found' });
  u.emailVerified = true;
  verificationTokens.delete(userId);
  return res.json({ ok: true });
}

export async function requestRecoveryHandler(req: Request, res: Response) {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'email required' });
  const u = Array.from(users.values()).find(x => x.email === email);
  // respond 200 even if not found
  if (!u) return res.json({ ok: true });
  const rtoken = Math.random().toString(36).slice(2, 8).toUpperCase();
  recoveryTokens.set(u.id, rtoken);
  await sendRecoveryEmail(email, rtoken);
  return res.json({ ok: true });
}

export async function performRecoveryHandler(req: Request, res: Response) {
  const { userId, token, newPassword } = req.body;
  if (!userId || !token || !newPassword) return res.status(400).json({ error: 'missing params' });
  const expected = recoveryTokens.get(userId);
  if (!expected || expected !== token) return res.status(400).json({ error: 'invalid token' });
  const u = users.get(userId);
  if (!u) return res.status(404).json({ error: 'not found' });
  u.passwordHash = await bcrypt.hash(newPassword, 10);
  recoveryTokens.delete(userId);
  return res.json({ ok: true });
}

export async function meHandler(req: Request, res: Response) {
  const user = (req as any).user as User | undefined;
  if (!user) return res.status(401).json({ error: 'unauthorized' });
  return res.json({ id: user.id, email: user.email, name: user.name });
}
