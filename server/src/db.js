import dotenv from 'dotenv'
import { Pool } from 'pg'

dotenv.config()

let pool

if (process.env.DATABASE_URL) {
  pool = new Pool({ connectionString: process.env.DATABASE_URL })
} else {
  // Provide a helpful runtime error when queries are attempted without a DB URL
  pool = {
    query: async () => {
      throw new Error(
        'DATABASE_URL is not set. Configure server/.env with DATABASE_URL to enable Postgres-backed routes.'
      )
    },
    connect: async () => {
      throw new Error('DATABASE_URL is not set. Cannot obtain a DB connection.')
    },
  }
}

export { pool }
