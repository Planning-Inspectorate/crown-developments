BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[BlobWithdrawalRequestDocument] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [BlobWithdrawalRequestDocument_id_df] DEFAULT newid(),
    [uploadedDate] DATETIME2 NOT NULL CONSTRAINT [BlobWithdrawalRequestDocument_uploadedDate_df] DEFAULT CURRENT_TIMESTAMP,
    [fileName] NVARCHAR(1000) NOT NULL,
    [blobName] NVARCHAR(1000) NOT NULL,
    [size] BIGINT NOT NULL,
    [mimeType] NVARCHAR(1000) NOT NULL CONSTRAINT [BlobWithdrawalRequestDocument_mimeType_df] DEFAULT 'application/octet-stream',
    [s62aRepresentationId] UNIQUEIDENTIFIER NOT NULL,
    CONSTRAINT [BlobWithdrawalRequestDocument_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[DraftBlobWithdrawalRequestDocument] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [DraftBlobWithdrawalRequestDocument_id_df] DEFAULT newid(),
    [sessionKey] NVARCHAR(1000) NOT NULL,
    [fileName] NVARCHAR(1000) NOT NULL,
    [blobName] NVARCHAR(1000) NOT NULL,
    [size] BIGINT NOT NULL,
    [mimeType] NVARCHAR(1000) NOT NULL CONSTRAINT [DraftBlobWithdrawalRequestDocument_mimeType_df] DEFAULT 'application/octet-stream',
    [s62aRepresentationId] UNIQUEIDENTIFIER NOT NULL,
    CONSTRAINT [DraftBlobWithdrawalRequestDocument_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [BlobWithdrawalRequestDocument_s62aRepresentationId_idx] ON [dbo].[BlobWithdrawalRequestDocument]([s62aRepresentationId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [DraftBlobWithdrawalRequestDocument_sessionKey_s62aRepresentationId_idx] ON [dbo].[DraftBlobWithdrawalRequestDocument]([sessionKey], [s62aRepresentationId]);

-- AddForeignKey
ALTER TABLE [dbo].[BlobWithdrawalRequestDocument] ADD CONSTRAINT [BlobWithdrawalRequestDocument_s62aRepresentationId_fkey] FOREIGN KEY ([s62aRepresentationId]) REFERENCES [dbo].[S62aRepresentation]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[DraftBlobWithdrawalRequestDocument] ADD CONSTRAINT [DraftBlobWithdrawalRequestDocument_s62aRepresentationId_fkey] FOREIGN KEY ([s62aRepresentationId]) REFERENCES [dbo].[S62aRepresentation]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
