BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[CrownDevelopment] ADD [lpaQuestionnaireReceivedEmailSent] BIT CONSTRAINT [CrownDevelopment_lpaQuestionnaireReceivedEmailSent_df] DEFAULT 0;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
