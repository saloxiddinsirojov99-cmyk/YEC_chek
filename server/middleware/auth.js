const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'yec_gilam_secret_key_123';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Tizimga kirish talab qilinadi.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Yaroqsiz token.' });
    }
    req.user = user;
    next();
  });
}

function requireRole(roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Tizimga kirish talab qilinadi.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Ushbu amal uchun huquqingiz yetarli emas.' });
    }
    next();
  };
}

module.exports = {
  authenticateToken,
  requireRole,
  JWT_SECRET
};
