const errorHandler = (err, req, res, next) => {
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  if (err.name === 'MulterError' || (err.message && err.message.includes('Invalid file format'))) {
    statusCode = 400;
  }

  let errorMessage = err.message || 'Internal Server Error';

  // Catch MongoDB Atlas IP whitelist and SSL/TLS network rejection errors
  if (
    err.name === 'MongoServerSelectionError' ||
    err.name === 'MongooseServerSelectionError' ||
    (err.message && (
      err.message.includes('SSL routines') ||
      err.message.includes('ECONNREFUSED') ||
      err.message.includes('whitelist') ||
      err.message.includes('timed out')
    ))
  ) {
    statusCode = 503;
    errorMessage =
      'Database connection failed: Your IP address is not whitelisted in MongoDB Atlas. ' +
      'Please go to MongoDB Atlas -> Network Access and add your current IP address (or allow access from anywhere: 0.0.0.0/0).';
  }

  console.error(`[Error] ${req.method} ${req.originalUrl} - ${errorMessage}`);
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  res.status(statusCode).json({
    success: false,
    message: errorMessage,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
};

module.exports = errorHandler;
