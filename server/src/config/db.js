const mongoose = require('mongoose');
const dns = require('dns');

// Fix for Windows local DNS resolver failing SRV lookups (ECONNREFUSED) with MongoDB Atlas
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (dnsErr) {
  console.warn(`[DNS Warning] Could not set custom DNS servers: ${dnsErr.message}`);
}

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri || mongoUri.trim() === '') {
    console.warn('[Database] MONGO_URI is not set in environment variables.');
    return false;
  }

  try {
    const conn = await mongoose.connect(mongoUri.trim(), {
      serverSelectionTimeoutMS: 4000,
    });
    console.log(`[Database] MongoDB Connected: ${conn.connection.host}`);
    return true;
  } catch (error) {
    console.warn(`[Database Warning] MongoDB connection failed: ${error.message}`);
    return false;
  }
};

module.exports = connectDB;
