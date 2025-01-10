/*
  Warnings:

  - You are about to drop the column `proofsOfEvidence` on the `Event` table. All the data in the column will be lost.

*/
BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[Event] DROP COLUMN [proofsOfEvidence];
ALTER TABLE [dbo].[Event] ADD [proofsOfEvidenceDate] DATETIME2;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
