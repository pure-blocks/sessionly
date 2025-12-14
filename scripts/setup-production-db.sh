#!/bin/bash
set -e

echo "🚀 Production Database Setup Script"
echo "===================================="
echo ""

# Check if .env.production exists
if [ ! -f .env.production ]; then
    echo "❌ .env.production not found!"
    echo "📝 Please create .env.production with your database credentials"
    echo "   You can copy .env.production.example and fill in the values"
    exit 1
fi

# Load environment variables
export $(cat .env.production | grep -v '^#' | xargs)

echo "✅ Environment variables loaded"
echo ""

# Test database connection
echo "🔍 Testing database connection..."
if npx prisma db execute --stdin <<< "SELECT 1;" > /dev/null 2>&1; then
    echo "✅ Database connection successful!"
else
    echo "❌ Failed to connect to database"
    echo "   Please check your DATABASE_URL in .env.production"
    exit 1
fi

echo ""
echo "📦 Running database migrations..."
npx prisma migrate deploy

echo ""
echo "🔧 Generating Prisma Client..."
npx prisma generate

echo ""
echo "✅ Production database setup complete!"
echo ""
echo "Next steps:"
echo "1. Run 'npx prisma studio' to verify your database"
echo "2. Deploy to Vercel/Railway with the same environment variables"
echo "3. Monitor your database metrics in your provider's dashboard"
