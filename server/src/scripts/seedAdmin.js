require('dotenv').config();
const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
const mongoose = require('mongoose');
const User = require('../models/User');

async function seedAdmin() {
  try {
    console.log('🔄 Connecting to MongoDB to verify/seed Admin account...');
    await mongoose.connect(process.env.MONGO_URI);

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@placement.ai';
    const adminPassword = process.env.ADMIN_PASSWORD || 'AdminPassword123!';

    let admin = await User.findOne({ email: adminEmail });
    if (!admin) {
      admin = await User.create({
        name: 'System Admin',
        email: adminEmail,
        password: adminPassword,
        role: 'Admin',
      });
      console.log(`✅ Created Admin account: ${admin.email} (Role: ${admin.role})`);
    } else {
      admin.role = 'Admin';
      await admin.save();
      console.log(`✅ Admin account already exists: ${admin.email} (Role confirmed: ${admin.role})`);
    }

    await mongoose.disconnect();
    console.log('Done.');
    process.exit(0);
  } catch (error) {
    console.error('Failed to seed admin:', error);
    process.exit(1);
  }
}

seedAdmin();
