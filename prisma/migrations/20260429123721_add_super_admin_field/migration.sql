/*
  Warnings:

  - You are about to drop the column `subscription_status` on the `Tenant` table. All the data in the column will be lost.
  - The primary key for the `invoices` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `organization_id` on the `invoices` table. All the data in the column will be lost.
  - You are about to drop the column `payment_method` on the `invoices` table. All the data in the column will be lost.
  - You are about to drop the column `payment_ref` on the `invoices` table. All the data in the column will be lost.
  - You are about to drop the column `subscription_id` on the `invoices` table. All the data in the column will be lost.
  - The primary key for the `plans` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `subscriptions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `current_period_end` on the `subscriptions` table. All the data in the column will be lost.
  - You are about to drop the column `current_period_start` on the `subscriptions` table. All the data in the column will be lost.
  - You are about to drop the column `organization_id` on the `subscriptions` table. All the data in the column will be lost.
  - You are about to drop the column `plan_id` on the `subscriptions` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[name]` on the table `plans` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `tenantId` to the `invoices` table without a default value. This is not possible if the table is not empty.
  - Made the column `features` on table `plans` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `end_date` to the `subscriptions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `planId` to the `subscriptions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `subscriptions` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "GroupType" AS ENUM ('CELL_GROUP', 'FELLOWSHIP', 'COMMISSION', 'MINISTRY');

-- CreateEnum
CREATE TYPE "GroupRole" AS ENUM ('LEADER', 'ASSISTANT', 'TREASURER', 'MEMBER');

-- DropForeignKey
ALTER TABLE "Tenant" DROP CONSTRAINT "Tenant_plan_id_fkey";

-- DropForeignKey
ALTER TABLE "invoices" DROP CONSTRAINT "invoices_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "invoices" DROP CONSTRAINT "invoices_subscription_id_fkey";

-- DropForeignKey
ALTER TABLE "subscriptions" DROP CONSTRAINT "subscriptions_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "subscriptions" DROP CONSTRAINT "subscriptions_plan_id_fkey";

-- AlterTable
ALTER TABLE "Tenant" DROP COLUMN "subscription_status",
ALTER COLUMN "plan_id" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "invoices" DROP CONSTRAINT "invoices_pkey",
DROP COLUMN "organization_id",
DROP COLUMN "payment_method",
DROP COLUMN "payment_ref",
DROP COLUMN "subscription_id",
ADD COLUMN     "invoice_url" TEXT,
ADD COLUMN     "subscriptionId" TEXT,
ADD COLUMN     "tenantId" TEXT NOT NULL,
ADD COLUMN     "xendit_expiry_at" TIMESTAMP(3),
ADD COLUMN     "xendit_invoice_id" TEXT,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "status" SET DEFAULT 'pending',
ALTER COLUMN "due_date" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" DROP DEFAULT,
ADD CONSTRAINT "invoices_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "plans" DROP CONSTRAINT "plans_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "name" SET DATA TYPE TEXT,
ALTER COLUMN "features" SET NOT NULL,
ALTER COLUMN "updated_at" DROP DEFAULT,
ADD CONSTRAINT "plans_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "subscriptions" DROP CONSTRAINT "subscriptions_pkey",
DROP COLUMN "current_period_end",
DROP COLUMN "current_period_start",
DROP COLUMN "organization_id",
DROP COLUMN "plan_id",
ADD COLUMN     "end_date" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "grace_period_ends_at" TIMESTAMP(3),
ADD COLUMN     "pending_plan_effective_at" TIMESTAMP(3),
ADD COLUMN     "pending_plan_id" TEXT,
ADD COLUMN     "planId" TEXT NOT NULL,
ADD COLUMN     "start_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "suspended_at" TIMESTAMP(3),
ADD COLUMN     "tenantId" TEXT NOT NULL,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "status" SET DEFAULT 'active',
ALTER COLUMN "updated_at" DROP DEFAULT,
ADD CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id");

-- CreateTable
CREATE TABLE "SmallGroup" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "GroupType" NOT NULL DEFAULT 'CELL_GROUP',
    "meetingSchedule" TEXT,
    "location" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SmallGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmallGroupMember" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "role" "GroupRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SmallGroupMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmallGroupMeeting" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "title" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SmallGroupMeeting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmallGroupAttendance" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PRESENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SmallGroupAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SmallGroupMember_groupId_memberId_key" ON "SmallGroupMember"("groupId", "memberId");

-- CreateIndex
CREATE UNIQUE INDEX "SmallGroupAttendance_meetingId_memberId_key" ON "SmallGroupAttendance"("meetingId", "memberId");

-- CreateIndex
CREATE UNIQUE INDEX "plans_name_key" ON "plans"("name");

-- AddForeignKey
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmallGroup" ADD CONSTRAINT "SmallGroup_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmallGroupMember" ADD CONSTRAINT "SmallGroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "SmallGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmallGroupMember" ADD CONSTRAINT "SmallGroupMember_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmallGroupMeeting" ADD CONSTRAINT "SmallGroupMeeting_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "SmallGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmallGroupAttendance" ADD CONSTRAINT "SmallGroupAttendance_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "SmallGroupMeeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmallGroupAttendance" ADD CONSTRAINT "SmallGroupAttendance_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_pending_plan_id_fkey" FOREIGN KEY ("pending_plan_id") REFERENCES "plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
