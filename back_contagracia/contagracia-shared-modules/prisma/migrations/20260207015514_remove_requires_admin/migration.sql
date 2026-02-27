/*
  Warnings:

  - You are about to drop the column `requires_admin` on the `system_actions` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "system_actions" DROP COLUMN "requires_admin";
