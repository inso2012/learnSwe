const express = require('express');
const cors = require('cors');
const { sequelize, Word,User } = require('./db'); 
const wordApi = require('./routes/wordApi');    
const userApi = require('./routes/userApi');
const progressApi = require('./routes/progressApi');
const learningApi = require('./routes/learningApi');
const alternativesApi = require('./routes/alternativesApi');

const app = express();
const PORT = process.env.PORT || 3000;
const path = require('path');

// Middleware
app.use(cors()); // Enable CORS for frontend communication
app.use(express.json());
app.use('/api/words', wordApi);
app.use('/api/users', userApi);
app.use('/api/progress', progressApi);
app.use('/api/learning', learningApi);
app.use('/api/learning', alternativesApi);
//server frontend from backend
app.use(express.static(path.join(__dirname, '../frontend')));

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ 
        success: true, 
        message: 'Server is running',
        timestamp: new Date().toISOString(),
        endpoints: {
            words: '/api/words',
            users: '/api/users', 
            progress: '/api/progress'
        }
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
        await sequelize.sync({ alter: true });
        console.log('Database synchronized and tables created.');

        // Start the server only after the DB is ready
        app.listen(PORT, () => {
            console.log(`🚀 Swedish Learning API running on port ${PORT}`);
            console.log(`📊 Health check: http://localhost:${PORT}/health`);
            console.log(`📚 Words API: http://localhost:${PORT}/api/words`);
            console.log(`👤 Users API: http://localhost:${PORT}/api/users`);
            console.log(`📈 Progress API: http://localhost:${PORT}/api/progress`);
            console.log(`🎓 Learning API: http://localhost:${PORT}/api/learning`);
        });
    } catch (error) {
        console.error('Failed to connect to the database or sync tables:', error);
        // You might want to exit the process if the DB connection fails
        process.exit(1); 
    }
};

// Call the function to start the application
startServer();