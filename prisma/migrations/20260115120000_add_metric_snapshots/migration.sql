-- CreateTable
CREATE TABLE "metric_points" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "avg" DOUBLE PRECISION NOT NULL,
    "count" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "metric_points_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "metric_points_name_timestamp_idx" ON "metric_points"("name", "timestamp");

-- CreateIndex
CREATE INDEX "metric_points_timestamp_idx" ON "metric_points"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "metric_points_name_timestamp_key" ON "metric_points"("name", "timestamp");

