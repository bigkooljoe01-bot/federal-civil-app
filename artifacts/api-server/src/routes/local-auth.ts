import { Router, type IRouter, type Request, type Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { db, usersTable, sessionsTable } from '@workspace/db';
import { eq } from 'drizzle-orm';
import { clearSession, createSession, getSessionId, SESSION_COOKIE, SESSION_TTL } from '../lib/auth';

const router: IRouter = Router();

function setSessionCookie(res: Response, sid: string) {
  res.cookie(SESSION_COOKIE, sid, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL,
  });
}

// POST /api/auth/register
router.post('/auth/register', async (req: Request, res: Response) => {
  const { username, password } = req.body || {};

  if (!username || typeof username !== 'string' || username.trim().length < 3) {
    res.status(400).json({ error: 'Username must be at least 3 characters' });
    return;
  }
  if (!password || typeof password !== 'string' || password.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters' });
    return;
  }

  const { email } = req.body || {};
  const clean = username.trim().toLowerCase();
  const emailClean = typeof email === 'string' && email.trim() ? email.trim().toLowerCase() : null;

  // Validate email format if provided
  if (emailClean && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailClean)) {
    res.status(400).json({ error: 'Please enter a valid email address' });
    return;
  }

  // Check if username taken
  const [existing] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.username, clean));

  if (existing) {
    res.status(409).json({ error: 'Username already taken' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const replitId = `local:${clean}`;

  const [user] = await db
    .insert(usersTable)
    .values({ replitId, username: clean, passwordHash, email: emailClean, role: 'student' })
    .returning();

  const sid = await createSession({
    user: { id: user.replitId, email: null, firstName: null, lastName: null, profileImageUrl: null },
    access_token: '',
  });

  setSessionCookie(res, sid);
  res.json({ user: { id: user.id, username: user.username, role: user.role } });
});

// POST /api/auth/login
router.post('/auth/login', async (req: Request, res: Response) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    res.status(400).json({ error: 'Username and password are required' });
    return;
  }

  const clean = username.trim().toLowerCase();

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, clean));

  if (!user || !user.passwordHash) {
    res.status(401).json({ error: 'Invalid username or password' });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: 'Invalid username or password' });
    return;
  }

  const sid = await createSession({
    user: { id: user.replitId, email: user.email, firstName: user.firstName, lastName: user.lastName, profileImageUrl: user.profileImageUrl },
    access_token: '',
  });

  setSessionCookie(res, sid);
  res.json({ user: { id: user.id, username: user.username, role: user.role } });
});

// POST /api/auth/logout
router.post('/auth/logout', async (req: Request, res: Response) => {
  const sid = getSessionId(req);
  await clearSession(res, sid);
  res.json({ success: true });
});

export default router;
