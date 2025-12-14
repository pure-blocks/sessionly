-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "domain" TEXT,
    "logoUrl" TEXT,
    "primaryColor" TEXT DEFAULT '#3B82F6',
    "secondaryColor" TEXT DEFAULT '#10B981',
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "website" TEXT,
    "description" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ProviderType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameSingular" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "defaultSlotDuration" INTEGER NOT NULL DEFAULT 60,
    "defaultSlotCapacity" INTEGER NOT NULL DEFAULT 1,
    "allowGroupSessions" BOOLEAN NOT NULL DEFAULT false,
    "requireApproval" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProviderType_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Provider" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "providerTypeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "bio" TEXT,
    "profileImageUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "acceptingBookings" BOOLEAN NOT NULL DEFAULT true,
    "customFields" TEXT,
    "categoryId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Provider_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Provider_providerTypeId_fkey" FOREIGN KEY ("providerTypeId") REFERENCES "ProviderType" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Provider_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Category_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ServiceTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "providerTypeId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "defaultPrice" REAL,
    "pricingModel" TEXT NOT NULL DEFAULT 'fixed',
    "defaultDuration" INTEGER NOT NULL DEFAULT 60,
    "defaultCapacity" INTEGER NOT NULL DEFAULT 1,
    "allowGroupBooking" BOOLEAN NOT NULL DEFAULT false,
    "baseFields" TEXT NOT NULL,
    "customFields" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ServiceTemplate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ServiceTemplate_providerTypeId_fkey" FOREIGN KEY ("providerTypeId") REFERENCES "ProviderType" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProviderService" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "providerId" TEXT NOT NULL,
    "templateId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" REAL,
    "pricingModel" TEXT NOT NULL DEFAULT 'fixed',
    "duration" INTEGER NOT NULL DEFAULT 60,
    "maxCapacity" INTEGER NOT NULL DEFAULT 1,
    "allowGroupBooking" BOOLEAN NOT NULL DEFAULT false,
    "customFieldValues" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProviderService_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProviderService_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ServiceTemplate" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TenantConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "minBookingNotice" INTEGER NOT NULL DEFAULT 60,
    "maxBookingAdvance" INTEGER NOT NULL DEFAULT 90,
    "allowCancellation" BOOLEAN NOT NULL DEFAULT true,
    "cancellationWindow" INTEGER NOT NULL DEFAULT 24,
    "defaultSlotDuration" INTEGER NOT NULL DEFAULT 60,
    "slotBuffer" INTEGER NOT NULL DEFAULT 0,
    "sendConfirmationEmail" BOOLEAN NOT NULL DEFAULT true,
    "sendReminderEmail" BOOLEAN NOT NULL DEFAULT true,
    "reminderHoursBefore" INTEGER NOT NULL DEFAULT 24,
    "bookingFormFields" TEXT,
    "businessHours" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TenantConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Availability" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "trainerId" TEXT,
    "providerId" TEXT,
    "serviceId" TEXT,
    "date" DATETIME NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "isGroupSession" BOOLEAN NOT NULL DEFAULT false,
    "maxCapacity" INTEGER NOT NULL DEFAULT 1,
    "currentBookings" INTEGER NOT NULL DEFAULT 0,
    "price" REAL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Availability_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Availability_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "ProviderService" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Availability" ("createdAt", "currentBookings", "date", "endTime", "id", "isGroupSession", "maxCapacity", "price", "startTime", "trainerId", "updatedAt") SELECT "createdAt", "currentBookings", "date", "endTime", "id", "isGroupSession", "maxCapacity", "price", "startTime", "trainerId", "updatedAt" FROM "Availability";
DROP TABLE "Availability";
ALTER TABLE "new_Availability" RENAME TO "Availability";
CREATE INDEX "Availability_providerId_idx" ON "Availability"("providerId");
CREATE INDEX "Availability_trainerId_idx" ON "Availability"("trainerId");
CREATE INDEX "Availability_date_idx" ON "Availability"("date");
CREATE INDEX "Availability_isActive_idx" ON "Availability"("isActive");
CREATE TABLE "new_Booking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT,
    "availabilityId" TEXT NOT NULL,
    "trainerId" TEXT,
    "providerId" TEXT,
    "clientName" TEXT NOT NULL,
    "clientEmail" TEXT NOT NULL,
    "clientPhone" TEXT,
    "partySize" INTEGER NOT NULL DEFAULT 1,
    "openToSharing" BOOLEAN NOT NULL DEFAULT false,
    "pricePerPerson" REAL,
    "totalPrice" REAL,
    "customFormData" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'confirmed',
    "cancellationReason" TEXT,
    "cancelledAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Booking_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Booking_availabilityId_fkey" FOREIGN KEY ("availabilityId") REFERENCES "Availability" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Booking_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Booking" ("availabilityId", "clientEmail", "clientName", "createdAt", "id", "notes", "openToSharing", "partySize", "pricePerPerson", "trainerId", "updatedAt") SELECT "availabilityId", "clientEmail", "clientName", "createdAt", "id", "notes", "openToSharing", "partySize", "pricePerPerson", "trainerId", "updatedAt" FROM "Booking";
DROP TABLE "Booking";
ALTER TABLE "new_Booking" RENAME TO "Booking";
CREATE INDEX "Booking_tenantId_idx" ON "Booking"("tenantId");
CREATE INDEX "Booking_providerId_idx" ON "Booking"("providerId");
CREATE INDEX "Booking_trainerId_idx" ON "Booking"("trainerId");
CREATE INDEX "Booking_clientEmail_idx" ON "Booking"("clientEmail");
CREATE INDEX "Booking_availabilityId_idx" ON "Booking"("availabilityId");
CREATE INDEX "Booking_status_idx" ON "Booking"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_domain_key" ON "Tenant"("domain");

-- CreateIndex
CREATE INDEX "Tenant_slug_idx" ON "Tenant"("slug");

-- CreateIndex
CREATE INDEX "Tenant_isActive_idx" ON "Tenant"("isActive");

-- CreateIndex
CREATE INDEX "ProviderType_tenantId_idx" ON "ProviderType"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderType_tenantId_slug_key" ON "ProviderType"("tenantId", "slug");

-- CreateIndex
CREATE INDEX "Provider_tenantId_idx" ON "Provider"("tenantId");

-- CreateIndex
CREATE INDEX "Provider_providerTypeId_idx" ON "Provider"("providerTypeId");

-- CreateIndex
CREATE INDEX "Provider_email_idx" ON "Provider"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Provider_tenantId_slug_key" ON "Provider"("tenantId", "slug");

-- CreateIndex
CREATE INDEX "Category_tenantId_idx" ON "Category"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_tenantId_slug_key" ON "Category"("tenantId", "slug");

-- CreateIndex
CREATE INDEX "ServiceTemplate_tenantId_idx" ON "ServiceTemplate"("tenantId");

-- CreateIndex
CREATE INDEX "ServiceTemplate_category_idx" ON "ServiceTemplate"("category");

-- CreateIndex
CREATE INDEX "ProviderService_providerId_idx" ON "ProviderService"("providerId");

-- CreateIndex
CREATE UNIQUE INDEX "TenantConfig_tenantId_key" ON "TenantConfig"("tenantId");
