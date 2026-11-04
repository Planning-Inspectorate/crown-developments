BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[S62aCase] ADD [acknowledgePreApplicationEmailSent] BIT CONSTRAINT [S62aCase_acknowledgePreApplicationEmailSent_df] DEFAULT 0;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
