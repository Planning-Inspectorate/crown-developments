BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[CrownDevelopment] ADD [bngExempt] BIT,
[cilAmount] DECIMAL(32,16),
[cilLiable] BIT,
[costsApplicationsComment] NVARCHAR(2000),
[hasCostsApplications] BIT;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
