/*
  Warnings:

  - You are about to drop the column `isBooked` on the `Availability` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Booking_availabilityId_key";

-- AlterTable
ALTER TABLE "Trainer" ADD COLUMN "rateCard" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Availability" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "trainerId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "isGroupSession" BOOLEAN NOT NULL DEFAULT false,
    "maxCapacity" INTEGER NOT NULL DEFAULT 1,
    "currentBookings" INTEGER NOT NULL DEFAULT 0,
    "price" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Availability_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "Trainer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Availability" ("createdAt", "date", "endTime", "id", "startTime", "trainerId", "updatedAt") SELECT "createdAt", "date", "endTime", "id", "startTime", "trainerId", "updatedAt" FROM "Availability";
DROP TABLE "Availability";
ALTER TABLE "new_Availability" RENAME TO "Availability";
CREATE INDEX "Availability_trainerId_idx" ON "Availability"("trainerId");
CREATE INDEX "Availability_date_idx" ON "Availability"("date");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Booking_availabilityId_idx" ON "Booking"("availabilityId");
