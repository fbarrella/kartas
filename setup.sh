#!/bin/bash

# Kartas Setup Script
# This script helps set up the Kartas project management tool

echo "🚀 Kartas Setup Script"
echo "======================="
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from .env.example..."
    cp .env.example .env
    echo "✓ .env file created"
    echo ""
    echo "⚠️  IMPORTANT: Please update the following in .env before production:"
    echo "   - POSTGRES_PASSWORD"
    echo "   - JWT_SECRET"
    echo "   - JWT_REFRESH_SECRET"
    echo ""
else
    echo "✓ .env file already exists"
    echo ""
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    echo "   Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    echo "   Visit: https://docs.docker.com/compose/install/"
    exit 1
fi

echo "✓ Docker and Docker Compose are installed"
echo ""

# Ask user if they want to start services
read -p "Do you want to start the services now? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🐳 Starting Docker services..."

    # Start services — capture exit code explicitly instead of using set -e
    if ! docker-compose up -d; then
        echo ""
        echo "❌ Failed to start Docker services."
        echo "   Common causes:"
        echo "   • Port 3000 or 5173 is already in use — stop the conflicting process and re-run."
        echo "   • Docker daemon is not running — start Docker and re-run."
        echo ""
        echo "   To check which process is using a port:"
        echo "     sudo lsof -i :3000"
        echo "     sudo lsof -i :5173"
        exit 1
    fi

    echo ""
    echo "⏳ Waiting for API container to reach the database..."

    # Poll until the api container can successfully connect to postgres.
    # This avoids the EAI_AGAIN DNS race condition that a bare sleep triggers.
    MAX_WAIT=60
    WAITED=0
    until docker-compose exec -T api node --input-type=module --eval \
        'import pool from "/app/src/config/database.js"; pool.query("SELECT 1").then(()=>process.exit(0)).catch(()=>process.exit(1))' \
        2>/dev/null; do
        if [ "$WAITED" -ge "$MAX_WAIT" ]; then
            echo ""
            echo "❌ Database did not become reachable within ${MAX_WAIT}s."
            echo "   Check logs with: docker-compose logs postgres && docker-compose logs api"
            exit 1
        fi
        sleep 3
        WAITED=$((WAITED + 3))
        printf "   ... still waiting (%ds / %ds)\n" "$WAITED" "$MAX_WAIT"
    done

    echo "✓ Database is ready"
    echo ""
    echo "📊 Running database migrations..."

    if ! docker-compose exec -T api npm run migrate; then
        echo ""
        echo "❌ Migration failed. Check logs with: docker-compose logs api"
        exit 1
    fi

    echo ""
    echo "✅ Setup complete!"
    echo ""
    echo "🌐 Access the application:"
    echo "   Frontend: http://localhost:5173"
    echo "   Backend API: http://localhost:3000"
    echo ""
    echo "📝 Next steps:"
    echo "   1. Open http://localhost:5173 in your browser"
    echo "   2. Create your admin account"
    echo "   3. Start creating projects!"
    echo ""
    echo "📋 Useful commands:"
    echo "   View logs:        docker-compose logs -f"
    echo "   Stop services:    docker-compose down"
    echo "   Restart services: docker-compose restart"
    echo ""
else
    echo ""
    echo "Setup files are ready. To start the services later, run:"
    echo "   docker-compose up"
    echo ""
fi
