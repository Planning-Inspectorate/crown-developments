BEGIN TRY
BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[ApplicationHistory] ADD [crownDevelopmentId] UNIQUEIDENTIFIER, [s62aId] UNIQUEIDENTIFIER;

-- AlterTable
ALTER TABLE [dbo].[S62aCase] ADD [updatedById] NVARCHAR(1000);

-- Create
CREATE NONCLUSTERED INDEX [ApplicationHistory_crownDevelopmentId_createdAt_idx] ON [dbo].[ApplicationHistory]([crownDevelopmentId], [createdAt] DESC);
CREATE NONCLUSTERED INDEX [ApplicationHistory_s62aId_createdAt_idx] ON [dbo].[ApplicationHistory]([s62aId], [createdAt] DESC);

-- AlterTable
ALTER TABLE [dbo].[ApplicationHistory] ADD CONSTRAINT [ApplicationHistory_crownDevelopmentId_fkey] FOREIGN KEY ([crownDevelopmentId]) REFERENCES [dbo].[CrownDevelopment]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[ApplicationHistory] ADD CONSTRAINT [ApplicationHistory_s62aId_fkey] FOREIGN KEY ([s62aId]) REFERENCES [dbo].[S62aCase]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- DataBackfill
EXEC sp_executesql N'
  UPDATE [dbo].[ApplicationHistory]
  SET [crownDevelopmentId] = [applicationId]
  WHERE [applicationId] IS NOT NULL;
';

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH