const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function resetPassword() {
  const email = 'sumpter32@gmail.com';
  const newPassword = 'admin123'; // Temporary password
  
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    console.log('Connected to database:', process.env.DB_NAME);

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    console.log('New password hash:', hashedPassword);

    // Update the user's password
    const [result] = await connection.execute(
      'UPDATE users SET password_hash = ? WHERE email = ?',
      [hashedPassword, email]
    );

    if (result.affectedRows > 0) {
      console.log('\nPassword reset successful!');
      console.log('Email:', email);
      console.log('New password:', newPassword);
      console.log('\nYou can now login with these credentials.');
    } else {
      console.log('User not found!');
    }

    await connection.end();
  } catch (error) {
    console.error('Error:', error);
  }
}

resetPassword();