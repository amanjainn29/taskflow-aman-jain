# TaskFlow

A minimal but complete task management system with authentication, relational data, a REST API, and a polished UI.

**Stack:** Go · PostgreSQL · React + TypeScript · Docker · Tailwind CSS

---

## Overview

TaskFlow lets users register, log in, create projects, and manage tasks within those projects. Tasks support status tracking (todo / in progress / done), priority levels, due dates, and assignees.

The backend is a stateless REST API in **Go** using the `chi` router, `pgx` for PostgreSQL, `golang-migrate` for schema migrations, `bcrypt` for password hashing, and `JWT` for authentication. The frontend is a **React + TypeScript** SPA using React Router, TanStack Query, and Tailwind CSS — with optimistic UI for task status changes and dark mode that persists across sessions.

---

## Architecture Decisions

### Backend

**Go over Node/Python** — Go's compiled binaries produce a near-zero-overhead Docker image via multi-stage build (final image uses `scratch`). The explicit type system also makes the API contract clearer.

**chi over net/http or Gin** — `chi` is 100% stdlib-compatible, zero-dependency beyond itself, and handles URL parameters cleanly. Gin adds more magic than this scope needs.

**pgx over database/sql + lib/pq** — `pgx` is significantly faster for PostgreSQL, supports native types (UUID, enums), and has a built-in connection pool.

**golang-migrate** — File-based migrations with explicit up/down files give reviewers confidence that the schema is reproducible and reversible. Avoided `GORM AutoMigrate` because it silently mutates schema.

**Structured JSON logging via slog** — Go 1.21's built-in `slog` package avoids adding a dependency (zap/logrus) for a task this size, while still producing machine-parseable logs.

**Intentional omissions:** No ORM, no service layer (handlers call repositories directly) — the scope didn't justify the indirection. At larger scale I'd introduce a service interface between handlers and repos.

### Frontend

**TanStack Query** — Handles server state (caching, background refresh, loading/error states) so component code stays clean. Used instead of Redux/Zustand because this is server-state-heavy, not client-state-heavy.

**Optimistic UI on task status** — Status changes update the UI immediately and revert on API error, making the app feel fast. Implemented in `TaskCard.tsx` via `onMutate` → `onError` flow.

**Tailwind CSS with custom component classes** — Repeated UI patterns (`btn-primary`, `card`, `badge-*`) are extracted as `@layer components` in `index.css`, keeping JSX readable without a component library dependency.

**Dark mode** — Implemented via Tailwind's `class` strategy. The `useDarkMode` hook reads from `localStorage` on mount and persists the toggle, satisfying the bonus requirement.

**Tradeoffs:**
- No drag-and-drop (would add `@dnd-kit` with a few hours more time)
- No real-time updates (would add SSE from the Go side)
- No pagination on task lists (backend is ready; frontend just needs a `page` query param)

---

## Running Locally

The only prerequisite is **Docker Desktop** (or Docker + Docker Compose).

```bash
# 1. Clone the repo
git clone https://github.com/your-name/taskflow-aman-jain
cd taskflow-aman-jain

# 2. Set up environment variables
cp .env.example .env

# 3. Start everything (PostgreSQL + API + seed data + React frontend)
docker compose up --build

# App is available at:  http://localhost:3000
# API is available at:  http://localhost:8080
```

> On first run, Docker will build both images (Go multi-stage + Node/nginx). This takes 2–3 minutes. Subsequent runs use the cache and start in seconds.

---

## Running Migrations

Migrations run **automatically on API container startup** via `golang-migrate` before the HTTP server starts. No manual steps needed.

To run them manually (outside Docker):

```bash
cd backend
migrate -path ./migrations -database "postgres://postgres:password@localhost:5432/taskflow?sslmode=disable" up
```

To rollback:

```bash
migrate -path ./migrations -database "postgres://postgres:password@localhost:5432/taskflow?sslmode=disable" down 1
```

---

## Seed Data

A `seed` service runs automatically after the API is healthy and inserts test data. You can log in immediately with:

```
Email:    test@example.com
Password: password123
```

A second user is also seeded (`alice@example.com` / `password123`), along with one project and three tasks in different statuses.

---

## API Reference

All protected endpoints require: `Authorization: Bearer <token>`

All responses: `Content-Type: application/json`

### Auth

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register a new user |
| POST | `/auth/login` | Login and receive JWT |

**POST /auth/register**
```json
// Request
{ "name": "Aman Jain", "email": "aman@example.com", "password": "password123" }

// Response 201
{ "token": "<jwt>", "user": { "id": "uuid", "name": "Aman Jain", "email": "aman@example.com" } }
```

**POST /auth/login**
```json
// Request
{ "email": "aman@example.com", "password": "password123" }

// Response 200
{ "token": "<jwt>", "user": { "id": "uuid", "name": "Aman Jain", "email": "aman@example.com" } }
```

### Projects

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/projects` | List projects owned or assigned to current user |
| POST | `/projects` | Create a project |
| GET | `/projects/:id` | Get project with its tasks |
| PATCH | `/projects/:id` | Update name/description (owner only) |
| DELETE | `/projects/:id` | Delete project and tasks (owner only) |
| GET | `/projects/:id/stats` | Task counts by status and assignee |

**POST /projects**
```json
// Request
{ "name": "My Project", "description": "Optional" }

// Response 201
{ "id": "uuid", "name": "My Project", "description": "Optional", "owner_id": "uuid", "created_at": "..." }
```

**GET /projects/:id/stats**
```json
// Response 200
{
  "total_tasks": 3,
  "by_status": { "todo": 1, "in_progress": 1, "done": 1 },
  "by_assignee": { "uuid-of-user": 2, "unassigned": 1 }
}
```

### Tasks

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/projects/:id/tasks` | List tasks (supports `?status=` and `?assignee=` filters) |
| POST | `/projects/:id/tasks` | Create a task |
| PATCH | `/tasks/:id` | Update task fields |
| DELETE | `/tasks/:id` | Delete task (project owner or task creator only) |

**POST /projects/:id/tasks**
```json
// Request
{ "title": "Design schema", "description": "...", "priority": "high", "due_date": "2026-04-30" }

// Response 201
{ "id": "uuid", "title": "Design schema", "status": "todo", "priority": "high", ... }
```

**PATCH /tasks/:id** (all fields optional)
```json
// Request
{ "status": "done", "priority": "low", "assignee_id": "uuid-or-empty-string-to-clear" }

// Response 200 — updated task object
```

### Error Responses

```json
// 400 Validation error
{ "error": "validation failed", "fields": { "email": "is required" } }

// 401 Unauthenticated
{ "error": "unauthorized" }

// 403 Forbidden action
{ "error": "forbidden" }

// 404 Not found
{ "error": "not found" }
```

---

## What I'd Do With More Time

**Drag-and-drop task reordering** — The column-based board layout is already in place. Adding `@dnd-kit/core` with a `sortable` context would let users drag cards between status columns. The backend would need a `position` integer column and a PATCH endpoint for reordering.

**Real-time updates** — Go's `net/http` supports Server-Sent Events with zero dependencies. I'd add a `/projects/:id/events` SSE endpoint that pushes task change events, and use the browser `EventSource` API on the frontend. This would make the board feel live for multi-user projects.

**Pagination** — The backend `ListByProject` query already orders by `created_at DESC`. Adding `LIMIT $n OFFSET $m` and `?page=&limit=` query params is a 20-minute change. The frontend would use TanStack Query's `useInfiniteQuery` for "load more".

**Test suite** — I would add at minimum: unit tests for the JWT middleware, an integration test for the full register → login → create project → create task flow using `pgx` against a test database spun up with `testcontainers-go`.

**Role-based access** — Current access is owner/assignee based. A proper `project_members` join table with roles (owner, member, viewer) would allow explicit membership, invite flows, and cleaner permission checks.

**Input sanitisation and rate limiting** — Add `chi/middleware.Throttle` on auth endpoints to prevent brute-force attacks, and sanitise all free-text fields before storage.

**Shortcuts I knowingly took:**
- No refresh tokens — JWT is 24h, after which users must re-login
- `seed` is a one-shot Docker service; a proper CLI flag like `--seed` on the API binary would be cleaner
- Frontend error messages are passed through raw from the API; a proper i18n/error-code mapping would be more robust

---

## Project Structure

```
taskflow-aman-jain/
├── backend/
│   ├── cmd/server/main.go          # Entrypoint, graceful shutdown
│   ├── internal/
│   │   ├── config/                 # Env-based config
│   │   ├── database/               # pgx pool + golang-migrate runner
│   │   ├── middleware/             # JWT auth middleware
│   │   ├── models/                 # Domain types
│   │   ├── repository/             # SQL queries (user, project, task)
│   │   └── handlers/               # HTTP handlers + helper utils
│   ├── migrations/                 # Up/down SQL migration files
│   ├── scripts/seed.sql            # Test data seeder
│   ├── go.mod
│   └── Dockerfile                  # Multi-stage: golang builder → scratch
├── frontend/
│   ├── src/
│   │   ├── api/                    # Axios client + typed API functions
│   │   ├── contexts/               # Auth context with localStorage
│   │   ├── hooks/                  # useDarkMode
│   │   ├── components/             # Navbar, TaskModal, TaskCard, ProtectedRoute
│   │   ├── pages/                  # Login, Register, Projects, ProjectDetail
│   │   └── types/                  # Shared TypeScript interfaces
│   ├── index.html
│   ├── vite.config.ts
│   └── Dockerfile                  # Multi-stage: node builder → nginx
├── docker-compose.yml              # db + api + seed + frontend
├── .env.example                    # All required vars with sane defaults
└── README.md
```
