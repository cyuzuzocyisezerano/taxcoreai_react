export function errorHandler(err, _req, res, _next) {
  console.error(err)

  if (err.status) {
    return res.status(err.status).json({ error: err.message })
  }

  // Multer file upload errors or validation
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File too large' })
  }

  if (err.message === 'Invalid file type') {
    return res.status(400).json({ error: err.message })
  }

  res.status(500).json({ error: 'Internal server error' })
}
