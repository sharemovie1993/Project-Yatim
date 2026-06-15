const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'mustahiq_secret_key_2026';

function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  
  if (!authHeader) {
    return res.status(401).json({ success: false, error: 'Access denied. No authorization header provided.' });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ success: false, error: 'Access denied. Token format must be Bearer <token>.' });
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    
    // Automatically force the active tenant ID from the authenticated user token
    // This blocks any tenant spoofing attempts
    req.headers['x-tenant-id'] = decoded.tenant_id;
    
    next();
  } catch (error) {
    console.error('[JWT Middleware Error]', error.message);
    res.status(403).json({ success: false, error: 'Invalid or expired token.' });
  }
}

module.exports = verifyToken;
