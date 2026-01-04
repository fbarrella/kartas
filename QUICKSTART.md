# Kira - Quick Start Guide

## What is Kira?

Kira is a modern, open-source alternative to Jira for agile team management. Built with React, Node.js, and PostgreSQL, it provides a comprehensive solution for managing backlogs, sprints, and kanban boards.

## Features (Phase 1 MVP)

✅ **User Management**
- Admin-controlled user registration
- Role-based access control (Admin, Project Owner, Member)
- Secure JWT authentication with token refresh

✅ **Project Management**
- Create and manage multiple projects/teams
- Unique ticket prefixes (auto-generated from project names)
- Team member management

✅ **Backlog Management**
- Create user stories, tasks, and bugs
- Story details: title, description, type, status, story points, assignee
- 8 status options: Backlog → Refining → Ready → In Development → Review → Test → Done → Cancelled
- Change history tracking
- Comments system

✅ **Smart Features**
- Automatic story ID generation (e.g., `GGY-0001`, `GGY-0042`)
- Unique ticket prefix with conflict resolution
- First-login password change requirement
- Responsive design with Jira-inspired UI

## Quick Start

### Option 1: Docker (Recommended)

```bash
# 1. Run the setup script
./setup.sh

# 2. Open your browser
# http://localhost:5173

# 3. Create your admin account
```

### Option 2: Manual Setup

```bash
# 1. Copy environment variables
cp .env.example .env

# 2. Start services
docker-compose up -d

# 3. Run migrations
docker-compose exec api npm run migrate

# 4. Open browser
# http://localhost:5173
```

## Project Structure

```
kira/
├── kira-api/          # Backend (Node.js + Express + PostgreSQL)
├── kira-app/          # Frontend (React + Vite)
├── docker-compose.yml # Container orchestration
├── setup.sh           # Automated setup script
└── README.md          # Full documentation
```

## Default Ports

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **PostgreSQL**: localhost:5432

## First Steps After Setup

1. **Create Admin Account**
   - You'll be automatically redirected on first visit
   - Fill in your details to create the admin account

2. **Create Your First Project**
   - Click "Create Project" on the dashboard
   - Enter project name (e.g., "Good Guys")
   - Ticket prefix will be auto-generated (e.g., "GGY")

3. **Add User Stories**
   - Navigate to your project
   - Click "Backlog"
   - Click "Create Story"
   - Fill in story details

## User Roles

- **Admin**: Full system access, can create projects and manage all users
- **Project Owner**: Can create projects and manage their teams
- **Member**: Can view and work on assigned projects

## Story Types

- 📖 **Story**: User stories and features
- ✓ **Task**: Technical tasks
- 🐛 **Bug**: Bug reports and fixes

## Story Statuses

1. **Backlog** - Not yet started
2. **Refining** - Being refined/estimated
3. **Ready** - Ready for development
4. **In Development** - Currently being worked on
5. **Review** - In code review
6. **Test** - In testing
7. **Done** - Completed
8. **Cancelled** - Cancelled/won't do

## Development Commands

### Backend (kira-api)

```bash
cd kira-api
npm install          # Install dependencies
npm run dev          # Start dev server
npm test             # Run tests
npm run migrate      # Run database migrations
```

### Frontend (kira-app)

```bash
cd kira-app
npm install          # Install dependencies
npm run dev          # Start dev server
npm run build        # Build for production
npm test             # Run tests
```

### Docker

```bash
docker-compose up           # Start all services
docker-compose down         # Stop all services
docker-compose down -v      # Stop and remove volumes (reset database)
docker-compose logs -f      # View logs
docker-compose logs -f api  # View API logs only
docker-compose restart      # Restart all services
```

## Troubleshooting

### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker-compose ps

# View database logs
docker-compose logs postgres

# Restart database
docker-compose restart postgres
```

### API Not Starting

```bash
# View API logs
docker-compose logs api

# Ensure migrations ran
docker-compose exec api npm run migrate
```

### Frontend Build Issues

```bash
# Clear node_modules and reinstall
cd kira-app
rm -rf node_modules
npm install
```

## Security Notes

> [!WARNING]
> **Before Production Deployment**
> 
> Update these values in `.env`:
> - `POSTGRES_PASSWORD` - Use a strong password
> - `JWT_SECRET` - Generate a random secret (32+ characters)
> - `JWT_REFRESH_SECRET` - Generate a different random secret
> - Set `NODE_ENV=production`
> - Enable HTTPS/SSL

## What's Coming in Phase 2

- 🎯 Sprint management (create, start, end sprints)
- 📊 Kanban board with drag-and-drop
- 🎨 Customizable board columns
- 📈 Sprint metrics and reporting
- 👥 User invitation system via email
- 🏷️ Epic management
- 🔍 Advanced filtering and search

## Support & Documentation

- **Full Documentation**: See [README.md](file:///home/fenetto/Documents/Repos/js/kira/README.md)
- **Implementation Details**: See [walkthrough.md](file:///home/fenetto/.gemini/antigravity/brain/b05a3df8-a86f-4451-b7b7-08d3e8ac5bd0/walkthrough.md)
- **Database Schema**: See [001_initial_schema.sql](file:///home/fenetto/Documents/Repos/js/kira/kira-api/src/migrations/001_initial_schema.sql)

## License

MIT License - Feel free to use and modify for your needs!

---

**Happy Project Managing! 🚀**
