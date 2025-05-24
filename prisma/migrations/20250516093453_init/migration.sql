/*
  Warnings:

  - You are about to alter the column `round` on the `match` table. The data in that column could be lost. The data in that column will be cast from `Enum(EnumId(2))` to `Int`.

*/
-- AlterTable
ALTER TABLE `match` MODIFY `round` INTEGER NOT NULL;
