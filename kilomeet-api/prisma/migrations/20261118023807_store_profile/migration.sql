-- AlterTable
ALTER TABLE "stores" ADD COLUMN     "cover_theme" TEXT NOT NULL DEFAULT 'coffee',
ADD COLUMN     "description" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "highlights" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "opening_hours" JSONB,
ADD COLUMN     "phone" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "tagline" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];
