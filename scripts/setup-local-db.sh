#!/bin/bash
set -e

echo "🐳 Setting up Local PostgreSQL Database"
echo "======================================="
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running!"
    echo "   Please start Docker Desktop and try again"
    exit 1
fi

echo "✅ Docker is running"
echo ""

# Start PostgreSQL
echo "🚀 Starting PostgreSQL container..."
docker-compose up -d

echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 3

# Check if PostgreSQL is ready
until docker exec yodha-postgres pg_isready -U yodha > /dev/null 2>&1; do
    echo "   Waiting for database..."
    sleep 1
done

echo "✅ PostgreSQL is ready!"
echo ""

# Run migrations
echo "📦 Running database migrations..."
npx prisma migrate dev --name init

echo ""
echo "🔧 Generating Prisma Client..."
npx prisma generate

echo ""
echo "✅ Local database setup complete!"
echo ""
echo "Database Info:"
echo "  Host: localhost:5432"
echo "  Database: yodha_dev"
echo "  User: yodha"
echo "  Password: yodha_dev_password"
echo ""
echo "Useful commands:"
echo "  npm run dev              - Start development server"
echo "  npx prisma studio        - Open database GUI"
echo "  docker-compose logs -f   - View database logs"
echo "  docker-compose down      - Stop database"
