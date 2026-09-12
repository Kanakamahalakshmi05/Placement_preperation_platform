require('dotenv').config();
const dns = require('dns');

// Configure DNS servers globally before any network operations
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  // Ignore if already set
}

const http = require('http');
const app = require('./src/app');
const connectDB = require('./src/config/db');

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

// Handle server listen errors gracefully
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ [Port Conflict] Port ${PORT} is already in use by another process.`);
    console.error(`👉 To free port ${PORT} on Windows, run:`);
    console.error(`   Get-Process -Id (Get-NetTCPConnection -LocalPort ${PORT}).OwningProcess | Stop-Process -Force\n`);
    process.exit(1);
  } else {
    console.error(`[Server Error] ${err.message}`);
    process.exit(1);
  }
});

const startServer = async () => {
  try {
    await connectDB();
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`==================================================`);
      console.log(`🚀 Placement Platform Server running on port ${PORT}`);
      console.log(`📡 Health check URL: http://localhost:${PORT}/api/health`);
      console.log(`==================================================`);
    });
  } catch (err) {
    console.error(`[Server Fatal] Failed to start server: ${err.message}`);
    process.exit(1);
  }
};

startServer();
