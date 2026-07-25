# CLAUDE.md — Kartas Development Guide

## Project Overview

Kartas is a project management tool (alternative to Jira) for agile teams. It is a **monorepo** with two independent Node.js packages and a shared Docker Compose orchestration layer:

```
kartas/
├── kartas-api/        # Backend — Node.js + Express + PostgreSQL (port 3000)
├── kartas-app/        # Frontend — React 18 + Vite (port 5173)
├── docker-compose.yml # Orchestrates postgres, api, and app services
├── .env / .env.example
├── setup.sh           # Automated first-run setup
└── reset-db.sh        # Drops volumes and rebuilds the database
```

---

## Quick Commands

### Full-Stack (Docker)

```bash
docker-compose up           # Start everything
docker-compose down -v      # Reset (drops DB data)
docker-compose exec api npm run migrate  # Run migrations
```

### Backend (`kartas-api/`)

```bash
npm install          # Install dependencies
npm run dev          # Start dev server (nodemon, port 3000)
npm run start        # Start production server
npm run migrate      # Run all SQL migrations in order
npm test             # Jest + Supertest (requires running DB)
npm run test:watch   # Jest in watch mode
```

### Frontend (`kartas-app/`)

```bash
npm install          # Install dependencies
npm run dev          # Vite dev server (port 5173)
npm run build        # Production build
npm test             # Vitest
```

---

## Architecture

### Backend (`kartas-api`)

**Stack**: Node.js 18, Express 4, PostgreSQL 16, ES Modules (`"type": "module"`)

**Entrypoint**: `src/index.js` — configures Express middleware (helmet, cors, morgan, json parser), mounts all route groups under `/api/*`, and handles graceful shutdown.

**Layered architecture** (no ORM — raw SQL via `pg`):

| Layer | Path | Responsibility |
|-------|------|---------------|
| Routes | `src/routes/*.js` | HTTP verb mapping, request validation (`express-validator`), middleware chaining |
| Controllers | `src/controllers/*.js` | Business logic, raw SQL queries via `query()`, response formatting |
| Middleware | `src/middleware/auth.js` | JWT authentication, role-based guards |
| Config | `src/config/database.js` | `pg.Pool` singleton (connection string from `DATABASE_URL`) |
| Config | `src/config/auth.js` | JWT/cookie configuration from env vars |
| Utils | `src/utils/ticketPrefix.js` | Ticket prefix generation & next story/epic ID generation |
| Migrations | `src/migrations/*.sql` | Sequential SQL migrations run by `run.js` |

**Key pattern — Controller object export**: Every controller file exports a single named object with async methods:

```js
export const fooController = {
    async list(req, res) { /* ... */ },
    async create(req, res) { /* ... */ },
};
```

**No model layer**: There is no dedicated `models/` abstraction. All SQL is written inline in controllers using the `query(text, params)` helper from `src/config/database.js`. Parameterized queries ($1, $2, ...) are used throughout for SQL injection prevention.

**Validation**: Route files define validation arrays using `express-validator` (`body()`, `param()`). These are placed inline as middleware before the controller method.

**Authentication flow**:
1. `authenticateToken` middleware extracts `Bearer <token>` from `Authorization` header
2. Verifies JWT, then re-queries the user from DB to confirm existence
3. Attaches `req.user` (`{ userId, email, role, id, first_name, last_name }`)
4. `requireRole(...roles)` / `requireAdmin` / `requireProjectOwner` add role gating

**Token management**: Access tokens (short-lived, 15m default) + refresh tokens (7d) stored in `refresh_tokens` table. Frontend auto-refreshes via Axios interceptor.

### Frontend (`kartas-app`)

**Stack**: React 18, Vite 5, React Router DOM 6, Axios, Recharts, react-beautiful-dnd, date-fns, Vanilla CSS.

> **Note**: React StrictMode is **disabled** in `main.jsx` due to `react-beautiful-dnd` incompatibility.

**Entrypoint**: `src/main.jsx` → `src/App.jsx`

| Layer | Path | Responsibility |
|-------|------|---------------|
| Pages | `src/pages/*.jsx` | Full page components, self-contained with local state |
| Components | `src/components/*.jsx` | Reusable UI: `ProjectLayout`, `Sidebar`, `UserDropdown`, `ProtectedRoute`, charts |
| Contexts | `src/contexts/AuthContext.jsx` | Global auth state (`user`, `login`, `logout`, `changePassword`, `adminExists`) |
| Services | `src/services/api.js` | Axios instance with base URL, auth interceptor, and auto token refresh |
| Styles | `src/index.css` | Global design system (CSS custom properties) + utility classes |
| Styles | `src/components/navigation.css` | Sidebar and layout-specific styles |
| Assets | `src/assets/` | Logo images (`kartas-logo.png`, `kartas-logo-white.png`) |

**Routing** (defined in `App.jsx`):

| Route | Page Component | Description |
|-------|---------------|-------------|
| `/` | `Dashboard` | Project listing |
| `/login` | `Login` | Login form |
| `/register` | `Register` | Registration (via invite) |
| `/admin/setup` | `AdminSetup` | First-run admin creation |
| `/project/:projectId/backlog` | `Backlog` | Backlog management |
| `/project/:projectId/epics` | `Epics` | Epic management |
| `/project/:projectId/sprints` | `Sprints` | Sprint management |
| `/project/:projectId/kanban` | `KanbanBoard` | Kanban board (drag-and-drop) |
| `/project/:projectId/reports` | `SprintReports` | Sprint metrics & burndown charts |
| `/project/:projectId/team` | `ProjectView` | Team members |
| `/project/:projectId/story/:storyId` | `StoryDetail` | Story detail page |
| `/users` | `UserManagement` | User admin panel |
| `/profile` | `UserProfile` | Current user profile |

All authenticated routes are wrapped in `<ProtectedRoute>`.

**Page component pattern**: Pages are large, self-contained functional components. They:
- Use `useParams()` to get route params
- Manage all local state with `useState`
- Fetch data in `useEffect` via `api.get()`/`api.post()`
- Define inline styles and map constants (like `STATUS_OPTIONS`, `TYPE_OPTIONS`) at file top
- Wrap content in `<ProjectLayout projectId={...} projectName={...}>`

**Styling approach**: Vanilla CSS with a comprehensive design system defined in `src/index.css`:
- CSS custom properties (`--color-*`, `--spacing-*`, `--radius-*`, `--shadow-*`, `--font-*`, `--transition-*`)
- Utility classes (`.flex`, `.flex-center`, `.flex-between`, `.flex-gap-*`, `.container`, `.card`, `.btn`, `.btn-primary`, `.btn-danger`, `.form-group`, `.form-input`, `.badge`, `.text-muted`, `.mt-*`, `.mb-*`)
- **No CSS modules or CSS-in-JS** — all styles are global. Per-page styles are applied inline via React `style={{}}` props.

---

## Database Schema

**PostgreSQL 16** with sequential SQL migrations (no migration tracking table — all migrations use `IF NOT EXISTS` / `IF NOT EXISTS` for idempotency).

### Tables

| Table | Description | Key columns |
|-------|-------------|-------------|
| `users` | User accounts | `id`, `email`, `password_hash`, `first_name`, `last_name`, `role` (admin/project_owner/member), `first_login` |
| `projects` | Projects/teams | `id`, `name`, `ticket_prefix` (unique, auto-generated), `description`, `created_by` |
| `project_members` | M:N users↔projects | `project_id`, `user_id`, `role` (owner/member) — composite PK |
| `epics` | Epic groupings | `id`, `epic_id` (EPIC-0001), `project_id`, `title`, `status`, `start_date`, `end_date`, `color` |
| `stories` | Stories/tasks/bugs | `id`, `story_id` (GGY-0001), `project_id`, `epic_id`, `type`, `status`, `title`, `story_points`, `assignee_id` |
| `sprints` | Sprint cycles | `id`, `project_id`, `name`, `objective`, `start_date`, `end_date`, `status` (planned/active/completed) |
| `sprint_stories` | M:N sprints↔stories | `sprint_id`, `story_id` — composite PK |
| `sub_tasks` | Sub-tasks/sub-tests | `id`, `story_id`, `type` (sub_task/sub_test), `title`, `status` |
| `comments` | Story comments | `id`, `story_id`, `user_id`, `content` |
| `change_history` | Audit trail | `id`, `story_id`, `user_id`, `field_changed`, `old_value`, `new_value` |
| `tags` / `story_tags` | Tagging system | `tags.id`, `story_tags.story_id`↔`tag_id` |
| `user_invitations` | Legacy invitations table | `id`, `email`, `token`, `expires_at`, `used` |
| `user_invites` | Current invite system | `id`, `email`, `token`, `role`, `invited_by`, `expires_at`, `used_at` |
| `refresh_tokens` | JWT refresh tokens | `id`, `user_id`, `token`, `expires_at` |
| `kanban_columns` | Per-project column config | `project_id`, `status`, `display_name`, `visible`, `position` |
| `sprint_metrics` | Status transition tracking | `sprint_id`, `story_id`, `status`, `entered_at`, `exited_at` |
| `sprint_daily_snapshots` | Burndown chart data | `sprint_id`, `snapshot_date`, `remaining_points`, `completed_points` |

### Key database features

- **Auto-updated timestamps**: `update_updated_at_column()` trigger on `users`, `projects`, `epics`, `stories`, `sprints`, `sub_tasks`, `comments`
- **Auto-created kanban columns**: `create_default_kanban_columns()` trigger fires on project insert
- **Status change tracking**: `track_story_status_change()` trigger creates `sprint_metrics` entries when a story's status changes
- **Sprint snapshot function**: `capture_sprint_snapshot(sprint_id)` — callable PG function for burndown data

### Story statuses (in order)

`backlog` → `refining` → `ready` → `in_development` → `review` → `test` → `done` | `cancelled`

### Story types

`story`, `task`, `bug`

### User roles

- `admin` — Full system access
- `project_owner` — Can create projects, manage teams
- `member` — Can work on assigned projects

---

## API Endpoints

All endpoints are prefixed with `/api` except the health check (`/health`).

### Auth (`/api/auth`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/check-admin` | No | Check if admin exists (first-run) |
| POST | `/admin/setup` | No | Create first admin account |
| POST | `/login` | No | Login, returns tokens |
| POST | `/refresh` | No | Refresh access token |
| POST | `/change-password` | Yes | Change password (used for first-login flow) |
| POST | `/logout` | No | Revoke refresh token |

### Projects (`/api/projects`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/` | Admin/PO | Create project |
| GET | `/` | Yes | List user's projects |
| GET | `/:projectId` | Yes | Get project details |
| GET | `/:projectId/members` | Yes | List project members |
| PUT | `/:projectId` | Yes | Update project |
| DELETE | `/:projectId` | Yes | Delete project |
| POST | `/:projectId/members` | Yes | Add member |
| DELETE | `/:projectId/members/:userId` | Yes | Remove member |

### Stories (`/api/stories`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/` | Yes | Create story |
| GET | `/project/:projectId` | Yes | List project stories |
| GET | `/:storyId` | Yes | Get story details |
| PUT | `/:storyId` | Yes | Update story |
| DELETE | `/:storyId` | Yes | Delete story |
| POST | `/:storyId/comments` | Yes | Add comment |

### Sprints (`/api/sprints`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/` | Yes | Create sprint |
| GET | `/project/:projectId` | Yes | List project sprints |
| GET | `/project/:projectId/active` | Yes | Get active sprint |
| GET | `/:sprintId` | Yes | Get sprint details |
| PUT | `/:sprintId` | Yes | Update sprint |
| DELETE | `/:sprintId` | Yes | Delete sprint |
| POST | `/:sprintId/start` | Yes | Start sprint |
| POST | `/:sprintId/end` | Yes | End sprint |
| POST | `/:sprintId/stories` | Yes | Add stories to sprint |
| DELETE | `/:sprintId/stories/:storyId` | Yes | Remove story from sprint |

### Kanban (`/api/kanban`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/project/:projectId` | Yes | Get kanban board data |
| PUT | `/stories/:storyId/status` | Yes | Update story status (drag-and-drop) |
| GET | `/project/:projectId/columns` | Yes | Get column configuration |
| PUT | `/project/:projectId/columns` | Yes | Update column configuration |
| GET | `/sprint/:sprintId/metrics` | Yes | Get sprint metrics |

### Epics (`/api` — note: mounted directly on `/api`, not `/api/epics`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/project/:projectId/epics` | Yes | List project epics |
| GET | `/epics/:epicId` | Yes | Get epic details |
| POST | `/project/:projectId/epics` | Yes | Create epic |
| PUT | `/epics/:epicId` | Yes | Update epic |
| DELETE | `/epics/:epicId` | Yes | Delete epic |

### Invites (`/api/invites`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/validate/:token` | No | Validate invite token |
| POST | `/register` | No | Register with invite |
| POST | `/generate` | Admin | Generate invite |
| GET | `/pending` | Admin | List pending invites |
| DELETE | `/:inviteId` | Admin | Cancel invite |

### Users (`/api/users`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Yes | List all users |
| GET | `/search` | Yes | Search users |
| GET | `/profile` | Yes | Get current user profile |
| PUT | `/profile` | Yes | Update profile |
| PUT | `/password` | Yes | Change password |
| DELETE | `/:id` | Yes | Delete user |

### Metrics (`/api/metrics`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/projects/:projectId/sprints` | Yes | Get completed sprints |
| GET | `/sprints/:sprintId/report` | Yes | Get comprehensive sprint report |

---

## Testing

### Backend (`kartas-api`)

- **Framework**: Jest + Supertest
- **Config**: `jest.config.json` — tests in `tests/**/*.test.js`, coverage excludes `index.js` and `migrations/`
- **Test files**: `auth.test.js`, `projects.test.js`, `stories.test.js`, `ticketPrefix.test.js`
- **Pattern**: Integration tests that import `app` from `src/index.js` and use `supertest` for HTTP assertions
- **Important**: Tests require a running PostgreSQL instance (they use real DB queries). Clean up test data in `beforeAll`/`afterAll` hooks.
- **Run**: `cd kartas-api && npm test`

### Frontend (`kartas-app`)

- **Framework**: Vitest
- **Run**: `cd kartas-app && npm test`
- **Note**: Test coverage is minimal; most pages are not unit-tested.

---

## Migration System

Migrations live in `kartas-api/src/migrations/` and are run in **alphabetical filename order** by `run.js`. There is **no migration state tracking** — every migration file must be idempotent (using `IF NOT EXISTS`, `ON CONFLICT DO NOTHING`, etc.).

**Current migration files (in execution order)**:
1. `001_initial_schema.sql` — Core tables, indexes, `updated_at` triggers
2. `002_add_epic_fields.sql` — Adds `project_id`, `start_date`, `end_date` to epics
3. `002_phase2_features.sql` — Kanban columns, sprint metrics, status tracking trigger
4. `003_sprint_snapshots.sql` — Sprint daily snapshots for burndown charts
5. `004_add_epic_color.sql` — Adds `color` column to epics

**To add a new migration**: Create a new `.sql` file with the next sequence number prefix (e.g., `005_your_migration.sql`). Ensure all statements are idempotent.

---

## Environment Variables

Defined in `.env` (copied from `.env.example`):

| Variable | Default | Used By |
|----------|---------|---------|
| `POSTGRES_USER` | `kartas_user` | docker-compose, DB |
| `POSTGRES_PASSWORD` | `kartas_password_change_in_production` | docker-compose, DB |
| `POSTGRES_DB` | `kartas_db` | docker-compose, DB |
| `DATABASE_URL` | `postgresql://...@postgres:5432/kartas_db` | API |
| `JWT_SECRET` | `your_jwt_secret_key_change_in_production` | API |
| `JWT_REFRESH_SECRET` | `your_jwt_refresh_secret_key_change_in_production` | API |
| `JWT_EXPIRES_IN` | `15m` | API |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | API |
| `API_PORT` | `3000` | API, docker-compose |
| `NODE_ENV` | `development` | API |
| `VITE_API_URL` | `http://localhost:3000/api` | Frontend |

---

## Conventions & Patterns

### Code Style

- **ES Modules** throughout (`import`/`export`, `"type": "module"` in both `package.json` files)
- **No TypeScript** — plain JavaScript (`.js` for backend, `.jsx` for frontend)
- **No linter configured** (no ESLint/Prettier config files)
- **No ORM** — raw parameterized SQL queries via `pg`
- **Naming**: snake_case for database columns, camelCase for JavaScript variables. Controllers manually map between them in API responses (e.g., `first_name` → `firstName`).

### Adding a New Backend Resource

1. **Create migration**: `kartas-api/src/migrations/NNN_description.sql`
2. **Create controller**: `kartas-api/src/controllers/fooController.js` — export a named object with async methods
3. **Create route**: `kartas-api/src/routes/foo.js` — define validation middleware, chain `authenticateToken` and controller methods
4. **Register route**: In `src/index.js`, import the route and add `app.use('/api/foo', fooRoutes);`
5. **Add tests**: `kartas-api/tests/foo.test.js`

### Adding a New Frontend Page

1. **Create page component**: `kartas-app/src/pages/FooPage.jsx`
2. **Wrap in `ProjectLayout`** if it's a project-scoped page (pass `projectId` and `projectName` props)
3. **Add route** in `kartas-app/src/App.jsx` inside `<Routes>`, wrapped in `<ProtectedRoute>`
4. **Add sidebar link** in `kartas-app/src/components/Sidebar.jsx` if it's a project navigation item
5. **Use `api` service** from `src/services/api.js` for all HTTP calls

### Error Handling

- **Backend**: Controllers use try/catch, respond with `{ error: 'message' }`. PostgreSQL error code `23505` (unique violation) is handled explicitly. Stack traces are included in dev mode only.
- **Frontend**: API errors are caught in component-level try/catch blocks and displayed via local `error` state.

### ID Generation

- **Story IDs**: `{TICKET_PREFIX}-{NNNN}` (e.g., `GGY-0001`). Generated by `generateNextStoryId()` in `src/utils/ticketPrefix.js` — queries latest story and increments.
- **Epic IDs**: `EPIC-{NNNN}` (e.g., `EPIC-0001`). Generated by `generateNextEpicId()`.
- **Ticket prefixes**: Auto-generated from project name. Single word → first 3 chars (`Phoenix` → `PHO`). Multiple words → first letter of each word up to 4 (`Good Guys` → `GG`). Conflicts resolved with numeric suffixes (`GG-1`, `GG-2`).

---

## Known Gotchas

1. **Epic routes mount differently**: Epic routes are mounted at `/api` (not `/api/epics`), so epic paths include the full prefix: `/api/project/:projectId/epics` and `/api/epics/:epicId`.

2. **Two invitation tables**: Both `user_invitations` and `user_invites` exist in the schema. The active invite system uses the `user_invites` table (the one in `inviteController.js`).

3. **No migration tracking**: All migrations re-run every time `npm run migrate` is called. They must be idempotent. Two files share the `002_` prefix which is fine since they sort alphabetically.

4. **StrictMode disabled**: React StrictMode is off in `main.jsx` because `react-beautiful-dnd` doesn't support React 18 StrictMode.

5. **Sidebar state sync**: `ProjectLayout` syncs sidebar collapse state via `localStorage` polling (100ms interval) + `storage` event listener — not via React state/context.

6. **Large page components**: Some pages (`Backlog.jsx` = ~974 lines, `KanbanBoard.jsx` = ~1024 lines) contain all logic, rendering, and inline styles in a single component. When modifying them, be careful with the extensive local state.

7. **No model/DAO layer**: All database queries are inline in controllers. When updating the schema, search all controllers for affected table/column references.

8. **CORS origin**: Hardcoded to `http://localhost:5173` in development. Must be updated for production via `FRONTEND_URL` env var.
