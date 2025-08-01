const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');

async function checkUsers() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    console.log('Connected to database:', process.env.DB_NAME);

    const [users] = await connection.execute('SELECT id, name, email, role FROM users');
    console.log('Users in database:', users);

    if (users.length > 0) {
      console.log('\nUser details:');
      users.forEach(user => {
        console.log(`- ID: ${user.id}, Name: ${user.name}, Email: ${user.email}, Role: ${user.role}`);
      });
    } else {
      console.log('No users found in database!');
    }

    await connection.end();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkUsers();