#!/bin/bash

# Kartas Setup Script
# This script helps set up the Kartas project management tool

set -e

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
    docker-compose up -d
    
    echo ""
    echo "⏳ Waiting for database to be ready..."
    sleep 5
    
    echo "📊 Running database migrations..."
    docker-compose exec -T api npm run migrate
    
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
