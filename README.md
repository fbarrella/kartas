# Kira - Project Management Tool

A modern, comprehensive alternative to Jira for agile team management, built with React, Node.js, and PostgreSQL.

## Features

- **Backlog Management**: Create and organize user stories, tasks, and bugs
- **Sprint Planning**: Plan and manage sprints with objectives and timelines
- **Kanban Board**: Visualize work with customizable columns and drag-and-drop
- **Epic Management**: Group related stories under epics
- **User Management**: Role-based access control with admin and project owner roles
- **Metrics & Reporting**: Track team velocity and sprint performance
- **Sub-tasks & Sub-tests**: Break down stories into manageable pieces

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

- **Phase 1 (Current)**: Core authentication, project management, and backlog
- **Phase 2**: Sprint management and kanban board
- **Phase 3**: Metrics, reporting, and advanced features

## License

MIT
