/*
  Warnings:

  - You are about to drop the column `allocatedDate` on the `S62aCaseInspector` table. All the data in the column will be lost.

*/
BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[S62aCaseInspector] DROP COLUMN [allocatedDate];
ALTER TABLE [dbo].[S62aCaseInspector] ADD [appointedDate] DATETIME2,
[assignedDate] DATETIME2;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
