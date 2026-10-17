import bcrypt from 'bcryptjs';
import { query, pool } from '../config/db.js';

async function seedDevPasswords() {
  console.log('Seeding secure development passwords for fellowship accounts...');
  try {
    const salt = await bcrypt.genSalt(10);
    const adminHash = await bcrypt.hash('Admin@123', salt);
    const leaderHash = await bcrypt.hash('Leader@123', salt);

    await query(`UPDATE fellowship_accounts SET password_hash = $1 WHERE username = 'admin_samuel'`, [adminHash]);
    await query(`UPDATE fellowship_accounts SET password_hash = $1 WHERE username IN ('leader_ruth', 'leader_daniel')`, [leaderHash]);

    console.log('Successfully set development passwords:');
    console.log('  Admin:   username="admin_samuel" password="Admin@123"');
    console.log('  Leader:  username="leader_ruth"  password="Leader@123"');
    console.log('  Leader:  username="leader_daniel" password="Leader@123"');
  } catch (err) {
    console.error('Error seeding development passwords:', err);
  } finally {
    await pool.end();
  }
}

seedDevPasswords();
