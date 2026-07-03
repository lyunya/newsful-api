import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import config from '../config.js';

const AuthService = {
  getUserWithEmail(db, email) {
    return db('newsful_users').whereRaw('lower(email) = lower(?)', [email]).first();
  },
  getUserById(db, id) {
    return db('newsful_users').where({ id }).first();
  },
  comparePasswords(password, hash) {
    return bcrypt.compare(password, hash);
  },
  createJwt(user) {
    return jwt.sign({ id: user.id }, config.JWT_SECRET, {
      subject: user.email,
      expiresIn: config.JWT_EXPIRY,
      algorithm: 'HS256',
    });
  },
  verifyJwt(token) {
    return jwt.verify(token, config.JWT_SECRET, { algorithms: ['HS256'] });
  },
};

export default AuthService;
