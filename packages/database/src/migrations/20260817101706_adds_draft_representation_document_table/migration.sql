BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[DraftBlobRepresentationDocument] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [DraftBlobRepresentationDocument_id_df] DEFAULT newid(),
    [sessionKey] NVARCHAR(1000) NOT NULL,
    [fileName] NVARCHAR(1000) NOT NULL,
    [blobName] NVARCHAR(1000) NOT NULL,
    [size] BIGINT NOT NULL,
    [mimeType] NVARCHAR(1000) NOT NULL CONSTRAINT [DraftBlobRepresentationDocument_mimeType_df] DEFAULT 'application/octet-stream',
    [redactedBlobName] NVARCHAR(1000),
    [redactedFileName] NVARCHAR(1000),
    [statusId] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [DraftBlobRepresentationDocument_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [DraftBlobRepresentationDocument_sessionKey_idx] ON [dbo].[DraftBlobRepresentationDocument]([sessionKey]);

-- AddForeignKey
ALTER TABLE [dbo].[DraftBlobRepresentationDocument] ADD CONSTRAINT [DraftBlobRepresentationDocument_statusId_fkey] FOREIGN KEY ([statusId]) REFERENCES [dbo].[RepresentationStatus]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
