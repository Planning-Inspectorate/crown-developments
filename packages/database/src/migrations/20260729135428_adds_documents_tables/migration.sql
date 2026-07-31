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
    [s62aCaseId] UNIQUEIDENTIFIER NOT NULL,
    [folderId] UNIQUEIDENTIFIER NOT NULL,
    CONSTRAINT [Document_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[DraftDocument] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [DraftDocument_id_df] DEFAULT newid(),
    [sessionKey] NVARCHAR(1000) NOT NULL,
    [s62aCaseId] UNIQUEIDENTIFIER NOT NULL,
    [folderId] UNIQUEIDENTIFIER NOT NULL,
    [fileName] NVARCHAR(1000) NOT NULL,
    [blobName] NVARCHAR(1000) NOT NULL,
    [size] BIGINT NOT NULL,
    [mimeType] NVARCHAR(1000) NOT NULL CONSTRAINT [DraftDocument_mimeType_df] DEFAULT 'application/octet-stream',
    CONSTRAINT [DraftDocument_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [DraftDocument_sessionKey_s62aCaseId_idx] ON [dbo].[DraftDocument]([sessionKey], [s62aCaseId]);

-- AddForeignKey
ALTER TABLE [dbo].[Document] ADD CONSTRAINT [Document_s62aCaseId_fkey] FOREIGN KEY ([s62aCaseId]) REFERENCES [dbo].[S62aCase]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Document] ADD CONSTRAINT [Document_folderId_fkey] FOREIGN KEY ([folderId]) REFERENCES [dbo].[Folder]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[DraftDocument] ADD CONSTRAINT [DraftDocument_s62aCaseId_fkey] FOREIGN KEY ([s62aCaseId]) REFERENCES [dbo].[S62aCase]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[DraftDocument] ADD CONSTRAINT [DraftDocument_folderId_fkey] FOREIGN KEY ([folderId]) REFERENCES [dbo].[Folder]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
