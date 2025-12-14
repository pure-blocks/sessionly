-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Booking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "availabilityId" TEXT NOT NULL,
    "trainerId" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "clientEmail" TEXT NOT NULL,
    "partySize" INTEGER NOT NULL DEFAULT 1,
    "openToSharing" BOOLEAN NOT NULL DEFAULT false,
    "pricePerPerson" REAL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Booking_availabilityId_fkey" FOREIGN KEY ("availabilityId") REFERENCES "Availability" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Booking_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "Trainer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Booking" ("availabilityId", "clientEmail", "clientName", "createdAt", "id", "notes", "trainerId", "updatedAt") SELECT "availabilityId", "clientEmail", "clientName", "createdAt", "id", "notes", "trainerId", "updatedAt" FROM "Booking";
DROP TABLE "Booking";
ALTER TABLE "new_Booking" RENAME TO "Booking";
CREATE INDEX "Booking_trainerId_idx" ON "Booking"("trainerId");
CREATE INDEX "Booking_clientEmail_idx" ON "Booking"("clientEmail");
CREATE INDEX "Booking_availabilityId_idx" ON "Booking"("availabilityId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
