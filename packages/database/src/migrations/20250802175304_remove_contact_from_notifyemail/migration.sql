/*
  Warnings:

  - You are about to drop the column `contactId` on the `NotifyEmail` table. All the data in the column will be lost.

*/
BEGIN TRY

BEGIN TRAN;

-- DropForeignKey
ALTER TABLE [dbo].[NotifyEmail] DROP CONSTRAINT [NotifyEmail_contactId_fkey];

-- AlterTable
ALTER TABLE [dbo].[NotifyEmail] DROP COLUMN [contactId];

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
