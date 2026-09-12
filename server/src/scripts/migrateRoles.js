require('dotenv').config();
const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
const mongoose = require('mongoose');

async function migrateRoles() {
  try {
    console.log('🔄 Connecting to MongoDB Atlas for Role Migration...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB Atlas.');

    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');

    // 1. Fetch current users
    const allUsers = await usersCollection.find({}).toArray();
    console.log(`\n📋 Found ${allUsers.length} total user accounts in database.`);

    const roleBreakdown = {};
    allUsers.forEach((u) => {
      roleBreakdown[u.role] = (roleBreakdown[u.role] || 0) + 1;
    });
    console.log('Current roles breakdown:', roleBreakdown);

    // 2. Migrate 'Employee' / 'employee' -> 'Student'
    const employeeUpdate = await usersCollection.updateMany(
      { role: { $in: ['Employee', 'employee'] } },
      { $set: { role: 'Student' } }
    );
    console.log(`\n Migrated Employee -> Student: ${employeeUpdate.modifiedCount} accounts updated.`);

    // 3. Migrate 'Manager' / 'manager' -> 'Student' (candidates/students)
    const managerUpdate = await usersCollection.updateMany(
      { role: { $in: ['Manager', 'manager'] } },
      { $set: { role: 'Student' } }
    );
    console.log(` Migrated Manager -> Student: ${managerUpdate.modifiedCount} accounts updated.`);

    // 4. Canonicalize 'admin' -> 'Admin'
    const adminUpdate = await usersCollection.updateMany(
      { role: 'admin' },
      { $set: { role: 'Admin' } }
    );
    console.log(` Canonicalized admin -> Admin: ${adminUpdate.modifiedCount} accounts updated.`);

    // 5. Canonicalize 'student' -> 'Student'
    const studentUpdate = await usersCollection.updateMany(
      { role: 'student' },
      { $set: { role: 'Student' } }
    );
    console.log(` Canonicalized student -> Student: ${studentUpdate.modifiedCount} accounts updated.`);

    // 6. Verify post-migration state
    const postUsers = await usersCollection.find({}, { projection: { name: 1, email: 1, role: 1 } }).toArray();
    const newBreakdown = {};
    postUsers.forEach((u) => {
      newBreakdown[u.role] = (newBreakdown[u.role] || 0) + 1;
    });

    console.log('\n====================================');
    console.log('✅ POST-MIGRATION ROLES BREAKDOWN:');
    console.log(JSON.stringify(newBreakdown, null, 2));
    console.log('====================================');

    const invalidUsers = postUsers.filter((u) => !['Student', 'Admin'].includes(u.role));
    if (invalidUsers.length > 0) {
      console.error('❌ WARNING: Found users with non-conforming roles:', invalidUsers);
      process.exit(1);
    } else {
      console.log('🎉 All users now strictly conform to [Student, Admin]!');
    }

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB Atlas.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed with error:', error);
    process.exit(1);
  }
}

migrateRoles();
