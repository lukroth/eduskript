-- CreateTable
CREATE TABLE "plugins" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "version" TEXT NOT NULL DEFAULT '1.0.0',
    "authorId" TEXT NOT NULL,
    "manifest" JSONB NOT NULL,
    "entryHtml" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plugins_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "plugins_authorId_idx" ON "plugins"("authorId");

-- CreateIndex
CREATE UNIQUE INDEX "plugins_authorId_slug_key" ON "plugins"("authorId", "slug");

-- AddForeignKey
ALTER TABLE "plugins" ADD CONSTRAINT "plugins_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
