/*
  Warnings:

  - You are about to drop the column `isAdult` on the `Contact` table. All the data in the column will be lost.

*/
BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[Contact] DROP CONSTRAINT [Contact_isAdult_df];
ALTER TABLE [dbo].[Contact] DROP COLUMN [isAdult];

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
