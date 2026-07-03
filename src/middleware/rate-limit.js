import { rateLimit } from 'express-rate-limit';
import config from '../config.js';

// Slows down credential stuffing / brute force on login and signup.
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: () => config.NODE_ENV === 'test',
  message: { error: 'Too many attempts, please try again later' },
});
