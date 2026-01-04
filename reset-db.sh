#!/bin/bash

# Database reset script for Kira
# This will drop and recreate the database, then run migrations

set -e

echo "🔄 Resetting Kira database..."

# Check if docker-compose is running
if ! docker-compose ps | grep -q "Up"; then
    echo "⚠️  Docker containers are not running. Starting them..."
    docker-compose up -d
    sleep 5
fi

echo "📦 Dropping existing database..."
docker-compose exec -T db psql -U kira_user -d postgres -c "DROP DATABASE IF EXISTS kira_db;"

echo "📦 Creating fresh database..."
docker-compose exec -T db psql -U kira_user -d postgres -c "CREATE DATABASE kira_db;"

echo "🔄 Running migrations..."
docker-compose exec -T api npm run migrate

echo "✅ Database reset complete!"
echo ""
echo "You can now access the application at http://localhost:5173"
echo "Create your admin account to get started."
