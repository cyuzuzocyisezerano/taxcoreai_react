import dotenv from 'dotenv'

dotenv.config()

const clientUrlEnv = process.env.CLIENT_URL || 'http://localhost:5173'
const clientUrls = String(clientUrlEnv)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

export const config = {
  port: Number(process.env.PORT) || 3001,
  jwtSecret: process.env.JWT_SECRET || 'taxcoreai-dev-secret-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  // list of allowed client origins (comma-separated in env)
  clientUrls,
  clientUrl: clientUrls[0],
  // if true, allow any origin (only use for quick local testing)
  allowAnyOrigin: process.env.ALLOW_ANY_ORIGIN === 'true',
}
