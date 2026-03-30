-- AlterTable
ALTER TABLE "plans" ADD COLUMN     "is_default_trial" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "trial_days" INTEGER;
