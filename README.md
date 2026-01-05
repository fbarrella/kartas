# Kira - Project Management Tool

A modern, comprehensive alternative to Jira for agile team management, built with React, Node.js, and PostgreSQL.

## Features

### Core Features
- **Backlog Management**: Create and organize user stories, tasks, and bugs with advanced filtering
- **Sprint Planning**: Plan and manage sprints with objectives, timelines, and progress tracking
- **Kanban Board**: Visualize work with customizable columns, drag-and-drop, and context menus
- **Epic Management**: Group related stories under epics with color coding and progress visualization
- **User Management**: Role-based access control with admin and project owner roles
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

### Additional Features
- **Sub-tasks & Sub-tests**: Break down stories into manageable pieces
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
   cd kira
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

### Local Development

#### Backend (kira-api)

```bash
cd kira-api
npm install
npm run dev
```

#### Frontend (kira-app)

```bash
cd kira-app
npm install
npm run dev
```

## Project Structure

```
kira/
├── kira-api/          # Backend API
│   ├── src/
│   │   ├── config/    # Configuration files
│   │   ├── controllers/  # Business logic
│   │   ├── middleware/   # Express middleware
│   │   ├── migrations/   # Database migrations
│   │   ├── models/       # Database models
│   │   ├── routes/       # API routes
│   │   └── utils/        # Utility functions
│   └── tests/         # Backend tests
├── kira-app/          # Frontend application
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
- **Phase 4** (Planned): Advanced metrics, reporting, and team analytics

## Key Workflows

- **Create a Project**: Admin creates projects and invites team members
- **Manage Backlog**: Add stories, assign to epics, set story points
- **Plan Sprints**: Create sprints, add stories, set objectives
- **Track Progress**: Use Kanban board to move stories through workflow
- **Monitor Performance**: View sprint metrics and team velocity

## License

MIT
