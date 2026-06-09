const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'taxcoreai',
  password: 'Password@123',
  port: 5432,
  max: 20,
  idleTimeoutMillis: 30000
});

pool.connect()
  .then(() => {
    console.log("✅ PostgreSQL connected successfully");
  })
  .catch((err) => {
    console.error("❌ PostgreSQL connection failed");
    console.error(err.message);
  });

module.exports = {
  query: (text, params) => pool.query(text, params),
};