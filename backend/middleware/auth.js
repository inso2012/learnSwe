const jwt = require('jsonwebtoken');

/**
 * Middleware to authenticate JWT tokens
 */
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
        return res.status(401).json({
            success: false,
            error: 'Access token is required'
        });
    }
    
    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
        if (err) {
            return res.status(403).json({
                success: false,
                error: 'Invalid or expired token'
            });
        }
        
        // Add user info to request object
        req.userId = user.userId;
        req.userEmail = user.email;
        req.username = user.username;
        
        next();
    });
}

/**
 * Optional authentication - doesn't fail if no token provided
 */
function optionalAuth(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (token) {
        jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
            if (!err) {
                req.userId = user.userId;
                req.userEmail = user.email;
                req.username = user.username;
            }
        });
    }
    
    next();
}

module.exports = {
    authenticateToken,
    optionalAuth
};