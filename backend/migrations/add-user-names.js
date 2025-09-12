/**
 * Migration script to add firstName, lastName, and registrationDate columns
 * to existing users table safely
 */

const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config();

// Database connection
const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASS,
    {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        dialect: 'postgres',
        logging: console.log
    }
);

async function migrate() {
    try {
        console.log('Starting migration: Adding firstName, lastName, and registrationDate columns...');

        // Connect to database
        await sequelize.authenticate();
        console.log('Connected to database successfully.');

        const queryInterface = sequelize.getQueryInterface();

        // Check if columns already exist
        const tableDescription = await queryInterface.describeTable('users');
        
        // Add firstName column if it doesn't exist
        if (!tableDescription.firstName) {
            console.log('Adding firstName column...');
            await queryInterface.addColumn('users', 'firstName', {
                type: DataTypes.STRING,
                allowNull: true, // Allow null initially
                validate: {
                    len: [1, 50]
                }
            });
        }

        // Add lastName column if it doesn't exist
        if (!tableDescription.lastName) {
            console.log('Adding lastName column...');
            await queryInterface.addColumn('users', 'lastName', {
                type: DataTypes.STRING,
                allowNull: true, // Allow null initially
                validate: {
                    len: [1, 50]
                }
            });
        }

        // Add registrationDate column if it doesn't exist
        if (!tableDescription.registrationDate) {
            console.log('Adding registrationDate column...');
            await queryInterface.addColumn('users', 'registrationDate', {
                type: DataTypes.DATEONLY,
                allowNull: true, // Allow null initially
                defaultValue: DataTypes.NOW
            });
        }

        // Update existing users with default values
        console.log('Updating existing users with default values...');
        
        await sequelize.query(`
            UPDATE users 
            SET 
                "firstName" = COALESCE("firstName", 'User'),
                "lastName" = COALESCE("lastName", SPLIT_PART(username, '@', 1)),
                "registrationDate" = COALESCE("registrationDate", "createdAt"::date)
            WHERE "firstName" IS NULL OR "lastName" IS NULL OR "registrationDate" IS NULL
        `);

        // Now make the columns NOT NULL
        console.log('Making columns NOT NULL...');
        
        if (tableDescription.firstName && tableDescription.firstName.allowNull !== false) {
            await queryInterface.changeColumn('users', 'firstName', {
                type: DataTypes.STRING,
                allowNull: false,
                validate: {
                    len: [1, 50],
                    is: /^[a-zA-Z\s'-]+$/i
                }
            });
        }

        if (tableDescription.lastName && tableDescription.lastName.allowNull !== false) {
            await queryInterface.changeColumn('users', 'lastName', {
                type: DataTypes.STRING,
                allowNull: false,
                validate: {
                    len: [1, 50],
                    is: /^[a-zA-Z\s'-]+$/i
                }
            });
        }

        if (tableDescription.registrationDate && tableDescription.registrationDate.allowNull !== false) {
            await queryInterface.changeColumn('users', 'registrationDate', {
                type: DataTypes.DATEONLY,
                allowNull: false,
                defaultValue: DataTypes.NOW
            });
        }

        console.log('Migration completed successfully!');
        console.log('All existing users now have firstName, lastName, and registrationDate values.');

        // Show updated users
        const [results] = await sequelize.query(`
            SELECT id, username, "firstName", "lastName", "registrationDate", "createdAt"
            FROM users 
            ORDER BY id
        `);
        
        console.log('\nUpdated users:');
        console.table(results);

    } catch (error) {
        console.error('Migration failed:', error);
        throw error;
    } finally {
        await sequelize.close();
    }
}

// Run migration if called directly
if (require.main === module) {
    migrate()
        .then(() => {
            console.log('Migration script completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Migration script failed:', error);
            process.exit(1);
        });
}

module.exports = { migrate };