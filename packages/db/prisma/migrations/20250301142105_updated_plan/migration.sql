/*
  Warnings:

  - The primary key for the `Plan` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `Plan` table. All the data in the column will be lost.
  - You are about to alter the column `price` on the `Plan` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to drop the column `planId` on the `Subscription` table. All the data in the column will be lost.
  - You are about to drop the column `dailyTokensReset` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `dailyTokensUsed` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `monthlyTokensReset` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `monthlyTokensUsed` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `planId` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[type]` on the table `Plan` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `type` to the `Plan` table without a default value. This is not possible if the table is not empty.
  - Added the required column `planType` to the `Subscription` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "File" DROP CONSTRAINT "File_projectId_fkey";

-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_projectId_fkey";

-- DropForeignKey
ALTER TABLE "Project" DROP CONSTRAINT "Project_userId_fkey";

-- DropForeignKey
ALTER TABLE "Subscription" DROP CONSTRAINT "Subscription_planId_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_planId_fkey";

-- DropIndex
DROP INDEX "Subscription_planId_idx";

-- AlterTable
ALTER TABLE "Plan" DROP CONSTRAINT "Plan_pkey",
DROP COLUMN "id",
ADD COLUMN     "type" "Plans" NOT NULL,
ALTER COLUMN "price" SET DATA TYPE DECIMAL(65,30),
ADD CONSTRAINT "Plan_pkey" PRIMARY KEY ("type");

-- AlterTable
ALTER TABLE "Subscription" DROP COLUMN "planId",
ADD COLUMN     "dailyTokensReset" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "dailyTokensUsed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "monthlyTokensReset" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "monthlyTokensUsed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "planType" "Plans" NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "dailyTokensReset",
DROP COLUMN "dailyTokensUsed",
DROP COLUMN "monthlyTokensReset",
DROP COLUMN "monthlyTokensUsed",
DROP COLUMN "planId";

-- CreateIndex
CREATE UNIQUE INDEX "Plan_type_key" ON "Plan"("type");

-- CreateIndex
CREATE INDEX "Plan_type_idx" ON "Plan"("type");

-- CreateIndex
CREATE INDEX "Subscription_planType_idx" ON "Subscription"("planType");

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planType_fkey" FOREIGN KEY ("planType") REFERENCES "Plan"("type") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
