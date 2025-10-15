BEGIN TRY

BEGIN TRAN;

-- DropForeignKey
ALTER TABLE [dbo].[CrownDevelopment] DROP CONSTRAINT [CrownDevelopment_lpaId_fkey];

-- AlterTable
ALTER TABLE [dbo].[CrownDevelopment] ADD [hasSecondaryLpa] BIT CONSTRAINT [CrownDevelopment_hasSecondaryLpa_df] DEFAULT 0,
[secondaryLpaId] UNIQUEIDENTIFIER;

-- AddForeignKey
ALTER TABLE [dbo].[CrownDevelopment] ADD CONSTRAINT [CrownDevelopment_lpaId_fkey] FOREIGN KEY ([lpaId]) REFERENCES [dbo].[Lpa]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[CrownDevelopment] ADD CONSTRAINT [CrownDevelopment_secondaryLpaId_fkey] FOREIGN KEY ([secondaryLpaId]) REFERENCES [dbo].[Lpa]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
