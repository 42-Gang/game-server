/*
  Warnings:

  - You are about to drop the column `tournamentId` on the `match` table. All the data in the column will be lost.
  - Added the required column `tournament_id` to the `match` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `match` DROP FOREIGN KEY `match_tournamentId_fkey`;

-- DropIndex
DROP INDEX `match_tournamentId_fkey` ON `match`;

-- AlterTable
ALTER TABLE `match` DROP COLUMN `tournamentId`,
    ADD COLUMN `tournament_id` INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE `match` ADD CONSTRAINT `match_tournament_id_fkey` FOREIGN KEY (`tournament_id`) REFERENCES `tournament`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
