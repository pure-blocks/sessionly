# Production Database Setup Guide

## Step 1: Choose Your Database Provider

### Recommended: Supabase (Best for this project)
- **Free tier**: 500MB database, unlimited API requests
- **Built-in auth** (optional alternative to NextAuth)
- **Real-time** capabilities
- **Good for multi-tenant apps**

**Setup:**
1. Go to [supabase.com](https://supabase.com) → New Project
2. Choose region closest to your users
3. Wait for provisioning (~2 minutes)
4. Go to Settings → Database → Connection String
5. Copy both:
   - **Connection pooling** (for DATABASE_URL)
   - **Direct connection** (for DIRECT_URL)
postgresql://postgres:[YOUR_PASSWORD]@db.elckcyjhmbprksrwpmvo.supabase.co:5432/postgres
### Alternative: Neon
- **Free tier**: 3GB storage
- **Serverless** with instant scaling
- **Branching** for preview deployments

**Setup:**
1. Go to [neon.tech](https://neon.tech) → New Project
2. Copy connection strings from dashboard

### Alternative: Railway
- **$5 free credit/month**
- **Simple setup**

**Setup:**
1. Go to [railway.app](https://railway.app)
2. New Project → Add PostgreSQL
3. Copy DATABASE_URL from Variables tab

## Step 2: Update Environment Variables

Create `.env.production` (don't commit this!):

```bash
# Copy from your database provider
DATABASE_URL="postgresql://user:password@host:5432/db?pgbouncer=true"
DIRECT_URL="postgresql://user:password@host:5432/db"

# Generate this: openssl rand -base64 32
NEXTAUTH_SECRET="your-secret-here"
NEXTAUTH_URL="https://yourdomain.com"

# Your SMTP settings
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASSWORD="your-app-password"
SMTP_FROM="Your Name <your-email@gmail.com>"

NEXT_PUBLIC_APP_URL="https://yourdomain.com"
```

## Step 3: Run Database Migrations

```bash
# Generate a new migration for PostgreSQL
npx prisma migrate dev --name init_postgres

# Or if you have data in SQLite to migrate:
# 1. Export SQLite data first
# 2. Then run migration
npx prisma migrate deploy
```

## Step 4: Generate Prisma Client

```bash
npx prisma generate
```

## Step 5: Seed Initial Data (Optional)

If you need initial tenant data:

```bash
npx prisma db seed
```

## Step 6: Verify Connection

```bash
npx prisma studio
```

This opens a GUI to verify your database is connected and migrations ran.

## Step 7: Deploy

### Vercel Deployment

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project
3. Import your GitHub repo
4. Add environment variables:
   - DATABASE_URL
   - DIRECT_URL
   - NEXTAUTH_SECRET
   - NEXTAUTH_URL (set to your Vercel URL)
   - All SMTP variables
5. Deploy!

**Important**: In Vercel, set `NEXTAUTH_URL` to your production domain:
```
NEXTAUTH_URL=https://your-app.vercel.app
```

### Railway/Render Deployment

Add a `build.sh` script:

```bash
#!/bin/bash
npx prisma migrate deploy
npx prisma generate
npm run build
```

## Common Issues & Solutions

### Issue: "Prepared statement already exists"
**Solution**: Add to DATABASE_URL: `?pgbouncer=true&connection_limit=1`

### Issue: Migration fails
**Solution**: Use DIRECT_URL for migrations:
```bash
DATABASE_URL=$DIRECT_URL npx prisma migrate deploy
```

### Issue: Connection pool exhausted
**Solution**: In production, use connection pooling:
- Supabase: Use pooled connection string (port 6543)
- Neon: Enable connection pooling in settings
- Add `connection_limit=1` to DATABASE_URL

### Issue: Timezone issues
**Solution**: Add to DATABASE_URL: `&timezone=UTC`

## Database Backup Strategy

### Automated Backups
- **Supabase**: Automatic daily backups (free tier: 7 days retention)
- **Neon**: Point-in-time restore (free tier: 7 days)
- **Railway**: Automatic backups included

### Manual Backup
```bash
# Export schema
npx prisma db pull

# Export data (if needed)
pg_dump $DATABASE_URL > backup.sql
```

## Performance Tips

1. **Enable connection pooling** (already done in .env.example)
2. **Add database indexes** for frequently queried fields:
   ```prisma
   @@index([tenantId])
   @@index([email])
   @@index([slug])
   ```
3. **Use read replicas** for scaling (Supabase Pro plan)
4. **Monitor slow queries** via provider dashboard

## Security Checklist

- [ ] Never commit `.env` files
- [ ] Use strong `NEXTAUTH_SECRET` (32+ characters)
- [ ] Enable SSL for database connections
- [ ] Use different databases for staging/production
- [ ] Restrict database access to your app's IP (if possible)
- [ ] Enable row-level security (Supabase)
- [ ] Regular backups enabled
- [ ] Monitor for unusual activity

## Migration from SQLite (If needed)

If you have existing SQLite data you want to migrate:

```bash
# 1. Export SQLite data
sqlite3 prisma/dev.db .dump > data.sql

# 2. Convert to PostgreSQL format (manual or use online tool)
# 3. Import to PostgreSQL
psql $DIRECT_URL < converted_data.sql

# 4. Verify data
npx prisma studio
```

## Next Steps

1. Set up your database provider
2. Update `.env` with connection strings
3. Run migrations: `npx prisma migrate deploy`
4. Test locally with production DB
5. Deploy to Vercel/Railway
6. Monitor database metrics

Need help? Check:
- [Prisma Docs](https://www.prisma.io/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Vercel Deployment](https://vercel.com/docs)
