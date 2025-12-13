# Authentication System

This booking platform now includes a complete authentication system using NextAuth.js.

## Features

- **Email/Password Authentication**: Secure credential-based login
- **Multi-tenant Support**: Users can be associated with specific tenants
- **Role-based Access Control**: Support for admin, provider, and user roles
- **Protected Routes**: Automatic redirection for unauthenticated users
- **Session Management**: JWT-based sessions for security and performance

## User Roles

- **admin**: Full access to tenant administration (provider management, availability, bookings)
- **provider**: Access to manage own availability and view bookings
- **user**: Basic client access for making bookings

## Getting Started

### 1. Create an Admin User

Use the provided script to create your first admin user:

```bash
npx tsx scripts/create-admin-user.ts <email> <password> [name] [tenantSlug]
```

Example:
```bash
npx tsx scripts/create-admin-user.ts admin@example.com mypassword123 "Admin User" yodha-strength
```

**Note**: Password must be at least 8 characters long.

### 2. Login

Visit the login page at:
```
http://localhost:3000/login
```

Enter your email and password to sign in.

### 3. Register New Users

Users can self-register at:
```
http://localhost:3000/register
```

If they provide a valid tenant slug during registration, they'll be assigned the admin role for that tenant.

## Protected Routes

The following routes require authentication:

- `/admin/*` - Admin dashboard and management pages
- `/trainer/*` - Provider/trainer pages

Unauthenticated users will be redirected to `/login` with a callback URL to return to their original destination after login.

## API Endpoints

### Register a New User
```
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword123",
  "tenantSlug": "my-tenant" // optional
}
```

### Sign In (handled by NextAuth)
```
POST /api/auth/signin
```

### Sign Out (handled by NextAuth)
```
POST /api/auth/signout
```

## Using Authentication in Your Code

### Client Components

```typescript
'use client'

import { useSession, signOut } from 'next-auth/react'

export default function MyComponent() {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return <div>Loading...</div>
  }

  if (!session) {
    return <div>Not authenticated</div>
  }

  return (
    <div>
      <p>Welcome, {session.user?.name}!</p>
      <p>Role: {session.user?.role}</p>
      <button onClick={() => signOut()}>Sign Out</button>
    </div>
  )
}
```

### Server Components

```typescript
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export default async function MyServerComponent() {
  const session = await getServerSession(authOptions)

  if (!session) {
    return <div>Not authenticated</div>
  }

  return <div>Welcome, {session.user?.name}!</div>
}
```

### API Routes

```typescript
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Your API logic here
}
```

## Environment Variables

Make sure these are set in your `.env` file:

```env
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-super-secret-key-change-this-in-production"
```

**Important**: Generate a secure random secret for production:
```bash
openssl rand -base64 32
```

## User Management

### List All Users
```bash
sqlite3 prisma/dev.db "SELECT id, name, email, role FROM User;"
```

### Check User's Tenant Association
```bash
sqlite3 prisma/dev.db "SELECT u.name, u.email, u.role, t.name as tenant FROM User u LEFT JOIN Tenant t ON u.tenantId = t.id;"
```

### Update User Role
```bash
sqlite3 prisma/dev.db "UPDATE User SET role = 'admin' WHERE email = 'user@example.com';"
```

## Testing the Authentication Flow

1. **Create a test user**:
   ```bash
   npx tsx scripts/create-admin-user.ts test@example.com testpass123 "Test User" yodha-strength
   ```

2. **Visit the login page**:
   ```
   http://localhost:3000/login
   ```

3. **Sign in with your credentials**:
   - Email: test@example.com
   - Password: testpass123

4. **Access protected routes**:
   ```
   http://localhost:3000/admin/yodha-strength
   ```

5. **Test the logout**:
   - Click the user menu in the top right
   - Click "Sign Out"

## Security Notes

- Passwords are hashed using bcrypt with 12 salt rounds
- Sessions use JWT tokens for stateless authentication
- Protected routes are enforced at the middleware level
- User data includes tenant association for multi-tenant security

## Customization

### Adding More User Fields

1. Update the Prisma schema in `prisma/schema.prisma`:
   ```prisma
   model User {
     // ... existing fields
     phone String?
     avatar String?
   }
   ```

2. Run migration:
   ```bash
   npx prisma migrate dev --name add_user_fields
   ```

3. Update the registration API and forms

### Changing Password Requirements

Edit the validation in:
- `app/api/auth/register/route.ts`
- `app/register/page.tsx`

### Adding Social Login (Google, GitHub, etc.)

1. Install provider package (if needed)
2. Add provider to `lib/auth.ts`:
   ```typescript
   import GoogleProvider from 'next-auth/providers/google'

   providers: [
     GoogleProvider({
       clientId: process.env.GOOGLE_CLIENT_ID!,
       clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
     }),
     // ... existing providers
   ]
   ```

3. Add environment variables for the provider

## Troubleshooting

### "Invalid credentials" error
- Verify the email exists in the database
- Check password was hashed correctly
- Ensure NEXTAUTH_SECRET is set

### Middleware redirect loop
- Check that `/login` and `/register` are in PUBLIC_PATHS
- Verify middleware configuration in `middleware.ts`

### Session not persisting
- Clear browser cookies
- Check NEXTAUTH_URL matches your domain
- Verify AuthProvider is wrapping your app in layout.tsx

## Creating a Tenant/Organization

### Option 1: Web UI (Recommended)

Visit the tenant creation page:
```
http://localhost:3000/create-tenant
```

Fill out the form with your organization details and provider type. The system will:
- Create your tenant/organization
- Set up default configuration
- Create your first provider type
- Associate your account as admin (if logged in)

### Option 2: Using the Script

```bash
npx tsx scripts/create-tenant.ts
```

Follow the interactive prompts to create a tenant.

### Option 3: API Call

```bash
curl -X POST http://localhost:3000/api/tenants \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Organization",
    "email": "contact@example.com",
    "slug": "my-org",
    "providerTypeName": "Trainers",
    "providerTypeNameSingular": "Trainer"
  }'
```

## Test User Created

An admin user has been created for testing:

- **Email**: admin@yodha.com
- **Password**: password123
- **Tenant**: yodha-strength
- **Role**: admin

You can login at: http://localhost:3000/login
Then visit: http://localhost:3000/admin/yodha-strength
