# Provider Invitation & Management Workflow

This document explains how the provider invitation system works in the Yodha application.

## Overview

When an admin creates a provider in the system, the following happens automatically:

1. A **Provider** record is created in the database
2. A **User** account is created with the provider's email and role "provider"
3. A secure temporary password is generated
4. An **invitation email** is sent to the provider with login credentials
5. The provider can log in and manage their availability/bookings

## Admin Creates Provider

### API Endpoint
```
POST /api/[tenantSlug]/providers
```

### Request Body
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "providerTypeId": "clxxx...",
  "bio": "Experienced personal trainer",
  "categoryId": "clyyy...",
  "profileImageUrl": "https://...",
  "defaultHourlyRate": 75.00
}
```

### Response
```json
{
  "message": "Provider created successfully. Invitation email sent.",
  "provider": {
    "id": "clzzz...",
    "name": "John Doe",
    "email": "john@example.com",
    "slug": "john-doe",
    ...
  },
  "credentials": {
    "email": "john@example.com",
    "temporaryPassword": "aB3$xY9@kL2!"
  }
}
```

**Note:** The temporary password is returned in the response so the admin can manually share it if the email fails to deliver.

## What Happens Behind the Scenes

### 1. User Account Creation
```typescript
// Check if user already exists with this email
let user = await prisma.user.findUnique({
  where: { email }
})

// Create new user if doesn't exist
if (!user) {
  user = await prisma.user.create({
    data: {
      name: "John Doe",
      email: "john@example.com",
      password: hashedPassword, // BCrypt hashed
      tenantId: "tenant-id",
      role: "provider"
    }
  })
}
```

### 2. Provider Record Creation
```typescript
const provider = await prisma.provider.create({
  data: {
    tenantId,
    providerTypeId,
    name,
    email,
    slug, // Auto-generated unique slug
    bio,
    profileImageUrl,
    categoryId,
    defaultHourlyRate,
    isActive: true,
    acceptingBookings: true
  }
})
```

### 3. Link User to Provider
```typescript
// Update user record to link to provider
await prisma.user.update({
  where: { id: user.id },
  data: { providerId: provider.id }
})
```

### 4. Send Invitation Email
The provider receives a professionally formatted email containing:
- Welcome message
- Login credentials (email + temporary password)
- Login URL (specific to the tenant)
- Getting started guide with 4 steps
- Security warning to change password

## Provider Receives Email

The invitation email includes:

### Login Credentials Box
```
Email: john@example.com
Password: aB3$xY9@kL2!
```

### Login URL
```
https://yourdomain.com/[tenant-slug]/login
```

### Getting Started Steps
1. Click the button to access the login page
2. Log in using the credentials provided
3. Complete your profile and add your bio
4. Set up your availability and start accepting bookings

## Provider First Login

### Login Process
1. Provider visits: `https://yourdomain.com/[tenant-slug]/login`
2. Enters email: `john@example.com`
3. Enters temporary password: `aB3$xY9@kL2!`
4. Successfully logs in with role "provider"

### After Login
The provider can:
- **View Dashboard** - See upcoming bookings and statistics
- **Manage Profile** - Update bio, profile image, rates, etc.
- **Set Availability** - Create available time slots for bookings
- **View Bookings** - See confirmed bookings and client details
- **Update Settings** - Change password, notification preferences

## Password Security

### Temporary Password Generation
Passwords are generated using `lib/password.ts`:
- **Length:** 12 characters
- **Composition:**
  - Lowercase letters (a-z)
  - Uppercase letters (A-Z)
  - Numbers (0-9)
  - Special characters (!@#$%^&*)
- **Randomization:** Cryptographically secure random generation
- **Hashing:** BCrypt with salt rounds = 12

### Password Change
Providers should change their password on first login:
1. Navigate to Settings/Profile
2. Click "Change Password"
3. Enter temporary password
4. Enter new password (min 8 characters)
5. Confirm new password

## Email Templates

The invitation email template is located in `lib/email.ts` under the `sendProviderInvitation()` function.

### Customization
To customize the invitation email:
1. Open `lib/email.ts`
2. Find `sendProviderInvitation()`
3. Modify the HTML template
4. Update styling in the `<style>` section
5. Restart your application

### Template Variables
```typescript
interface ProviderInvitationData {
  providerName: string
  providerEmail: string
  tenantName: string
  tenantSlug: string
  loginUrl: string
  email: string
  temporaryPassword: string
  providerType: string
}
```

## Provider Dashboard Routes

Providers have access to the following routes (example):
- `/[tenantSlug]/provider/dashboard` - Main dashboard
- `/[tenantSlug]/provider/availability` - Manage availability
- `/[tenantSlug]/provider/bookings` - View bookings
- `/[tenantSlug]/provider/profile` - Edit profile
- `/[tenantSlug]/provider/settings` - Account settings

## API Endpoints for Providers

Once logged in, providers can use these endpoints:

### Get Provider's Bookings
```
GET /api/[tenantSlug]/bookings?providerId={providerId}
```

### Manage Availability
```
POST /api/availability
GET /api/availability?trainerId={providerId}
PUT /api/availability/[id]
DELETE /api/availability/[id]
```

### Update Provider Profile
```
PATCH /api/[tenantSlug]/providers/[id]
```

## Handling Edge Cases

### Email Already Exists
If a user with the provider's email already exists:
- The existing user is linked to the new provider
- No new user account is created
- The provider can log in with their existing credentials
- **No invitation email is sent** (to avoid confusion)

To handle this, you may want to add a check:
```typescript
if (existingUser) {
  return NextResponse.json({
    message: "Provider created. User already exists - no email sent.",
    provider,
    note: "Provider already has an account in the system"
  })
}
```

### Email Delivery Failure
If the email fails to send:
- The provider and user are still created successfully
- An error is logged to the console
- The admin receives the credentials in the API response
- The admin can manually share the credentials

### Provider Role Permissions
The provider role has specific permissions:
- **Can:** View own bookings, manage availability, update profile
- **Cannot:** Create other providers, view all bookings, manage tenant settings
- **Tenant-scoped:** Only access data within their tenant

## Testing Provider Invitation

### Manual Test
1. Create a provider via API or admin UI
2. Check the provider's email inbox
3. Click the login link
4. Log in with temporary credentials
5. Verify provider dashboard access

### API Test
```bash
curl -X POST http://localhost:3000/api/your-tenant/providers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Provider",
    "email": "provider@test.com",
    "providerTypeId": "clxxx...",
    "bio": "Test bio"
  }'
```

Check the response for:
- `credentials.temporaryPassword`
- Successful provider creation message

## Best Practices

1. **Secure Password Storage**
   - Never log passwords to console
   - Only return password in API response (one-time)
   - Encourage password change on first login

2. **Email Deliverability**
   - Use verified sender email addresses
   - Configure SPF and DKIM records
   - Test email delivery before production

3. **User Experience**
   - Clear instructions in invitation email
   - Simple login process
   - Guided onboarding for new providers

4. **Security**
   - Use HTTPS for all login pages
   - Implement rate limiting on login attempts
   - Add email verification for extra security

5. **Communication**
   - Admin should inform provider to expect email
   - Have backup method to share credentials
   - Provide support contact for login issues

## Troubleshooting

### Provider didn't receive email
1. Check spam/junk folder
2. Verify SMTP configuration in `.env`
3. Check server logs for email errors
4. Manually share credentials from API response

### Provider can't log in
1. Verify email address is correct
2. Check password (case-sensitive)
3. Ensure provider role is set correctly
4. Verify tenant slug in login URL

### Provider sees wrong tenant data
1. Check provider's `tenantId` in database
2. Verify login URL uses correct tenant slug
3. Ensure middleware properly scopes data

## Future Enhancements

Potential improvements to the provider invitation system:

- **Magic Link Login** - Send one-time login link instead of password
- **Two-Factor Authentication** - Add 2FA for provider accounts
- **Onboarding Wizard** - Step-by-step setup after first login
- **Email Verification** - Require email verification before login
- **Password Reset Flow** - Forgot password functionality
- **Invitation Expiry** - Temporary passwords expire after X days
- **Resend Invitation** - Allow admin to resend invitation email

## Related Files

- `app/api/[tenantSlug]/providers/route.ts` - Provider creation API
- `lib/email.ts` - Email templates including `sendProviderInvitation()`
- `lib/password.ts` - Secure password generation
- `prisma/schema.prisma` - User and Provider models
- `EMAIL_CONFIGURATION.md` - General email configuration guide
