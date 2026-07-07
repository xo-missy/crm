import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const secret = process.env.JWT_SECRET || 'fallback_jwt_secret_key_12345';
    const decoded = jwt.verify(token, secret);

    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({ message: 'User not found or disabled' });
    }

    req.user = user; // Attach user (contains id, companyId, and role)
    next();
  } catch (error) {
    console.error('Auth token verification error:', error);
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
}

export function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
    }

    next();
  };
}
