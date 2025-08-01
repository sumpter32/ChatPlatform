const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function createAdmin() {
  try {
    // Connect to database
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME
    });

    console.log('Connected to database');

    // Check if admin already exists
    const [existingUsers] = await connection.execute(
      'SELECT id, email, role FROM users WHERE role = ? LIMIT 5',
      ['admin']
    );

    if (existingUsers.length > 0) {
      console.log('\nExisting admin users:');
      existingUsers.forEach(user => {
        console.log(`- ID: ${user.id}, Email: ${user.email}`);
      });
      console.log('\nTo reset password for an existing admin, use: node reset-password.js');
    }

    // Create new admin
    const adminEmail = 'admin@chatplatform.local';
    const adminPassword = 'admin123!';
    const adminName = 'Administrator';

    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    try {
      await connection.execute(
        'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
        [adminName, adminEmail, hashedPassword, 'admin']
      );

      console.log('\n✅ New admin user created successfully!');
      console.log('📧 Email:', adminEmail);
      console.log('🔑 Password:', adminPassword);
      console.log('\n⚠️  Please change this password after logging in!');
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        console.log('\n⚠️  Admin user with this email already exists');
        console.log('Use the reset-password.js script to reset the password');
      } else {
        throw error;
      }
    }

    await connection.end();
  } catch (error) {
    console.error('Error creating admin:', error.message);
  }
}

createAdmin();