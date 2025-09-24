# Career Chat

AI-powered career counseling app built with Next.js, tRPC, Prisma, and PostgreSQL. Create sessioned chats, get counselor‑style guidance from an LLM, and manage history with a clean, mobile‑friendly UI. Deployed on Vercel with environment-based configuration.  

- Live: https://career-chat-two.vercel.app/auth/login  
- Repo: https://github.com/ZERO34802/Oration-career-chat


## Screenshots

![Desktop – Chat](C:\oration-career-chat\public\screenshots\chat-desktop-1.jpg)

<p>
  <img src="C:\oration-career-chat\public\screenshots\chat-mobile-1.jpg" alt="Mobile – Sessions" width="45%" />
</p>


## Demo Video

<video src="C:\oration-career-chat\docs\demo1.mp4" controls width="720" muted></video>

> If the video doesn’t auto-play in your client, use the link below:
- MP4: [Download/Play](docs/demo.mp4)


---

## Features

- AI career counseling with a focused counselor-style prompt built from recent turns.  
- Session management: New, list, open, rename; latest session auto-opens.  
- Chat history: Cursor-based pagination, typewriter effect for newest assistant reply, reliable mobile navigation.  
- Secure access: Credentials auth; tRPC protected procedures enforce per-user isolation.  
- Production-ready: Prisma migrations on Neon/Supabase; Vercel deployment; secrets via env vars.  

---

## Tech Stack

- Frontend: Next.js (App Router, TypeScript), TanStack Query, shadcn/ui  
- API: tRPC (server + client), Next Route Handlers  
- Data: Prisma ORM + PostgreSQL (Neon or Supabase)  
- AI: OpenRouter by default (swap to OpenAI/Anthropic via adapter)  
- Auth: NextAuth (credentials)  
- Hosting: Vercel

---

## Database Schema (Prisma)

- `User`: `id`, `email` (unique), `passwordHash?`, timestamps  
- `ChatSession`: `id`, `userId` (nullable for safe migration), `title`, `createdAt`, `updatedAt`  
  - Indexes: `@@index([userId])`, `@@index([updatedAt])`  
- `Message`: `id`, `sessionId`, `role` (`user|assistant|system`), `content`, `createdAt`  
  - Index: `@@index([sessionId, createdAt])`

---

## Local Setup

### Prerequisites
- Node 18+ and `pnpm` or `npm`  
- PostgreSQL (Neon or Supabase recommended)

### 1. Install

```bash
git clone https://github.com/<username>/<repo>.git
cd <repo>
pnpm install # or: npm install
```


### 2. Environment
Create `.env` in project root:

```bash
DATABASE_URL=postgres://<user>:<pass>@<host>/<db>?sslmode=require
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<long-random-string>
OPENROUTER_API_KEY=<your-key>
```

### 3. Prisma
```bash
npx prisma generate
npx prisma migrate dev -n "init"
```


### 4. Run
```bash
pnpm dev # or: npm run dev
```


Open http://localhost:3000

---

## Deployment (Vercel)

### 1. Connect GitHub
Push to a public GitHub repo and import in Vercel.

### 2. Environment variables (Production + Preview)
- `NEXTAUTH_URL=https://<your-project>.vercel.app`  
- `NEXTAUTH_SECRET=<secret>`  
- `DATABASE_URL=<Neon/Supabase prod URL>`  
- `OPENROUTER_API_KEY=<key>`

### 3. First deploy
Vercel builds the app.

### 4. Apply prod migrations (once)
From local shell, temporarily point Prisma to prod DB:

macOS/Linux
```bash
export DATABASE_URL="postgres://..."
npx prisma migrate deploy
npx prisma generate
unset DATABASE_URL
```

Windows PowerShell
```bash
$Env:DATABASE_URL="postgres://..."
npx prisma migrate deploy
npx prisma generate
Remove-Item Env:DATABASE_URL
```


---

## Usage

- Auth: Register/login via credentials; unauthenticated users visiting `/chat` are redirected to `/auth/login`.  
- `/chat`: Redirects to latest session or creates one if none exist.  
- Sidebar:
  - “New” creates a new session and navigates to it (mobile-safe close‑then‑navigate flow).  
  - Tap an existing session to switch.  
- Composer: Enter to send, Shift+Enter for newline.  
- History: “Load older” paginates; newest assistant reply shows a typewriter effect once per device.

---

## Architecture Highlights

- Chat route split:
  - `/chat/[id]/page.tsx` (Server): exports route options and renders the client.  
  - `/chat/[id]/ChatClient.tsx` (Client): all hooks/UI, mobile-safe navigation helper.  
- Mobile navigation reliability:
  - Close sidebar, short delay, then `replace` to new session ID; cache‑busting query; fallback to `location.assign` for older mobile browsers.  
- Security:
  - `protectedProcedure` injects userId, queries filter by userId/sessionId; per-user isolation in DB.  
- Performance:
  - Indexes on session and message tables align with common queries (by user, by updatedAt, by sessionId+createdAt).

---

## Configuration

- AI provider: OpenRouter by default; swap to OpenAI/Anthropic by changing the LLM client and env keys.  
- UI: Theming via shadcn/ui; dark mode toggle in header.  

---

## Scripts

```bash
{
  "scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint"
  }
}
```


---

## Troubleshooting

- Login redirect loop: Check `NEXTAUTH_URL` and `NEXTAUTH_SECRET` on Vercel and redeploy.  
- LLM errors: Verify `OPENROUTER_API_KEY` in Vercel; confirm model name/config.  
- DB errors: Ensure `DATABASE_URL` points to production and `migrate deploy` has been run.

---

## Known Issues / Future Work

- TypeScript anys relaxed to ship faster; replace with strict types and re‑enable CI linting.  
- `ChatSession.userId` currently nullable to avoid data churn; can backfill and set NOT NULL later.  
- Bonus: Real‑time streaming (SSE/WebSockets), shareable read‑only sessions, export to PDF/Markdown, OAuth providers.

---

## Security

- Secrets only in environment variables (local `.env`, Vercel settings).  

---





