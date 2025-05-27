/*
  Warnings:

  - You are about to drop the column `round` on the `tournament` table. All the data in the column will be lost.
  - Added the required column `size` to the `tournament` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `tournament` DROP COLUMN `round`,
    ADD COLUMN `size` ENUM('ROUND_2', 'ROUND_4', 'ROUND_8', 'ROUND_16') NOT NULL;
