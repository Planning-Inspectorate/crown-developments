BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[CrownDevelopment] ADD [applicationReceivedDateEmailSent] BIT CONSTRAINT [CrownDevelopment_applicationReceivedDateEmailSent_df] DEFAULT 0;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
