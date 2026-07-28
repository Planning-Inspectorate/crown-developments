BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[S62aCase] ADD [eiaScreening] BIT,
[eiaScreeningOutcome] BIT;

-- AlterTable
ALTER TABLE [dbo].[S62aDates] ADD [environmentalStatementReceivedDate] DATETIME2;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
