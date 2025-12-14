#!/bin/bash
# Switch to SQLite for local development

echo "Switching to SQLite..."

# Update .env
cat > .env << 'ENVFILE'
DATABASE_URL="file:./dev.db"

NEXTAUTH_SECRET="local-dev-secret-change-in-production"
NEXTAUTH_URL="http://localhost:3000"

SMTP_HOST="smtp.mailtrap.io"
SMTP_PORT="2525"
SMTP_USER=""
SMTP_PASSWORD=""
SMTP_FROM="dev@yodha.local"

NEXT_PUBLIC_APP_URL="http://localhost:3000"
ENVFILE

# Update schema
sed -i '' 's/provider = "postgresql"/provider = "sqlite"/' prisma/schema.prisma
sed -i '' 's/directUrl = env("DIRECT_URL")//' prisma/schema.prisma

echo "✅ Switched to SQLite"
echo "Run: npx prisma migrate dev"
