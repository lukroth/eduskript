-- DropIndex
DROP INDEX "collections_slug_key";

-- DropIndex
DROP INDEX "skripts_slug_key";

-- CreateIndex
CREATE INDEX "collections_slug_idx" ON "collections"("slug");

-- CreateIndex
CREATE INDEX "skripts_slug_idx" ON "skripts"("slug");
