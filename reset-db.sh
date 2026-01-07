#!/bin/bash

# Database reset script for Kartas
# This will drop and recreate the database, then run migrations

set -e

echo "🔄 Resetting Kartas database..."

# Check if docker-compose is running
if ! docker-compose ps | grep -q "Up"; then
    echo "⚠️  Docker containers are not running. Starting them..."
    docker-compose up -d
    sleep 5
fi

echo "📦 Dropping existing database..."
docker-compose exec -T postgres psql -U kartas_user -d postgres -c "DROP DATABASE IF EXISTS kartas_db;"

echo "📦 Creating fresh database..."
docker-compose exec -T postgres psql -U kartas_user -d postgres -c "CREATE DATABASE kartas_db;"

echo "🔄 Running migrations..."
docker-compose exec -T api npm run migrate

echo "✅ Database reset complete!"
echo ""
echo "You can now access the application at http://localhost:5173"
echo "Create your admin account to get started."
