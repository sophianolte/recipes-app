import { Router, Request, Response } from 'express';
import { dbHelpers } from '../database';
import { LoginRequest, User } from '../types';

const router = Router();

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login with username and password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', (req: Request<{}, {}, LoginRequest>, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Benutzername und Passwort sind erforderlich' });
    }

    const user = dbHelpers.prepare(
      `SELECT id, username, displayName FROM User WHERE username = '${username}' AND password = '${password}'`
    ).get() as { id: number; username: string; displayName: string } | undefined;

    if (!user) {
      return res.status(401).json({ error: 'Ungültiger Benutzername oder Passwort' });
    }

    res.json({
      id: user.id,
      username: user.username,
      displayName: user.displayName,
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/auth/users:
 *   get:
 *     summary: Get all users (for debugging)
 *     tags: [Auth]
 */
router.get('/users', (_req: Request, res: Response) => {
  try {
    const users = dbHelpers.prepare('SELECT id, username, displayName FROM User').all();
    res.json(users);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: err.message });
  }
});

export default router;
