PostgreSQL usage

1. Create a PostgreSQL database and run the schema in `sql/schema.sql`.
2. Add the connection string to `server/.env` (copy `.env.example` then set `DATABASE_URL`).

Example `.env`:

PORT=3001
JWT_SECRET=change-this
CLIENT_URL=http://localhost:5173
DATABASE_URL=postgres://user:password@localhost:5432/taxcoreai

3. Install server deps and start the server:

```bash
cd server
npm install
npm run dev
```

4. The API will detect `DATABASE_URL` and switch the taxpayers routes to query PostgreSQL. Other parts of the server still use the local file DB by default — migrate endpoints as needed.

5. From the frontend (running via `npm run dev` at project root), the app will call `/api/taxpayers`. Ensure you are signed in (the API requires authentication). For quick tests you can temporarily disable auth in `server/src/routes/taxpayers.routes.js` (not recommended for production).
