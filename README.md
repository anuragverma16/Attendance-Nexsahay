# Nexsahay Attendance

Split deploy: Vite React client + Express/MongoDB API on separate Vercel projects.

| App | Local | Production |
|---|---|---|
| Client | `http://localhost:5173` | https://attendance-nexsahay26.vercel.app |
| Server | `http://localhost:5000/api` | https://attendance-nexsahay-server.vercel.app/api |

## Local development

### Server

```bash
cd server
npm install
cp .env.example .env
# start MongoDB locally, or set MONGODB_URI to Atlas
npm run dev
```

### Client

```bash
cd client
npm install
npm run dev
```

Leave `VITE_API_URL` unset locally. Vite proxies `/api` to `http://localhost:5000`.

## Deploy on Vercel (two projects, same GitHub repo)

### 1) Server project (`attendance-nexsahay-server`)

- Root Directory: `server`
- Env vars:
  - `MONGODB_URI` (MongoDB Atlas)
  - `ADMIN_USERNAME`
  - `ADMIN_PASSWORD`
  - `CLIENT_ORIGIN=https://attendance-nexsahay26.vercel.app,http://localhost:5173`

### 2) Client project (`attendance-nexsahay26`)

- Root Directory: `client`
- Framework: Vite
- Env var (Production):
  - `VITE_API_URL=https://attendance-nexsahay-server.vercel.app/api`

`client/.env.production` already sets this for production builds. Redeploy the client after changing `VITE_*` values.

## Atlas checklist (required for login on Vercel)

Login fails with `net::ERR_FAILED` if the server still uses localhost MongoDB.

1. Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Database Access → create user/password
3. Network Access → allow `0.0.0.0/0`
4. Connect → Drivers → copy `mongodb+srv://...` URI
5. In Vercel project **attendance-nexsahay-server** → Settings → Environment Variables:
   - `MONGODB_URI` = that Atlas URI
   - `CLIENT_ORIGIN` = `https://attendance-nexsahay26.vercel.app,http://localhost:5173`
   - `ADMIN_USERNAME` / `ADMIN_PASSWORD`
6. Redeploy the server, then hard-refresh the client
