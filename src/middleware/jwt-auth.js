import AuthService from '../auth/auth-service.js';

export async function requireAuth(req, res, next) {
  const authHeader = req.get('Authorization') || '';

  if (!authHeader.toLowerCase().startsWith('bearer ')) {
    return res.status(401).json({ error: 'Missing bearer token' });
  }
  const token = authHeader.slice('bearer '.length);

  try {
    const payload = AuthService.verifyJwt(token);
    const user = await AuthService.getUserById(req.app.get('db'), payload.id);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized request' });
    }
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized request' });
  }
}
