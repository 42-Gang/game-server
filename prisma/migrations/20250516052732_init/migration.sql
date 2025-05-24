-- CreateTable
CREATE TABLE `tournament` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `winner` INTEGER NULL,
    `mode` ENUM('CUSTOM', 'AUTO') NOT NULL,
    `round` ENUM('ROUND_2', 'ROUND_4', 'ROUND_8', 'ROUND_16') NOT NULL,
    `status` ENUM('INPROGRESS', 'FINISHED') NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tournamentPlayer` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tournamentId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `match` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tournamentId` INTEGER NOT NULL,
    `player1` INTEGER NULL,
    `player2` INTEGER NULL,
    `scorePlayer1` INTEGER NULL,
    `scorePlayer2` INTEGER NULL,
    `winner` INTEGER NULL,
    `round` ENUM('ROUND_2', 'ROUND_4', 'ROUND_8', 'ROUND_16') NOT NULL,
    `status` ENUM('INPROGRESS', 'FINISHED') NOT NULL,
    `previousMatch1Id` INTEGER NULL,
    `previousMatch2Id` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `tournamentPlayer` ADD CONSTRAINT `tournamentPlayer_tournamentId_fkey` FOREIGN KEY (`tournamentId`) REFERENCES `tournament`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `match` ADD CONSTRAINT `match_tournamentId_fkey` FOREIGN KEY (`tournamentId`) REFERENCES `tournament`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
