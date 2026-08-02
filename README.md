<p align="center">
  <img src="./kartas-app/src/assets/kartas-logo.png" alt="Kartas Logo" height="120">
</p>

# Kartas - Project Management Tool

A modern, comprehensive alternative to Jira for agile team management, built with React, Node.js, and PostgreSQL.

## Features

### Core Features
- **Backlog Management**: Create and organize user stories, tasks, and bugs with advanced filtering
- **Sprint Planning**: Plan and manage sprints with objectives, timelines, and progress tracking
- **Kanban Board**: Visualize work with customizable columns, drag-and-drop, and context menus
- **Epic Management**: Group related stories under epics with color coding and progress visualization
- **User Management**: Role-based access control — global admin/project owner/member roles, plus project-scoped owner/member permissions gating team and epic management. Admins can invite users by email (with an always-available fallback link) or create accounts directly with a temporary password
- **Metrics & Reporting**: Track team velocity, sprint performance, and burndown charts

### Advanced Features (Phase 3)
- **Epic Enhancements**:
  - Color-coded epics with 8 predefined color options
  - Timeline progress bars showing epic duration
  - Clickable epic cards for instant backlog filtering
  - Epic badges on stories (Backlog & Kanban) with color indicators
  
- **Sprint Progress**:
  - Visual timeline progress bar on active sprint cards
  - Real-time story completion tracking
  - Story points progress visualization
  
- **Kanban Improvements**:
  - Right-click context menu on story cards
  - Quick actions: View, Edit, Assign, Move to Status, Delete
  - Expandable submenu for status changes
  - Epic badges on cards for easy identification
  
- **Backlog Enhancements**:
  - Multi-sprint support per story with interactive chips
  - Dedicated Epic column with clickable badges
  - Faster tooltips for story type icons
  - Improved sprint filtering
  
- **UI/UX Polish**:
  - Consistent ProjectLayout across all pages
  - Collapsible sidebar with state persistence
  - Responsive design with proper spacing
  - Professional styling and animations

### Phase 4 Additions
- **Sub-tasks & Sub-tests**:
  - Full CRUD for sub-items from the Story Detail page's "Sub-items" section
  - Lightweight create/edit modal (title, description, type, status, story points, assignee)
  - Sub-tasks of stories in the active sprint appear as their own kanban cards — smaller, indented, dashed border, with a parent-story badge — and can be dragged between columns independently
- **Kanban Header Context**: Active sprint name, objective, formatted start/end dates, and a compact "Elapsed Time" progress bar
- **Blocked Task Indicator**: Mark stories as blocked from the Story Detail page or the Kanban context menu; a 🚫 badge surfaces in the backlog, kanban cards, and story detail
- **Story-Based Epic Progress**: Epic progress bars reflect `(done stories / total stories) × 100` instead of elapsed time
- **Decluttered Views**: Completed/cancelled stories and epics are hidden by default, with an opt-in "Show completed" toggle
- **Frozen Sprint Reports**: Ended sprints snapshot their metrics at the moment of completion, so later changes to shared stories no longer retroactively alter historical reports
- **Access Control**: Team and epic management are restricted to project owners/admins — members get view-only access; admins can change any other user's role from User Management (with a self-demotion safeguard)
- **Email Invitations**: Admins can send invites by email — SMTP by default, or Gmail via an app password, selected with `EMAIL_PROVIDER` — with specific delivery feedback (sent / not configured / send failed, each with the exact reason) and the invite link always shown as a manual fallback
- **Admin-Created Users**: Admins can create a user account directly from User Management with a temporary password, bypassing the invite flow entirely; the new user is required to change their password on first login
- **"For You" Page**: A per-project personal view, alongside Backlog/Epics/Sprints/Kanban — every story/sub-task assigned to you in that project (sorted in-progress-first), plus a paginated activity feed of your recent actions there (created/edited/moved/commented on stories and sub-tasks, epic and sprint changes)
- **Project Settings**: A per-project, per-user preference page — choose which page a project opens to (defaults to Backlog)

### Phase 5 Additions
- **Navigation Overhaul**: Persistent "Kartas" app identity in the top bar on every page; a breadcrumb trail reflecting the project/page hierarchy (including deep trails like "Projects / [Project] / Team Members / [Name]'s Details"); a sidebar project-identity header with a square avatar, name, and description
- **Markdown Descriptions**: Story, epic, and sub-item descriptions are authored and rendered as markdown — a shared Write/Preview editor with GFM support (tables, strikethrough, task lists) — across the story creation modal, the Story Detail page, the Kanban/Backlog quick-view modals, epics, and sub-items
- **People-Centric Kanban**: Assignees show as avatar circles with a deterministic per-user color instead of raw `@name` text, on Kanban story/sub-task cards, the Backlog's Assignee column, the Epic "Created by" field, and the Story Detail sub-items list. Hovering any avatar shows a card with the user's name, role, email, and a copy-to-clipboard button, clamped to stay fully on-screen and reachable by moving the cursor from the avatar onto the card itself
- **User Details Page**: A per-project "[Name]'s Details" page — profile header, assigned stories/sub-tasks, and the 15 most recent activity entries for that person in the project — reachable from the Team Members page or any avatar's hover card
- **Assignee Management**: Stories and sub-tasks can be unassigned (cleared back to "Unassigned") from every editor, plus a dedicated "Remove Assignee" action in the Kanban board's right-click menus, which also gained full "View"/"Edit" sub-item actions and viewport-aware positioning (menus flip to stay on-screen near screen edges)
- **Filter UI Polish**: The Backlog's and Epics' "Show completed" toggles now match the app's lever-switch styling used elsewhere, and the Backlog's filter bar is reorganized into a denser, less cluttered layout

### Phase 6 Additions
- **Kanban Polish**: Sprint-participant avatars next to the active-sprint header's elapsed-time bar; "View"/"Edit" parity between story and sub-task quick-view modals; clicking a sub-task card now opens a read-only view first (matching story cards) instead of jumping straight to edit
- **Story Comments & Mentions**: A comment section on the Story Detail page — post, edit (author-only), and delete (author or admin) — with a single `@`-trigger autocomplete for both people and tickets (stories/epics). Mentioned users and referenced tickets render as clickable links; mentioning someone surfaces it in their "Latest Activities" feed
- **Story Change History**: A paginated "History" section on the Story Detail page showing the story's (and its sub-tasks') full change trail, excluding comments (which have their own section)
- **"For You" Page Overhaul**: A customizable widget grid (2 or 3 columns, admin's choice) with a gear-icon settings modal — "My Tasks", "Actions History" (your own actions, renamed from "Activity"), the new "Latest Activities" (others' actions on your items, plus mentions of you), "Team Workload" (a per-assignee stacked bar chart for the active sprint), and "Sprint Countdown" (the Kanban elapsed-time bar, as its own widget)
- **Dark Mode**: A per-user light/dark preference, reachable from a new system-level "Settings" page (linked from the user dropdown menu), applied instantly with no flash of the wrong theme on load
- **Admin-Customizable Color Palette**: A system-wide, admin-only color scheme editor on the same Settings page — 6 curated presets (Purple, Blue, Green, Red/Rose, Orange, Teal) with hand-picked light and dark variants, or a fully custom palette across 9 base categories per mode, with live preview against the actual app before saving
- **UI Consistency**: Every in-project page now shares the same wider (1400px) content margin that Story Detail introduced in an earlier phase

### Phase 7 Additions
- **Drag-and-Drop Migration & Kanban Polish**: Migrated off the unmaintained `react-beautiful-dnd` onto `@hello-pangea/dnd`; collapsed-sidebar nav items now show tooltips; epic filter badges on the Backlog are color-coded to match each epic
- **Clone & Migrate Stories**: Duplicate a story (with a fresh ID, reset assignee/sprint) from the Backlog or Story Detail; move a story to a different project's backlog entirely, clearing its epic and sprint along the way while preserving its sub-tasks, comments, and history
- **Per-Sprint Backlog Blocks**: The Backlog groups stories into collapsible per-sprint blocks (plus an "unscheduled" block), with drag-and-drop between them and direct story creation into a specific sprint; only one sprint per project may be active or planned at a time
- **Epic Detail Page**: A dedicated page per epic — description, timeline, progress, and its full story list — reachable from the Epics board
- **Combined Search**: A top-bar search input with a live dropdown (stories, epics, sprints, and team members) and a full search-results page for broader queries
- **Two-Tab Settings Page**: Personal (theme, language) and Admin (color palette, email, backups) tabs, with the Admin tab only ever shown to admins
- **Configurable Email Delivery**: Admins can reconfigure SMTP/Gmail credentials, the "From" address, and a custom invite message/expiry at runtime from Settings — no server restart needed — with env-set fields locked read-only and secrets never echoed back
- **Backup & Restore**: Admins can configure scheduled database backups (local disk or S3, with a retention count), trigger one on demand, download any past backup, and restore the database from a backup — gated behind a typed `RESTORE` confirmation phrase given how destructive the action is
- **Internationalization**: Full English, Spanish, and Brazilian Portuguese support across the entire app, as a per-user preference (not per-project) changeable anytime from Settings, applied instantly with no page reload

### Phase 8 Additions
- **Two-Factor Authentication**: A per-user, opt-in security option (not tied to role) supporting authenticator apps (TOTP, always available) or email-delivered codes (offered only when the system's email settings are working), managed from the Personal tab of Settings — QR code or manual-entry setup, one-time backup recovery codes, and a login-time challenge step with a backup-code fallback and email resend. Enabling it is also the precondition for a set of sensitive actions: deleting a user, deleting a project, and removing a team member all require the *acting* admin/project-owner to have 2FA enabled, as does saving any admin-only system setting (color palette, email configuration, backup settings) or running/restoring a backup
- **reCAPTCHA**: Google reCAPTCHA v2 ("I'm not a robot") on the Login, Register, and Admin Setup pages, verified server-side — configured via environment variables and inactive by default, with no effect on any form until real keys are set
- **Kanban Assignee Filter**: Click a sprint-participant avatar next to the Kanban board's elapsed-time bar to show only that person's cards; click again (or "Show all users") to clear the filter
- **UI Polish**: The system Settings menu icon changed from a sun to a gear, now that Settings covers far more than dark mode; Kanban columns are a bit wider for readability

### Additional Features
- **Story Detail Page**: Full-page view with all story information
- **Team Collaboration**: Assign stories to team members
- **Custom Kanban Columns**: Configure column visibility and names

## Tech Stack

- **Frontend**: React with Vite
- **Backend**: Node.js with Express
- **Database**: PostgreSQL
- **Authentication**: OAuth 2.0 with JWT, plus optional per-user two-factor authentication (TOTP via `otplib`, or email codes)
- **Bot Protection**: Google reCAPTCHA v2 on Login/Register/Admin Setup (opt-in via environment variables)
- **Internationalization**: i18next / react-i18next (English, Spanish, Brazilian Portuguese)
- **Containerization**: Docker & Docker Compose

## Quick Start

### Prerequisites

- Docker and Docker Compose installed
- Node.js 18+ (for local development)

### Running with Docker

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd kartas
   ```

2. Copy environment variables:
   ```bash
   cp .env.example .env
   ```

3. Start all services:
   ```bash
   docker-compose up
   ```

4. Access the application:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000

### Email Configuration (optional)

Invitations work with a copyable link out of the box — no email setup required. To also send invites by email, set these in `.env` before starting the stack:

- `EMAIL_PROVIDER` — `smtp` (default) or `gmail`
- For `smtp`: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`
- For `gmail`: `GMAIL_USER` and `GMAIL_APP_PASSWORD` (a [Google App Password](https://myaccount.google.com/apppasswords) — requires 2-Step Verification, **not** your regular account password)
- `EMAIL_FROM` — optional sender display name/address

**Important**: Docker Compose only applies `.env` changes to a container at creation time. After editing `.env`, apply it with:
```bash
docker-compose up -d --force-recreate
```
Plain `docker-compose restart` does **not** re-read `.env` and will not pick up changes.

### reCAPTCHA Configuration (optional)

The Login, Register, and Admin Setup forms work without any CAPTCHA check out of the box. To enable Google reCAPTCHA v2, set these in `.env` before starting the stack (same `--force-recreate` requirement as above applies):

- `RECAPTCHA_SITE_KEY` — public key, exposed to the frontend
- `RECAPTCHA_SECRET_KEY` — server-only key, used for verification

Get a key pair at the [Google reCAPTCHA admin console](https://www.google.com/recaptcha/admin).

### Local Development

#### Backend (kartas-api)

```bash
cd kartas-api
npm install
npm run dev
```

#### Frontend (kartas-app)

```bash
cd kartas-app
npm install
npm run dev
```

## Project Structure

```
kartas/
├── kartas-api/          # Backend API
│   ├── src/
│   │   ├── config/    # Configuration files
│   │   ├── controllers/  # Business logic
│   │   ├── middleware/   # Express middleware
│   │   ├── migrations/   # Database migrations
│   │   ├── models/       # Database models
│   │   ├── routes/       # API routes
│   │   └── utils/        # Utility functions
│   └── tests/         # Backend tests
├── kartas-app/          # Frontend application
│   └── src/
│       ├── components/   # React components
│       ├── contexts/     # React contexts
│       ├── pages/        # Page components
│       └── services/     # API services
└── docker-compose.yml # Docker orchestration
```

## First Run

On first run, you'll be prompted to create an admin account. This admin can then invite other users to the platform.

## Development Phases

This project is being developed in phases:

- **Phase 1**: ✅ Core authentication, project management, and backlog
- **Phase 2**: ✅ Sprint management and kanban board
- **Phase 3**: ✅ UI/UX improvements, epic enhancements, and advanced features
- **Phase 4**: ✅ Critical fixes & UI polish · ✅ Backlog/epic hardening · ✅ Kanban header context · ✅ Sub-tasks system · ✅ Access control refinements · ✅ Email invitations & admin-created users · ✅ "For You" personal dashboard
- **Phase 5**: ✅ Navigation overhaul (top bar, breadcrumbs, sidebar project header) · ✅ Markdown descriptions (stories, epics, sub-items) · ✅ People-centric Kanban (avatar assignees, hover cards) · ✅ Per-project User Details page · ✅ Assignee management (unassign, Kanban context-menu parity) · ✅ Filter UI polish
- **Phase 6**: ✅ Kanban polish (participant avatars, view/edit modal parity) · ✅ Story comments & @mentions (people and tickets) · ✅ Story change history · ✅ "For You" page overhaul (customizable widget grid, Team Workload chart, Sprint Countdown, Latest Activities) · ✅ Dark mode · ✅ Admin-customizable system color palette · ✅ Uniform page margins
- **Phase 7**: ✅ Drag-and-drop library migration, tooltips & epic filter colors · ✅ Clone/migrate stories · ✅ Per-sprint backlog blocks · ✅ Epic Detail page & combined search · ✅ Two-tab Settings page & runtime email configuration · ✅ Database backup & restore · ✅ Internationalization (English, Spanish, Brazilian Portuguese)
- **Phase 8**: ✅ Two-factor authentication (TOTP & email, backup codes, gated deletions & admin settings) · ✅ Google reCAPTCHA on Login/Register/Admin Setup · ✅ Kanban assignee filter · ✅ Settings icon & Kanban column width polish

See [`DEVLOG.md`](./DEVLOG.md) for the detailed, dated changelog of every change, across every phase.

## Key Workflows

- **Create a Project**: Admin creates projects and invites team members
- **Manage Backlog**: Add stories, assign to epics, set story points
- **Plan Sprints**: Create sprints, add stories, set objectives
- **Track Progress**: Use Kanban board to move stories through workflow
- **Monitor Performance**: View sprint metrics and team velocity

## License

MIT
