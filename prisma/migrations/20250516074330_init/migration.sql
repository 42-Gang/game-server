/*
  Warnings:

  - You are about to alter the column `size` on the `tournament` table. The data in that column could be lost. The data in that column will be cast from `Enum(EnumId(4))` to `Int`.

*/
-- AlterTable
ALTER TABLE `tournament` MODIFY `size` INTEGER NOT NULL;
