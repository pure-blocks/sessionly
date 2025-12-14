-- AlterTable
ALTER TABLE "Provider" ADD COLUMN "certifications" TEXT;
ALTER TABLE "Provider" ADD COLUMN "galleryImages" TEXT;
ALTER TABLE "Provider" ADD COLUMN "socialLinks" TEXT;
ALTER TABLE "Provider" ADD COLUMN "specialties" TEXT;
ALTER TABLE "Provider" ADD COLUMN "title" TEXT;
ALTER TABLE "Provider" ADD COLUMN "videoUrl" TEXT;
ALTER TABLE "Provider" ADD COLUMN "yearsExperience" INTEGER;

-- CreateTable
CREATE TABLE "Testimonial" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "providerId" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "clientTitle" TEXT,
    "clientImage" TEXT,
    "rating" INTEGER NOT NULL DEFAULT 5,
    "text" TEXT NOT NULL,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Testimonial_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Testimonial_providerId_idx" ON "Testimonial"("providerId");

-- CreateIndex
CREATE INDEX "Testimonial_isApproved_idx" ON "Testimonial"("isApproved");
