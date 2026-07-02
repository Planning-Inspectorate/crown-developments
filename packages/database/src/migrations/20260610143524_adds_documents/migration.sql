BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[Document] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [Document_id_df] DEFAULT newid(),
    [fileName] NVARCHAR(1000) NOT NULL,
    [uploadedDate] DATETIME2 NOT NULL CONSTRAINT [Document_uploadedDate_df] DEFAULT CURRENT_TIMESTAMP,
    [size] BIGINT NOT NULL CONSTRAINT [Document_size_df] DEFAULT 0,
    [blobName] NVARCHAR(1000) NOT NULL,
    [mimeType] NVARCHAR(1000) NOT NULL CONSTRAINT [Document_mimeType_df] DEFAULT 'application/octet-stream',
    [deletedAt] DATETIME2,
    [crownDevelopmentId] UNIQUEIDENTIFIER NOT NULL,
    CONSTRAINT [Document_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[DraftDocument] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [DraftDocument_id_df] DEFAULT newid(),
    [sessionKey] NVARCHAR(1000) NOT NULL,
    [crownDevelopmentId] UNIQUEIDENTIFIER NOT NULL,
    [fileName] NVARCHAR(1000) NOT NULL,
    [blobName] NVARCHAR(1000) NOT NULL,
    [size] BIGINT NOT NULL,
    [mimeType] NVARCHAR(1000) NOT NULL CONSTRAINT [DraftDocument_mimeType_df] DEFAULT 'application/octet-stream',
    CONSTRAINT [DraftDocument_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [DraftDocument_sessionKey_crownDevelopmentId_idx] ON [dbo].[DraftDocument]([sessionKey], [crownDevelopmentId]);

-- AddForeignKey
ALTER TABLE [dbo].[Document] ADD CONSTRAINT [Document_crownDevelopmentId_fkey] FOREIGN KEY ([crownDevelopmentId]) REFERENCES [dbo].[CrownDevelopment]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[DraftDocument] ADD CONSTRAINT [DraftDocument_crownDevelopmentId_fkey] FOREIGN KEY ([crownDevelopmentId]) REFERENCES [dbo].[CrownDevelopment]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
