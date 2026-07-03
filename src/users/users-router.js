import express from 'express';
import UsersService from './users-service.js';
import AuthService from '../auth/auth-service.js';
import { authRateLimit } from '../middleware/rate-limit.js';

const usersRouter = express.Router();

// Register. Responds with an auth token so new users are logged in
// immediately — no separate login step.
usersRouter.post('/', authRateLimit, async (req, res) => {
  const { email, password } = req.body ?? {};

  for (const [field, value] of Object.entries({ email, password })) {
    if (!value) {
      return res.status(400).json({ error: `Missing '${field}' in request body` });
    }
  }

  const validationError =
    UsersService.validateEmail(email) || UsersService.validatePassword(password);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const db = req.app.get('db');
  if (await UsersService.hasUserWithEmail(db, email)) {
    return res.status(409).json({ error: 'Email already taken' });
  }

  const user = await UsersService.insertUser(db, {
    email,
    password: await UsersService.hashPassword(password),
  });

  res.status(201).json({
    authToken: AuthService.createJwt(user),
    user,
  });
});

export default usersRouter;
