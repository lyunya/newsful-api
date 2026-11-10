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
    if (typeof value !== 'string') {
      return res.status(400).json({ error: `'${field}' must be a string` });
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

  let user;
  try {
    user = await UsersService.insertUser(db, {
      email,
      password: await UsersService.hashPassword(password),
    });
  } catch (error) {
    // Two sign-ups for the same email raced past the check above.
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Email already taken' });
    }
    throw error;
  }

  res.status(201).json({
    authToken: AuthService.createJwt(user),
    user,
  });
});

export default usersRouter;
