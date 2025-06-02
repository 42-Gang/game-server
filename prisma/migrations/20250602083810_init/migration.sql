/*
  Warnings:

  - You are about to drop the column `player1` on the `match` table. All the data in the column will be lost.
  - You are about to drop the column `player2` on the `match` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `match` DROP COLUMN `player1`,
    DROP COLUMN `player2`,
    ADD COLUMN `player1Id` INTEGER NULL,
    ADD COLUMN `player2Id` INTEGER NULL;
