# Server (Express + MongoDB)

API for Nexsahay Attendance.

## Local

```bash
npm install
cp .env.example .env
npm run dev
```

API base: `http://localhost:5000/api`

## Vercel (separate project)

1. Create a Vercel project from this repo
2. Set **Root Directory** to `server`
3. Add environment variables:
   - `MONGODB_URI` = MongoDB Atlas connection string
   - `ADMIN_USERNAME` / `ADMIN_PASSWORD`
   - `CLIENT_ORIGIN` = `https://attendance-nexsahay26.vercel.app,http://localhost:5173`
4. Deploy

Production URL: `https://attendance-nexsahay-server.vercel.app`

Health check: `https://attendance-nexsahay-server.vercel.app/api/health`
