# Restaurant ERP Single Project

Production-ready single project repository containing the Restaurant ERP application (Frontend & Backend API Server).

## Repository Structure

```
.
├── src/                       # React + TanStack Start UI source code
├── public/                    # Static assets & logos
├── server.js                  # Express API Server & Supabase integration
├── package.json               # Combined dependencies & project scripts
├── vite.config.ts             # Vite configuration
├── tsconfig.json              # TypeScript configuration
├── render.yaml                # Render deployment configuration
├── vercel.json                # Vercel deployment configuration
└── README.md                  # Project documentation
```

---

## Local Development Commands

Run commands from the repository root:

- **Start Frontend Dev Server**: `npm run dev`
- **Start Backend API Server**: `npm run dev:backend`
- **Build Application**: `npm run build`
- **Preview Build**: `npm run preview`
- **Start Production Server**: `npm start`
- **Lint Code**: `npm run lint`

---

## Deployment Configuration

### 1. Frontend (Vercel)
- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `.output/public`
- **Environment Variables**: Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

### 2. Backend (Render)
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Health Check Path**: `/health` or `/api/health`
- **Environment Variables**: Add `PORT`, `NODE_ENV=production`, `CORS_ORIGIN`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
