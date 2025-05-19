/*
  Warnings:

  - You are about to drop the column `previousMatch1Id` on the `match` table. All the data in the column will be lost.
  - You are about to drop the column `previousMatch2Id` on the `match` table. All the data in the column will be lost.
  - You are about to drop the column `scorePlayer1` on the `match` table. All the data in the column will be lost.
  - You are about to drop the column `scorePlayer2` on the `match` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `tournamentPlayer` table. All the data in the column will be lost.
  - You are about to drop the column `tournamentId` on the `tournamentPlayer` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `tournamentPlayer` table. All the data in the column will be lost.
  - Added the required column `updated_at` to the `tournament` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tournament_id` to the `tournamentPlayer` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `tournamentPlayer` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `tournamentPlayer` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `match` DROP FOREIGN KEY `match_tournamentId_fkey`;

-- DropForeignKey
ALTER TABLE `tournamentPlayer` DROP FOREIGN KEY `tournamentPlayer_tournamentId_fkey`;

-- DropIndex
DROP INDEX `match_tournamentId_fkey` ON `match`;

-- DropIndex
DROP INDEX `tournamentPlayer_tournamentId_fkey` ON `tournamentPlayer`;

-- AlterTable
ALTER TABLE `match` DROP COLUMN `previousMatch1Id`,
    DROP COLUMN `previousMatch2Id`,
    DROP COLUMN `scorePlayer1`,
    DROP COLUMN `scorePlayer2`,
    ADD COLUMN `next_match_id` INTEGER NULL,
    ADD COLUMN `player_1_score` INTEGER NULL DEFAULT 0,
    ADD COLUMN `player_2_score` INTEGER NULL DEFAULT 0,
    MODIFY `tournamentId` INTEGER NULL,
    MODIFY `status` ENUM('NOT_STARTED', 'INPROGRESS', 'FINISHED') NOT NULL DEFAULT 'NOT_STARTED';

-- AlterTable
ALTER TABLE `tournament` ADD COLUMN `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `updated_at` DATETIME(3) NOT NULL,
    MODIFY `status` ENUM('NOT_STARTED', 'INPROGRESS', 'FINISHED') NOT NULL DEFAULT 'INPROGRESS';

-- AlterTable
ALTER TABLE `tournamentPlayer` DROP COLUMN `createdAt`,
    DROP COLUMN `tournamentId`,
    DROP COLUMN `userId`,
    ADD COLUMN `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `tournament_id` INTEGER NOT NULL,
    ADD COLUMN `updated_at` DATETIME(3) NOT NULL,
    ADD COLUMN `user_id` INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE `tournamentPlayer` ADD CONSTRAINT `tournamentPlayer_tournament_id_fkey` FOREIGN KEY (`tournament_id`) REFERENCES `tournament`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `match` ADD CONSTRAINT `match_next_match_id_fkey` FOREIGN KEY (`next_match_id`) REFERENCES `match`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `match` ADD CONSTRAINT `match_tournamentId_fkey` FOREIGN KEY (`tournamentId`) REFERENCES `tournament`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
