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

### Additional Features
- **Story Detail Page**: Full-page view with all story information
- **Team Collaboration**: Assign stories to team members
- **Custom Kanban Columns**: Configure column visibility and names

## Tech Stack

- **Frontend**: React with Vite
- **Backend**: Node.js with Express
- **Database**: PostgreSQL
- **Authentication**: OAuth 2.0 with JWT
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

See [`DEVLOG.md`](./DEVLOG.md) for the detailed, dated changelog of every Phase 4 change.

## Key Workflows

- **Create a Project**: Admin creates projects and invites team members
- **Manage Backlog**: Add stories, assign to epics, set story points
- **Plan Sprints**: Create sprints, add stories, set objectives
- **Track Progress**: Use Kanban board to move stories through workflow
- **Monitor Performance**: View sprint metrics and team velocity

## License

MIT
