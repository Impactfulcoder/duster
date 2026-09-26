const errorHandler = (err, req, res, next) => {
  console.error('[Error]', err.stack || err.message || err);

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation failed',
      details: Object.values(err.errors).map((e) => e.message),
    });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({ error: 'Invalid resource ID format.' });
  }

  if (err.code === 11000) {
    return res.status(409).json({ error: 'Duplicate entry detected.' });
  }

  const statusCode = err.status || 500;
  res.status(statusCode).json({
    error: err.message || 'An unexpected internal error occurred.',
  });
};

module.exports = errorHandler;
