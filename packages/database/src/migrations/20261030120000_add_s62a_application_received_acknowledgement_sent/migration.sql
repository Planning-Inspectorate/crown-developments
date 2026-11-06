BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[S62aCase] ADD [acknowledgeApplicationReceivedEmailSent] BIT CONSTRAINT [S62aCase_acknowledgeApplicationReceivedEmailSent_df] DEFAULT 0;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
