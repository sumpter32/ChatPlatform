const { verifyToken } = require('../utils/auth');

const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }
    
    const decoded = verifyToken(token);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

const requireAdmin = async (req, res, next) => {
  try {
    const { getDB } = require('../db/connection');
    const db = getDB();
    
    const [users] = await db.execute(
      'SELECT role FROM users WHERE id = ?',
      [req.userId]
    );
    
    if (!users.length || users[0].role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    next();
  } catch (error) {
    return res.status(500).json({ message: 'Database error' });
  }
};

module.exports = { authenticate, requireAdmin };