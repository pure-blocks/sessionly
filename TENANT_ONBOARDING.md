# Tenant Onboarding Guide

This guide explains how to onboard new tenants to your multi-tenant booking platform.

## Overview

Each tenant represents an organization (e.g., a gym, spa, consulting firm) that will:
- Have their own booking URL: `/{tenant-slug}/book`
- Manage their own providers (trainers, consultants, therapists, etc.)
- Configure their own services and availability
- Have isolated data from other tenants

---

## Method 1: Using the CLI Script (Recommended)

### Quick Start

```bash
npx tsx scripts/create-tenant.ts "Tenant Name" "admin@email.com" "tenant-slug"
```

### Examples

**Create a gym:**
```bash
npx tsx scripts/create-tenant.ts "Acme Fitness" "admin@acmefitness.com" "acme-fitness"
```

**Create a spa:**
```bash
npx tsx scripts/create-tenant.ts "Zen Spa" "contact@zenspa.com" "zen-spa"
```

**Create a consulting firm:**
```bash
npx tsx scripts/create-tenant.ts "Tech Consultants" "hello@techconsultants.com" "tech-consultants"
```

### Custom Configuration

Edit `scripts/create-tenant.ts` to customize:
```typescript
const tenantData: TenantInput = {
  name: 'Your Business Name',
  email: 'admin@yourbusiness.com',
  slug: 'your-business',  // Optional: auto-generated if not provided
  description: 'What your business does',
  phone: '+1-555-0123',
  website: 'https://yourbusiness.com',
  primaryColor: '#3B82F6',    // Your brand color
  secondaryColor: '#10B981',   // Secondary brand color
  timezone: 'America/New_York',
  currency: 'USD',
  providerTypeName: 'Personal Trainers',  // Or 'Consultants', 'Therapists', etc.
  providerTypeNameSingular: 'Personal Trainer',
  providerTypeDescription: 'Description of this provider type',
}
```

---

## Method 2: Using the API

### Create a Tenant

**Endpoint:** `POST /api/tenants`

**Request Body:**
```json
{
  "name": "Acme Fitness",
  "email": "admin@acmefitness.com",
  "slug": "acme-fitness",
  "description": "Professional fitness and wellness center",
  "phone": "+1-555-0123",
  "website": "https://acmefitness.com",
  "primaryColor": "#3B82F6",
  "secondaryColor": "#10B981",
  "timezone": "America/New_York",
  "currency": "USD",
  "providerTypeName": "Personal Trainers",
  "providerTypeNameSingular": "Personal Trainer",
  "providerTypeDescription": "Certified fitness trainers"
}
```

**Required Fields:**
- `name`: Tenant name
- `email`: Contact email

**Optional Fields:**
- `slug`: URL-friendly identifier (auto-generated if not provided)
- `description`: Brief description
- `phone`: Contact phone
- `website`: Website URL
- `primaryColor`: Hex color for branding
- `secondaryColor`: Secondary hex color
- `timezone`: Timezone (default: UTC)
- `currency`: Currency code (default: USD)
- `providerTypeName`: Initial provider type name (default: "Service Providers")
- `providerTypeNameSingular`: Singular form
- `providerTypeDescription`: Description of the provider type

**Example with curl:**
```bash
curl -X POST http://localhost:3000/api/tenants \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Acme Fitness",
    "email": "admin@acmefitness.com",
    "description": "Professional fitness center",
    "providerTypeName": "Personal Trainers"
  }'
```

**Success Response (201):**
```json
{
  "message": "Tenant created successfully",
  "tenant": {
    "id": "cm4xyz...",
    "name": "Acme Fitness",
    "slug": "acme-fitness",
    "email": "admin@acmefitness.com",
    "bookingUrl": "/acme-fitness/book",
    "adminUrl": "/admin/acme-fitness"
  }
}
```

### List All Tenants

**Endpoint:** `GET /api/tenants`

**Example:**
```bash
curl http://localhost:3000/api/tenants
```

**Response:**
```json
{
  "tenants": [
    {
      "id": "cm4xyz...",
      "name": "Acme Fitness",
      "slug": "acme-fitness",
      "email": "admin@acmefitness.com",
      "description": "Professional fitness center",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "_count": {
        "providers": 5,
        "providerTypes": 2,
        "bookings": 42
      }
    }
  ]
}
```

---

## What Gets Created

When you onboard a tenant, the following is automatically created:

1. **Tenant Record**
   - Unique slug for URLs
   - Branding configuration
   - Contact information

2. **Tenant Configuration**
   - Default booking settings (60 min notice, 90 days advance)
   - Slot settings (60 min duration, no buffer)
   - Notification settings (confirmation & reminder emails)

3. **Default Provider Type** (optional)
   - A provider type like "Personal Trainers", "Consultants", etc.
   - Default slot settings (60 min, capacity 1)
   - You can add more provider types later

---

## Next Steps After Onboarding

### 1. Add Providers

Providers are the people who offer services (trainers, consultants, therapists).

**Via API:**
```bash
curl -X POST http://localhost:3000/api/acme-fitness/providers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Smith",
    "email": "john@acmefitness.com",
    "bio": "Certified personal trainer with 10 years experience",
    "providerTypeId": "provider-type-id"
  }'
```

### 2. Configure Services (Optional)

Create service templates that providers can offer:
- 30-min consultation
- 60-min training session
- Group fitness class

### 3. Add Availability

Providers need to set their availability for bookings:
```bash
curl -X POST http://localhost:3000/api/acme-fitness/availability/bulk \
  -H "Content-Type: application/json" \
  -d '{
    "trainerId": "provider-id",
    "dates": ["2024-01-15", "2024-01-16"],
    "timeSlots": [
      { "startTime": "09:00", "endTime": "10:00" },
      { "startTime": "10:00", "endTime": "11:00" }
    ]
  }'
```

### 4. Share Booking URL

Give clients the booking URL: `http://localhost:3000/acme-fitness/book`

---

## URL Structure

Each tenant has their own URL namespace:

- **Public Booking:** `/{tenant-slug}/book`
- **Admin Portal:** `/admin/{tenant-slug}`
- **API Endpoints:** `/api/{tenant-slug}/*`

**Example for "acme-fitness":**
- Public: `http://localhost:3000/acme-fitness/book`
- Admin: `http://localhost:3000/admin/acme-fitness`
- API: `http://localhost:3000/api/acme-fitness/providers`

---

## Common Use Cases

### Fitness Gym
```bash
npx tsx scripts/create-tenant.ts \
  "PowerFit Gym" \
  "admin@powerfitgym.com" \
  "powerfit-gym"
```
Provider Types: Personal Trainers, Nutritionists, Yoga Instructors

### Spa & Wellness
```bash
npx tsx scripts/create-tenant.ts \
  "Serenity Spa" \
  "info@serenityspa.com" \
  "serenity-spa"
```
Provider Types: Massage Therapists, Estheticians, Wellness Coaches

### Consulting Firm
```bash
npx tsx scripts/create-tenant.ts \
  "Tech Advisors" \
  "hello@techadvisors.com" \
  "tech-advisors"
```
Provider Types: Technology Consultants, Business Analysts, Project Managers

### Medical Clinic
```bash
npx tsx scripts/create-tenant.ts \
  "HealthFirst Clinic" \
  "contact@healthfirst.com" \
  "healthfirst-clinic"
```
Provider Types: Doctors, Nurses, Physical Therapists

---

## Troubleshooting

### Slug Already Exists
If you get an error that the slug already exists, either:
1. Choose a different slug
2. Let the system auto-generate one by not providing a slug

### Cannot Connect to Database
Ensure your database is running and `.env` file has correct `DATABASE_URL`

### Provider Type Not Created
Check that you provided `providerTypeName` in the request/script

---

## Advanced: Multiple Provider Types

After creating a tenant, you can add more provider types:

```bash
curl -X POST http://localhost:3000/api/acme-fitness/provider-types \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Nutritionists",
    "nameSingular": "Nutritionist",
    "description": "Certified nutrition experts",
    "icon": "🥗",
    "defaultSlotDuration": 45,
    "allowGroupSessions": false
  }'
```

This allows a gym to have both "Personal Trainers" and "Nutritionists" as separate provider types.

---

## Example: Complete Onboarding Flow

```bash
# 1. Create tenant
npx tsx scripts/create-tenant.ts "Acme Fitness" "admin@acmefitness.com"

# Output shows:
# Booking URL: /acme-fitness/book
# Admin URL: /admin/acme-fitness

# 2. Add a provider (trainer)
curl -X POST http://localhost:3000/api/acme-fitness/providers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Smith",
    "email": "john@acmefitness.com",
    "bio": "10 years experience",
    "providerTypeId": "..."
  }'

# 3. Add availability
curl -X POST http://localhost:3000/api/acme-fitness/availability/bulk \
  -H "Content-Type: application/json" \
  -d '{
    "trainerId": "provider-id",
    "dates": ["2024-01-15"],
    "timeSlots": [
      { "startTime": "09:00", "endTime": "10:00" }
    ]
  }'

# 4. Visit booking page
# http://localhost:3000/acme-fitness/book
```

---

## Support

For issues or questions:
1. Check that all migrations are applied: `npx prisma migrate dev`
2. Verify database connection in `.env`
3. Review logs for error messages
