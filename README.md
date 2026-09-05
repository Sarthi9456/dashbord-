# Role-Based Dashboard

A full-stack Role-Based Access Control (RBAC) dashboard built with **Node.js, Express, Sequelize (SQLite) and EJS**. Supports three roles — **Admin**, **Manager**, and **Employee** — each with different backend-enforced permissions for managing users, projects, and tasks.

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js, Express 5 |
| Database | SQLite (via Sequelize ORM) |
| Auth | express-session + bcryptjs (hashed passwords) |
| Views | EJS (server-rendered, no separate frontend build needed) |
| Migrations/Seeders | Sequelize CLI |

No separate frontend build step is required — the server renders HTML directly, so `npm start` is all you need.

## Features

- **Authentication**: Session-based login/logout. All routes require authentication.
- **3 Roles**: Admin, Manager, Employee — seeded automatically.
- **Backend-enforced RBAC**: Authorization is checked in Express middleware (`src/middleware/authorize.js`), not just hidden in the UI. Manually typing a restricted URL returns an HTTP `403` page, not just a missing button.
  - **Admin**: full access — dashboard stats, user CRUD + role assignment, project/task management.
  - **Manager**: dashboard stats, manage projects/tasks, assign work to employees. Cannot manage users.
  - **Employee**: sees only their own assigned projects/tasks; can update the **status** of their own tasks only (ownership is checked server-side, not just filtered in the UI — an employee cannot update another employee's task even by crafting the request manually).
- **Project module**: name, description, start/end date, status (Pending / In Progress / Completed), assigned employees (many-to-many), created-by.
- **Task module**: title, description, project (FK), assigned employee (FK), priority (Low/Medium/High), due date, status.
- **Dashboard statistics**, scoped per role:
  - Admin/Manager: Total Users, Total Projects, Active Projects, Pending/In-Progress/Completed Tasks, recent projects table.
  - Employee: their own project count, task count, and per-status breakdown.
- **Database relationships**: Role → Users (1:M), User → Projects created (1:M), User ↔ Projects assigned (M:M via `project_employees`), Project → Tasks (1:M), User → Tasks assigned (1:M).
- **Migrations & Seeders** (Sequelize CLI) — see `src/migrations` and `src/seeders`.
- **Bonus features implemented**:
  - Search (users, projects, tasks) & pagination
  - Filters (project status, task status/priority)
  - Server-side form validation (Sequelize validators + controller checks)
  - Soft delete (`paranoid: true` on Users, Projects, Tasks — deleted rows are kept but excluded from all queries)
  - Flash messages for success/error feedback

## Project Structure

```
rbac-dashboard/
├── config/config.json          # Sequelize DB config
├── server.js                   # App entry point
├── src/
│   ├── models/                 # Sequelize models (User, Role, Project, Task)
│   ├── migrations/             # Sequelize migrations (run in order)
│   ├── seeders/                # Sequelize seeders (roles, users, sample data)
│   ├── controllers/            # Route handlers / business logic
│   ├── middleware/
│   │   ├── auth.js             # requireAuth / redirectIfAuthenticated
│   │   └── authorize.js        # Role-based guard, returns 403 on mismatch
│   └── routes/                 # Express routers (auth, dashboard, users, projects, tasks)
├── views/                      # EJS templates
├── public/css/style.css        # Styling
├── screenshots/                # App screenshots (see below)
└── database.sqlite             # SQLite DB file (created after migrations run)
```

## Setup Instructions

### 1. Prerequisites
- Node.js v18+ and npm

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment
Copy `.env.example` to `.env` (a working default is already provided):
```bash
cp .env.example .env
```

### 4. Run migrations & seed the database
```bash
npm run db:setup
```
This runs all migrations (creating the `roles`, `users`, `projects`, `tasks`, and `project_employees` tables) and seeds them with demo data.

Other useful DB commands:
```bash
npm run migrate        # run migrations only
npm run seed           # run seeders only
npm run migrate:undo   # rollback all migrations
npm run db:reset       # rollback, re-migrate, and re-seed (fresh start)
```

### 5. Start the server
```bash
npm start
```
The app will be available at **http://localhost:3000**.

### 6. Log in with a seeded demo account

| Role | Email | Password |
|---|---|---|
| Admin | admin@example.com | Admin@123 |
| Manager | manager@example.com | Manager@123 |
| Employee | employee1@example.com | Employee@123 |
| Employee | employee2@example.com | Employee@123 |

## Database Schema (relationships)

```
roles (1) ───< (M) users
users (1) ───< (M) projects            [users.id = projects.createdBy]
users (1) ───< (M) tasks               [users.id = tasks.assignedEmployeeId]
projects (1) ───< (M) tasks            [projects.id = tasks.projectId]
projects (M) ───< project_employees >─── (M) users   [many-to-many assignment]
```

- `users.deletedAt`, `projects.deletedAt`, `tasks.deletedAt` — soft-delete columns (Sequelize `paranoid` mode).
- Passwords are hashed with bcrypt before being persisted (model hook in `src/models/user.js`).

## How Authorization Is Enforced (backend, not just UI)

Every protected route is wrapped in two middlewares:
1. `requireAuth` — rejects unauthenticated requests, redirecting to `/login`.
2. `authorize('admin', 'manager', ...)` — checks the logged-in user's role against an allow-list for that specific route. If the role doesn't match, it responds with `403 Access Denied` **before any controller code runs.**

For task status updates specifically, ownership is checked *inside* the controller (`taskController.updateStatus`) — an Employee can only change the status of a task where `task.assignedEmployeeId === session.user.id`. This was verified manually: an employee attempting to PATCH another employee's task via a crafted request receives a 403, while updating their own task succeeds.

Example manual verification performed during development:
```bash
# Employee tries to view /users directly → 403
curl -b cookies.txt http://localhost:3000/users
# Employee tries to POST /projects directly → 403
curl -b cookies.txt -X POST http://localhost:3000/projects -d "name=Hacked&startDate=2026-01-01"
```

## API-style Endpoints

While this app is server-rendered (form posts + redirects), all mutating actions are exposed as clean REST-ish endpoints and can be called programmatically (e.g., with `curl` or Postman) as long as a valid session cookie is attached:

| Method | Path | Access |
|---|---|---|
| POST | `/login` | Public |
| POST | `/logout` | Authenticated |
| GET | `/dashboard` | Authenticated (stats vary by role) |
| GET / POST / PUT / DELETE | `/users`, `/users/:id` | Admin only |
| GET | `/projects` | Admin, Manager, Employee (employee sees only their own) |
| POST / PUT / DELETE | `/projects`, `/projects/:id` | Admin, Manager |
| GET | `/tasks` | Admin, Manager, Employee (employee sees only their own) |
| POST / PUT / DELETE | `/tasks`, `/tasks/:id` | Admin, Manager |
| PATCH | `/tasks/:id/status` | Admin, Manager, Employee (employee limited to own tasks) |

## Screenshots

See the `/screenshots` folder for real captures of:
1. Login page
2. Admin dashboard (full stats)
3. Admin — user management (list + create modal)
4. Admin — project management
5. Admin — task management
6. Manager dashboard & project view
7. Employee dashboard (scoped stats)
8. Employee — "My Tasks" view (own tasks only)
9. Employee attempting to access `/users` directly → 403 Access Denied page (proves backend-level authorization)

## Deployment

### GitHub

```bash
git init
git add .
git commit -m "Initial commit: Role-Based Dashboard"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/rbac-dashboard.git
git push -u origin main
```

### Render (recommended — free, always-on Node process, zero code changes needed)

This repo includes a `render.yaml` Blueprint, so deployment is close to one click:

1. Push the repo to GitHub (above).
2. Go to [render.com](https://render.com) → **New → Blueprint** → connect your GitHub repo.
3. Render reads `render.yaml` automatically and provisions:
   - A free Node web service
   - Build command: `npm install`
   - Start command: `npm start` (this automatically runs migrations, seeds demo data **only if the database is empty**, then boots the server — safe to redeploy repeatedly)
   - `SESSION_SECRET` auto-generated, `NODE_ENV=production` set for you
4. Click **Apply** — you'll get a live URL like `https://rbac-dashboard.onrender.com` in a couple of minutes.

If you'd rather set it up manually instead of using the Blueprint: **New → Web Service** → connect repo → Build Command `npm install` → Start Command `npm start` → add env var `SESSION_SECRET` (any long random string) and `NODE_ENV=production`.

**Note on Render's free tier:** the service spins down after 15 minutes of inactivity and the first request after that takes ~30–50 seconds to wake up — this is normal, not a bug. Also, the free tier's disk is ephemeral, so the SQLite database resets to the clean seeded state on every redeploy (not on every sleep/wake). For a demo/assessment this is actually convenient — reviewers always see fresh, clean demo data.

### Why not Vercel?
Vercel runs Node apps as serverless functions with a read-only, per-request filesystem and no persistent in-process memory. This app uses a SQLite file and stores sessions in it — both need a persistent, always-running process, which Render (or Railway, Fly.io, a VPS, etc.) provides but Vercel's serverless model does not. Deploying this specific app to Vercel would require swapping in a hosted database (e.g. Postgres via Neon/Supabase) — happy to do that migration if that's a hard requirement.

## Notes / Design Decisions

- **SQLite** was chosen for zero-config portability for this assessment; the Sequelize config (`config/config.json`) can be swapped to `mysql`/`postgres` with a connection string and no other code changes, since all queries go through Sequelize models.
- **Session-based auth** (rather than JWT) was used since this is a server-rendered app; the session cookie is httpOnly by default via `express-session`.
- Soft-deleted records (`paranoid: true`) are hidden from all default queries automatically by Sequelize, but remain in the database for audit purposes.
