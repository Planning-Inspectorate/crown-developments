BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[CrownDevelopment] ADD [updatedById] NVARCHAR(1000);

-- CreateTable
CREATE TABLE [dbo].[ApplicationHistory] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [ApplicationHistory_id_df] DEFAULT newid(),
    [applicationId] UNIQUEIDENTIFIER NOT NULL,
    [action] NVARCHAR(1000) NOT NULL,
    [metadata] NVARCHAR(max),
    [userId] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ApplicationHistory_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [ApplicationHistory_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ApplicationHistory_applicationId_createdAt_idx] ON [dbo].[ApplicationHistory]([applicationId], [createdAt] DESC);

-- AddForeignKey
ALTER TABLE [dbo].[ApplicationHistory] ADD CONSTRAINT [ApplicationHistory_applicationId_fkey] FOREIGN KEY ([applicationId]) REFERENCES [dbo].[CrownDevelopment]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
