//Create a User model with fields for username, email, password (hashed)
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../db');

/**
 * Create a new user
 * @param {Object} userData - { username, email, password }
 * @returns {Promise<Object>}
 */
async function createUser(userData) {
    const { username, email, password } = userData;
    
    // Check if user already exists
    const existingUser = await User.findOne({ 
        where: { 
            $or: [{ email }, { username }] 
        } 
    });
    
    if (existingUser) {
        throw new Error('User with this email or username already exists');
    }
    
    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Create user
    const user = await User.create({
        username,
        email,
        password: hashedPassword
    });
    
    // Remove password from response
    const { password: _, ...userWithoutPassword } = user.toJSON();
    return userWithoutPassword;
}

/**
 * Authenticate user login
 * @param {string} email 
 * @param {string} password 
 * @returns {Promise<Object>} - User object and JWT token
 */
async function loginUser(email, password) {
    // Find user by email
    const user = await User.findOne({ where: { email } });
    
    if (!user) {
        throw new Error('Invalid email or password');
    }
    
    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
        throw new Error('Invalid email or password');
    }
    
    // Generate JWT token
    const token = jwt.sign(
        { 
            userId: user.id, 
            email: user.email,
            username: user.username
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
    );
    
    // Remove password from response
    const { password: _, ...userWithoutPassword } = user.toJSON();
    
    return {
        user: userWithoutPassword,
        token
    };
}

/**
 * Get user by ID
 * @param {number} userId 
 * @returns {Promise<Object>}
 */
async function getUserById(userId) {
    const user = await User.findByPk(userId, {
        attributes: { exclude: ['password'] }
    });
    
    if (!user) {
        throw new Error('User not found');
    }
    
    return user;
}

/**
 * Update user profile
 * @param {number} userId 
 * @param {Object} updates 
 * @returns {Promise<Object>}
 */
async function updateUser(userId, updates) {
    const user = await User.findByPk(userId);
    
    if (!user) {
        throw new Error('User not found');
    }
    
    // If password is being updated, hash it
    if (updates.password) {
        const saltRounds = 10;
        updates.password = await bcrypt.hash(updates.password, saltRounds);
    }
    
    await user.update(updates);
    
    // Return user without password
    const { password: _, ...userWithoutPassword } = user.toJSON();
    return userWithoutPassword;
}

/**
 * Delete user
 * @param {number} userId 
 */
async function deleteUser(userId) {
    const user = await User.findByPk(userId);
    
    if (!user) {
        throw new Error('User not found');
    }
    
    await user.destroy();
}

module.exports = {
    createUser,
    loginUser,
    getUserById,
    updateUser,
    deleteUser
};
