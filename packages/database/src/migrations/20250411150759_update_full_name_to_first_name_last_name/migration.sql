/*
  Warnings:

  - You are about to drop the column `fullName` on the `Contact` table. All the data in the column will be lost.

*/
BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[Contact] DROP COLUMN [fullName];
ALTER TABLE [dbo].[Contact] ADD [firstName] NVARCHAR(1000),
[lastName] NVARCHAR(1000),
[orgName] NVARCHAR(1000);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
