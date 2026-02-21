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
docker-compose exec -T postgres psql -U kartasadmin -d kartasdb -c "DROP DATABASE IF EXISTS kartasdb;"

echo "📦 Creating fresh database..."
docker-compose exec -T postgres psql -U kartasadmin -d kartasdb -c "CREATE DATABASE kartasdb;"

echo "🔄 Running migrations..."
docker-compose exec -T api npm run migrate

echo "✅ Database reset complete!"
echo ""
echo "You can now access the application at http://localhost:5173"
echo "Create your admin account to get started."
