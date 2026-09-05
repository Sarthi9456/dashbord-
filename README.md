# Role-Based Dashboard

A full-stack Role-Based Access Control (RBAC) dashboard built with **Node.js, Express, Sequelize (MySQL) and EJS**. Supports three roles — **Admin**, **Manager**, and **Employee** — each with different backend-enforced permissions for managing users, projects, and tasks.

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js, Express 5 |
| Database | MySQL 8 (via Sequelize ORM + `mysql2` driver) |
| Auth | express-session (MySQL-backed session store) + bcryptjs (hashed passwords) |
| Views | EJS (server-rendered, no separate frontend build needed) |
| Migrations/Seeders | Sequelize CLI |

No separate frontend build step is required — the server renders HTML directly, so `npm start` is all you need (after MySQL is set up).

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
- **Database relationships**: Role → Users (1:M), User → Projects created (1:M), User ↔ Projects assigned (M:M via `project_employees`), Project → Tasks (1:M), User → Tasks assigned (1:M) — all enforced as real MySQL foreign keys.
- **Migrations & Seeders** (Sequelize CLI) — see `src/migrations` and `src/seeders`.
- **Bonus features implemented**:
  - Search (users, projects, tasks) & pagination
  - Filters (project status, task status/priority)
  - Server-side form validation (Sequelize validators + controller checks)
  - Soft delete (`paranoid: true` on Users, Projects, Tasks — deleted rows keep a `deletedAt` timestamp but are excluded from all queries)
  - Flash messages for success/error feedback

## Project Structure

```
rbac-dashboard/
├── config/config.js             # Sequelize DB config (reads from .env)
├── server.js                    # App entry point
├── src/
│   ├── models/                  # Sequelize models (User, Role, Project, Task)
│   ├── migrations/              # Sequelize migrations (run in order)
│   ├── seeders/                 # Sequelize seeders (roles, users, sample data)
│   ├── controllers/             # Route handlers / business logic
│   ├── middleware/
│   │   ├── auth.js              # requireAuth / redirectIfAuthenticated
│   │   └── authorize.js         # Role-based guard, returns 403 on mismatch
│   └── routes/                  # Express routers (auth, dashboard, users, projects, tasks)
├── views/                       # EJS templates
├── public/css/style.css         # Styling
└── screenshots/                 # App screenshots (see below)
```

## Setup Instructions

### 1. Prerequisites
- Node.js v18+ and npm
- MySQL 8.x running locally, or a connection string to a remote MySQL instance

### 2. Install dependencies
```bash
npm install
```

### 3. Create the database
```sql
CREATE DATABASE rbac_dashboard;
CREATE USER 'rbac_user'@'localhost' IDENTIFIED BY 'rbac_password';
GRANT ALL PRIVILEGES ON rbac_dashboard.* TO 'rbac_user'@'localhost';
FLUSH PRIVILEGES;
```
(Adjust the username/password/database name to whatever you use in step 4 — the values above match the defaults in `.env.example`.)

### 4. Configure environment
Copy `.env.example` to `.env` and adjust the `DB_*` values to match your MySQL setup:
```bash
cp .env.example .env
```
```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=rbac_dashboard
DB_USER=rbac_user
DB_PASSWORD=rbac_password
DB_SSL=false
```
Set `DB_SSL=true` if you're connecting to a managed/cloud MySQL host that requires SSL (most do — see the Deployment section).

### 5. Run migrations & seed the database
```bash
npm run db:setup
```
This runs all migrations (creating the `roles`, `users`, `projects`, `tasks`, and `project_employees` tables as real MySQL tables with foreign key constraints) and seeds them with demo data.

Other useful DB commands:
```bash
npm run migrate        # run migrations only
npm run seed           # run seeders only
npm run migrate:undo   # rollback all migrations
npm run db:reset       # rollback, re-migrate, and re-seed (fresh start)
```

### 6. Start the server
```bash
npm start
```
The app will be available at **http://localhost:3000**.

### 7. Log in with a seeded demo account

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

All of the above are real MySQL foreign key constraints (visible via `SHOW CREATE TABLE` or `information_schema.KEY_COLUMN_USAGE`), not just Sequelize-level associations.

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

### Render (app hosting) + an external free MySQL host (database)

Render doesn't offer a free managed MySQL database (only Postgres), so this app's Render deployment needs to point at MySQL hosted elsewhere. A few free options: **Railway** (MySQL plugin, free trial credit), **Aiven** (free MySQL tier), **Clever Cloud** (free "DEV" MySQL plan), or **db4free.net** (free but slower, fine for a demo).

1. Set up a free MySQL database with one of the above, and note its host, port, database name, username, and password.
2. Push this repo to GitHub (above).
3. On [render.com](https://render.com): **New → Blueprint** → connect your GitHub repo. Render reads the included `render.yaml` and provisions a free Node web service with `SESSION_SECRET` auto-generated and `NODE_ENV=production` set.
4. After the first deploy, go to the service's **Environment** tab and add:
   - `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` — from step 1
   - `DB_SSL=true` (most free MySQL hosts require SSL)
5. Trigger a **Manual Deploy** so the new env vars take effect. `npm start` will run migrations, seed demo data (only if the database is empty), and boot the server.

**Note on Render's free tier:** the service spins down after 15 minutes of inactivity and the first request after that takes ~30–50 seconds to wake up — this is normal, not a bug.

### Why not Vercel?
Vercel runs Node apps as serverless functions with a read-only, per-request filesystem and no persistent in-process memory. This app needs a persistent, always-running process (for the session store and general request handling), which Render (or Railway, Fly.io, a VPS, etc.) provides but Vercel's serverless model doesn't fit as naturally. It's not impossible — since the app now already uses an external MySQL database rather than a local file, a Vercel deployment is more feasible than it would have been with SQLite — but Render remains the simpler, zero-friction option for this project.

## Notes / Design Decisions

- **MySQL** was chosen as a widely-used, industry-standard relational database that matches the assessment's requirement for proper relational structure (foreign keys, joins) between Users, Roles, Projects, and Tasks.
- The Sequelize config (`config/config.js`) reads all connection details from environment variables, so switching to PostgreSQL or another MySQL-compatible host requires no code changes — only different `.env` values (and `dialect` if switching away from MySQL entirely).
- **Session-based auth** (rather than JWT) was used since this is a server-rendered app; sessions are stored in a MySQL table (`sessions`, via `connect-session-sequelize`) rather than in-memory, so they survive server restarts and don't leak memory under load.
- Soft-deleted records (`paranoid: true`) are hidden from all default queries automatically by Sequelize, but remain in the database for audit purposes.
