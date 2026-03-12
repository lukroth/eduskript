/*
  Warnings:

  - A unique constraint covering the columns `[mux_upload_id]` on the table `videos` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[mux_asset_id]` on the table `videos` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[filename,provider,uploaded_by_id]` on the table `videos` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "videos_filename_provider_key";

-- AlterTable
ALTER TABLE "videos" ADD COLUMN     "mux_asset_id" TEXT,
ADD COLUMN     "mux_upload_id" TEXT,
ADD COLUMN     "uploaded_by_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "videos_mux_upload_id_key" ON "videos"("mux_upload_id");

-- CreateIndex
CREATE UNIQUE INDEX "videos_mux_asset_id_key" ON "videos"("mux_asset_id");

-- CreateIndex
CREATE INDEX "videos_uploaded_by_id_idx" ON "videos"("uploaded_by_id");

-- CreateIndex
CREATE UNIQUE INDEX "videos_filename_provider_uploaded_by_id_key" ON "videos"("filename", "provider", "uploaded_by_id");

-- AddForeignKey
ALTER TABLE "videos" ADD CONSTRAINT "videos_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
