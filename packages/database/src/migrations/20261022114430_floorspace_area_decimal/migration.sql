BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[S62aNonResidentialFloorspaceArea] ALTER COLUMN [existingGross] DECIMAL(12,2) NULL;
ALTER TABLE [dbo].[S62aNonResidentialFloorspaceArea] ALTER COLUMN [grossLost] DECIMAL(12,2) NULL;
ALTER TABLE [dbo].[S62aNonResidentialFloorspaceArea] ALTER COLUMN [grossProposed] DECIMAL(12,2) NULL;
ALTER TABLE [dbo].[S62aNonResidentialFloorspaceArea] ALTER COLUMN [netAdditionalGross] DECIMAL(12,2) NULL;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
