BEGIN TRY
BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[ApplicationNote] ADD [crownDevelopmentId] UNIQUEIDENTIFIER, [s62aId] UNIQUEIDENTIFIER;

-- Create
CREATE NONCLUSTERED INDEX [ApplicationNote_crownDevelopmentId_createdAt_idx] ON [dbo].[ApplicationNote]([crownDevelopmentId], [createdAt] DESC);
CREATE NONCLUSTERED INDEX [ApplicationNote_s62aId_createdAt_idx] ON [dbo].[ApplicationNote]([s62aId], [createdAt] DESC);

-- AlterTable
ALTER TABLE [dbo].[ApplicationNote] ADD CONSTRAINT [ApplicationNote_crownDevelopmentId_fkey] FOREIGN KEY ([crownDevelopmentId]) REFERENCES [dbo].[CrownDevelopment]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[ApplicationNote] ADD CONSTRAINT [ApplicationNote_s62aId_fkey] FOREIGN KEY ([s62aId]) REFERENCES [dbo].[S62aCase]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- DataBackfill
EXEC sp_executesql N'
  UPDATE [dbo].[ApplicationNote]
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