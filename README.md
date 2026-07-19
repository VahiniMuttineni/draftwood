# Draftwood

Draftwood is an Enterprise Document Approval & Workflow Management System. It is designed to be a robust, heavily auditable, state-machine driven SaaS application.

## 🏗️ Architecture & Project Structure

The project strictly follows a Feature-Based Clean Architecture and is split into two completely decoupled workspace packages within a `pnpm` monorepo:

### 1. Frontend (`/frontend`)
A Next.js (App Router) application.
- **Technologies:** React, Tailwind CSS, Framer Motion, React Query, Better Auth Client.
- **Responsibilities:** UI, Components, Pages, Animations, Client-Side routing, and API interaction.
- **Constraints:** Zero database access, zero business logic. It relies purely on the Backend REST APIs.
- **Run independently:** `cd frontend && pnpm dev`

### 2. Backend (`/backend`)
A standalone Hono Server running on Node.js.
- **Technologies:** Hono, Drizzle ORM (PostgreSQL), Better Auth, Zod.
- **Responsibilities:** API Endpoints (`/api/v1/*`), Authentication, Workflow State Machine (`WorkflowService`), Repositories, Audit Logging, and Notifications.
- **Constraints:** Never imports frontend code. Strictly enforces Role-Based Access Control (RBAC) and Optimistic Concurrency Control inside atomic transactions.
- **Run independently:** `cd backend && pnpm dev`

---

## 🚀 Running Locally

### Prerequisites
- Node.js (v18+)
- pnpm
- Docker Desktop (for local PostgreSQL database)

### Setup & Start

1. **Install dependencies:**
   Run this from the root of the monorepo:
   ```bash
   pnpm install
   ```

2. **Configure Environment Variables:**
   Copy the example environment files in both frontend and backend directories and fill them out.
   - `backend/.env` (Database URL, Auth Secrets)
   - `frontend/.env.local` (API URL)

3. **Start Development Environment:**
   Run this from the root of the monorepo:
   ```bash
   pnpm run dev
   ```
   *This command automatically orchestrates starting the PostgreSQL docker container, the Backend Hono server (Port 6203), and the Frontend Next.js server (Port 3203).*

4. **Database Migrations & Seeding (First run only):**
   ```bash
   cd backend
   pnpm run db:push
   pnpm run db:seed
   ```
   *This will seed the identities: Alice (Author), Bob (Reviewer), Admin, and Viewer.*

---

## ☁️ Deployment Guide

Draftwood is designed to be easily deployed to modern cloud providers like Vercel and Render.

### Backend (Render)
1. Create a new **Web Service** on Render connected to this repository.
2. Set the Root Directory to `backend`.
3. Build Command: `pnpm install && pnpm run build`
4. Start Command: `pnpm run start`
5. **Environment Variables Required:**
   - `DATABASE_URL`: Your production PostgreSQL database URL.
   - `BETTER_AUTH_SECRET`: A secure random string.
   - `BETTER_AUTH_URL`: The URL of your Render backend (e.g., `https://draftwood.onrender.com`).
   - `FRONTEND_URL`: The URL of your deployed frontend (e.g., `https://draftwood.vercel.app`).

### Frontend (Vercel)
1. Import the project into Vercel.
2. Set the Root Directory to `frontend`.
3. Vercel will automatically detect it as a Next.js project.
4. **Environment Variables Required:**
   - `NEXT_PUBLIC_API_URL`: Your Vercel frontend domain with the API path (e.g., `https://draftwood.vercel.app/api/v1`).
   - *Note: Vercel proxies API requests to the backend using the rewrite rules in `next.config.mjs` to bypass CORS issues.*

**Database Note:** After deploying the backend, you must run `DATABASE_URL="<your_live_db_url>" npm run db:push` in your local terminal to apply the schema to your production database before logging in.

---

## 🧪 Testing

Backend Services and Workflow invariant checks are covered by Vitest.

```bash
# Run backend tests
cd backend
pnpm run test
```
