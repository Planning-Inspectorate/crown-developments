/*
  Warnings:

  - You are about to drop the column `applicationCompleteDate` on the `CrownDevelopment` table. All the data in the column will be lost.

*/
BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[CrownDevelopment] DROP COLUMN [applicationCompleteDate];
ALTER TABLE [dbo].[CrownDevelopment] ADD [applicationAcceptedDate] DATETIME2;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
