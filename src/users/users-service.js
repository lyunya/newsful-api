import bcrypt from 'bcryptjs';

const UPPER_LOWER_NUMBER_SPECIAL = /(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&])\S+/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const UsersService = {
  hasUserWithEmail(db, email) {
    return db('newsful_users')
      .whereRaw('lower(email) = lower(?)', [email])
      .first()
      .then((user) => Boolean(user));
  },
  insertUser(db, newUser) {
    return db('newsful_users')
      .insert(newUser)
      .returning(['id', 'email'])
      .then(([user]) => user);
  },
  validateEmail(email) {
    if (!EMAIL_PATTERN.test(email)) return 'Invalid email address';
    if (email.length > 254) return 'Email address is too long';
    return null;
  },
  validatePassword(password) {
    if (password.length < 8) {
      return 'Password must be 8 or more characters';
    }
    if (password.length > 72) {
      return 'Password must be less than 72 characters';
    }
    if (password.startsWith(' ') || password.endsWith(' ')) {
      return 'Password must not start or end with empty spaces';
    }
    if (!UPPER_LOWER_NUMBER_SPECIAL.test(password)) {
      return 'Password must contain 1 upper case, lower case, number and special character';
    }
    return null;
  },
  hashPassword(password) {
    return bcrypt.hash(password, 12);
  },
};

export default UsersService;
