/*
  Warnings:

  - You are about to drop the column `winner` on the `tournament` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `tournament` DROP COLUMN `winner`,
    ADD COLUMN `winner_id` INTEGER NULL;
