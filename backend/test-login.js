const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function testLogin() {
  const testEmail = 'sumpter32@gmail.com';
  const testPassword = process.argv[2]; // Pass password as command line argument
  
  if (!testPassword) {
    console.log('Please provide the password as an argument: node test-login.js "your-password"');
    return;
  }

  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    console.log('Connected to database:', process.env.DB_NAME);

    // Get user
    const [users] = await connection.execute(
      'SELECT * FROM users WHERE email = ?',
      [testEmail]
    );

    if (users.length === 0) {
      console.log('User not found!');
      return;
    }

    const user = users[0];
    console.log('\nUser found:');
    console.log('- Email:', user.email);
    console.log('- Name:', user.name);
    console.log('- Role:', user.role);
    console.log('- Password hash:', user.password_hash);

    // Test password
    console.log('\nTesting password...');
    const isValid = await bcrypt.compare(testPassword, user.password_hash);
    console.log('Password valid:', isValid);

    // Also test with bcryptjs hash function
    const testHash = await bcrypt.hash(testPassword, 10);
    console.log('\nNew hash for same password:', testHash);

    await connection.end();
  } catch (error) {
    console.error('Error:', error);
  }
}

testLogin();