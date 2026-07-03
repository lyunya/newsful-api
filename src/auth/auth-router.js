import express from 'express';
import AuthService from './auth-service.js';
import { authRateLimit } from '../middleware/rate-limit.js';

const authRouter = express.Router();

authRouter.post('/login', authRateLimit, async (req, res) => {
  const { email, password } = req.body ?? {};

  for (const [field, value] of Object.entries({ email, password })) {
    if (!value) {
      return res.status(400).json({ error: `Missing '${field}' in request body` });
    }
  }

  const db = req.app.get('db');
  const user = await AuthService.getUserWithEmail(db, email);
  const passwordMatches = user
    ? await AuthService.comparePasswords(password, user.password)
    : false;

  if (!user || !passwordMatches) {
    return res.status(401).json({ error: 'Incorrect email or password' });
  }

  res.json({
    authToken: AuthService.createJwt(user),
    user: { id: user.id, email: user.email },
    // Legacy field kept for older clients
    userId: user.id,
  });
});

export default authRouter;
