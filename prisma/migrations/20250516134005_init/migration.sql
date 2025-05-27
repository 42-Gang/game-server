/*
  Warnings:

  - You are about to drop the `tournamentPlayer` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `tournamentPlayer` DROP FOREIGN KEY `tournamentPlayer_tournament_id_fkey`;

-- DropTable
DROP TABLE `tournamentPlayer`;

-- CreateTable
CREATE TABLE `player` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tournament_id` INTEGER NOT NULL,
    `user_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `player` ADD CONSTRAINT `player_tournament_id_fkey` FOREIGN KEY (`tournament_id`) REFERENCES `tournament`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
