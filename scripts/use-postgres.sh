#!/bin/bash
# Switch to PostgreSQL

echo "Switching to PostgreSQL..."

# Update .env
cat > .env << 'ENVFILE'
DATABASE_URL="postgresql://yodha:yodha_dev_password@localhost:5432/yodha_dev"
DIRECT_URL="postgresql://yodha:yodha_dev_password@localhost:5432/yodha_dev"

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
sed -i '' 's/provider = "sqlite"/provider = "postgresql"/' prisma/schema.prisma

echo "✅ Switched to PostgreSQL"
echo "Run: ./scripts/setup-local-db.sh"
