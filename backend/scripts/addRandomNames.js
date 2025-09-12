/**
 * Script to add random first and last names to existing users
 */

const { Sequelize } = require('sequelize');
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
        logging: false // Reduce noise
    }
);

// Arrays of random names
const firstNames = [
    // Male names
    'Alexander', 'Erik', 'Lars', 'Magnus', 'Anders', 'Johan', 'Nils', 'Per', 'Olof', 'Gustav',
    'Carl', 'Fredrik', 'Thomas', 'Marcus', 'Daniel', 'Andreas', 'Martin', 'Jonas', 'Henrik', 'Mikael',
    // Female names
    'Emma', 'Anna', 'Maja', 'Alice', 'Julia', 'Linnea', 'Alicia', 'Olivia', 'Astrid', 'Saga',
    'Agnes', 'Freja', 'Elsa', 'Wilma', 'Clara', 'Ebba', 'Nellie', 'Stella', 'Moa', 'Felicia'
];

const lastNames = [
    'Andersson', 'Johansson', 'Karlsson', 'Nilsson', 'Eriksson', 'Larsson', 'Olsson', 'Persson', 'Svensson', 'Gustafsson',
    'Pettersson', 'Jonsson', 'Jansson', 'Hansson', 'Bengtsson', 'Jönsson', 'Lindberg', 'Jakobsson', 'Magnusson', 'Olofsson',
    'Lindström', 'Lindqvist', 'Lindgren', 'Berg', 'Axelsson', 'Bergström', 'Lundberg', 'Lind', 'Lundgren', 'Mattsson',
    'Berglund', 'Fredriksson', 'Sandberg', 'Henriksson', 'Forsberg', 'Sjöberg', 'Wallin', 'Engström', 'Eklund', 'Danielsson'
];

function getRandomName(namesArray) {
    return namesArray[Math.floor(Math.random() * namesArray.length)];
}

async function updateUsersWithRandomNames() {
    try {
        console.log('Connecting to database...');
        await sequelize.authenticate();
        
        // Get all users that need name updates (where firstName is 'User')
        const [users] = await sequelize.query(`
            SELECT id, username, "firstName", "lastName" 
            FROM users 
            WHERE "firstName" = 'User'
            ORDER BY id
        `);

        if (users.length === 0) {
            console.log('No users need name updates.');
            return;
        }

        console.log(`Found ${users.length} users to update with random names:`);
        console.table(users);

        console.log('\nUpdating users with random Swedish names...');

        // Update each user with random names
        for (const user of users) {
            const firstName = getRandomName(firstNames);
            const lastName = getRandomName(lastNames);
            
            await sequelize.query(`
                UPDATE users 
                SET "firstName" = :firstName, "lastName" = :lastName
                WHERE id = :id
            `, {
                replacements: { firstName, lastName, id: user.id }
            });

            console.log(`✅ Updated user ${user.id} (${user.username}): ${firstName} ${lastName}`);
        }

        // Show updated results
        console.log('\n🎉 All users updated! Current user list:');
        const [updatedUsers] = await sequelize.query(`
            SELECT id, username, "firstName", "lastName", "registrationDate"
            FROM users 
            ORDER BY id
        `);
        
        console.table(updatedUsers);

    } catch (error) {
        console.error('❌ Error updating users:', error);
        throw error;
    } finally {
        await sequelize.close();
    }
}

// Run the script if called directly
if (require.main === module) {
    updateUsersWithRandomNames()
        .then(() => {
            console.log('✅ Random names script completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Random names script failed:', error);
            process.exit(1);
        });
}

module.exports = { updateUsersWithRandomNames };