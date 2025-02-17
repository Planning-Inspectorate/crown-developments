/*
  Warnings:

  - You are about to drop the column `applicationAcceptedDate` on the `CrownDevelopment` table. All the data in the column will be lost.

*/
BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[CrownDevelopment] DROP COLUMN [applicationAcceptedDate];
ALTER TABLE [dbo].[CrownDevelopment] ADD [applicationCompleteDate] DATETIME2;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
