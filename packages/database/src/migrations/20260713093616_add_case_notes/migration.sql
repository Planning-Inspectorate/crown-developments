BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[ApplicationNote] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [ApplicationNote_id_df] DEFAULT newid(),
    [comment] NVARCHAR(500) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ApplicationNote_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [userId] NVARCHAR(1000) NOT NULL,
    [applicationId] UNIQUEIDENTIFIER NOT NULL,
    CONSTRAINT [ApplicationNote_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ApplicationNote_applicationId_idx] ON [dbo].[ApplicationNote]([applicationId]);

-- AddForeignKey
ALTER TABLE [dbo].[ApplicationNote] ADD CONSTRAINT [ApplicationNote_applicationId_fkey] FOREIGN KEY ([applicationId]) REFERENCES [dbo].[CrownDevelopment]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
