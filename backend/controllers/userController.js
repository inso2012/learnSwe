const { 
    createUser, 
    loginUser, 
    getUserById, 
    updateUser, 
    deleteUser 
} = require('../models/User');

/**
 * Register a new user
 */
async function register(req, res) {
    try {
        const { firstName, lastName, username, email, password } = req.body;
        
        // Basic validation
        if (!firstName || !lastName || !username || !email || !password) {
            return res.status(400).json({
                success: false,
                error: 'First name, last name, username, email, and password are required'
            });
        }
        
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                error: 'Password must be at least 6 characters long'
            });
        }
        
        const user = await createUser({ firstName, lastName, username, email, password });
        
        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: user
        });
        
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
}

/**
 * Login user
 */
async function login(req, res) {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Email and password are required'
            });
        }
        
        const result = await loginUser(email, password);
        
        res.status(200).json({
            success: true,
            message: 'Login successful',
            data: result
        });
        
    } catch (error) {
        res.status(401).json({
            success: false,
            error: error.message
        });
    }
}

/**
 * Get current user profile
 */
async function getProfile(req, res) {
    try {
        const user = await getUserById(req.userId);
        
        res.status(200).json({
            success: true,
            data: user
        });
        
    } catch (error) {
        res.status(404).json({
            success: false,
            error: error.message
        });
    }
}

/**
 * Update user profile
 */
async function updateProfile(req, res) {
    try {
        const updates = req.body;
        
        // Don't allow updating email through this endpoint for security
        delete updates.email;
        
        const user = await updateUser(req.userId, updates);
        
        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            data: user
        });
        
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
}

/**
 * Delete user account
 */
async function deleteAccount(req, res) {
    try {
        await deleteUser(req.userId);
        
        res.status(200).json({
            success: true,
            message: 'Account deleted successfully'
        });
        
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
}

module.exports = {
    register,
    login,
    getProfile,
    updateProfile,
    deleteAccount
};