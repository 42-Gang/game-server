-- CreateTable
CREATE TABLE `tournament` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `winner` INTEGER NULL,
    `mode` ENUM('CUSTOM', 'AUTO') NOT NULL,
    `size` INTEGER NOT NULL,
    `status` ENUM('NOT_STARTED', 'INPROGRESS', 'FINISHED') NOT NULL DEFAULT 'INPROGRESS',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `player` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tournament_id` INTEGER NOT NULL,
    `user_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `match` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `player1Id` INTEGER NULL,
    `player2Id` INTEGER NULL,
    `player_1_score` INTEGER NULL DEFAULT 0,
    `player_2_score` INTEGER NULL DEFAULT 0,
    `winner` INTEGER NULL,
    `round` INTEGER NOT NULL,
    `status` ENUM('NOT_STARTED', 'INPROGRESS', 'FINISHED') NOT NULL DEFAULT 'NOT_STARTED',
    `next_match_id` INTEGER NULL,
    `tournament_id` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `player` ADD CONSTRAINT `player_tournament_id_fkey` FOREIGN KEY (`tournament_id`) REFERENCES `tournament`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `match` ADD CONSTRAINT `match_next_match_id_fkey` FOREIGN KEY (`next_match_id`) REFERENCES `match`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `match` ADD CONSTRAINT `match_tournament_id_fkey` FOREIGN KEY (`tournament_id`) REFERENCES `tournament`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
