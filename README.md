# ExecutiveFlow

ExecutiveFlow is an Enterprise Document Approval & Workflow Management System. It is designed to be a robust, heavily auditable, state-machine driven SaaS application.

## Architecture & Project Structure

The project strictly follows a Feature-Based Clean Architecture and is split into two completely decoupled workspace packages within a `pnpm` monorepo:

### 1. Frontend (`/frontend`)
A Next.js (App Router) application.
- **Responsibilities:** UI, Components, Pages, Animations (Framer Motion), Tailwind Styling, Client-Side routing, and API interaction.
- **Constraints:** Zero database access, zero business logic. It relies purely on the Backend REST APIs.
- **Run independently:** `cd frontend && pnpm dev`

### 2. Backend (`/backend`)
A standalone Hono Server running on Node.js.
- **Responsibilities:** API Endpoints (`/api/v1/*`), Better Auth, Workflow State Machine (`WorkflowService`), Repositories, Drizzle ORM (PostgreSQL), Audit Logging, and Notifications.
- **Constraints:** Never imports frontend code. Strictly enforces RBAC and Optimistic Concurrency Control inside atomic transactions.
- **Run independently:** `cd backend && pnpm dev`

---

## Running Locally

### Prerequisites
- Node.js (v18+)
- pnpm
- Docker Desktop (for PostgreSQL)

### Setup & Start
Run these commands from the **root** of the monorepo:

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Start Development Environment:**
   ```bash
   pnpm run dev
   ```
   *This command automatically orchestrates starting the PostgreSQL docker container, the Backend Hono server (Port 3203), and the Frontend Next.js server (Port 3000).*

3. **Database Migrations & Seeding (First run only):**
   ```bash
   cd backend
   pnpm run db:push
   pnpm run db:seed
   ```
   *This will seed the identities: Alice (Author), Bob (Reviewer), Admin, and Viewer.*

---

## Development Workflow

- The Frontend and Backend communicate strictly over HTTP. The frontend accesses the API using `NEXT_PUBLIC_API_URL`.
- To create a new feature: 
  1. Add the database schema in `backend/src/db/schema.ts`.
  2. Implement the Repository and Service in `backend/src/modules/`.
  3. Expose the Hono Route in `backend/src/routes/`.
  4. Create the corresponding UI in `frontend/app/`.

## Testing

Backend Services and Workflow invariant checks are covered by Vitest.

```bash
# Run backend tests
cd backend
pnpm run test
```

## Build & Deployment

To build the applications for production:
```bash
pnpm run build
```
This builds both workspaces. For deployment, `frontend` can be deployed to Vercel/Netlify as a standard Next.js app, and `backend` can be containerized using a Dockerfile and deployed to any Node.js hosting platform (AWS ECS, Render, Railway).
