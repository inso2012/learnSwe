const express = require('express');
const cors = require('cors');
const { sequelize, Word,User } = require('./db'); // Ensure your db.js exports sequelize and models
const wordApi = require('./routes/wordApi');
const userApi = require('./routes/userApi');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Enable CORS for frontend communication
app.use(express.json());
app.use('/api/words', wordApi);
app.use('/api/users', userApi);

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ 
        success: true, 
        message: 'Server is running',
        timestamp: new Date().toISOString()
    });
});

// An async function to connect to the DB and start the server
const startServer = async () => {
    try {
        // Test the database connection
        await sequelize.authenticate();
        console.log('Database connection has been established successfully.');

        // Synchronize all models with the database
        // `force: true` will drop existing tables and recreate them.
        // Use with caution in production. Use `alter: true` for safer migrations.
        await sequelize.sync();
        console.log('Database synchronized and tables created.');

        // Start the server only after the DB is ready
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Failed to connect to the database or sync tables:', error);
        // You might want to exit the process if the DB connection fails
        process.exit(1); 
    }
};

// Call the function to start the application
startServer();