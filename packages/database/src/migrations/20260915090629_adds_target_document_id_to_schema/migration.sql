BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[DraftBlobRepresentationDocument] ADD [targetDocumentId] UNIQUEIDENTIFIER;

-- AddForeignKey
ALTER TABLE [dbo].[DraftBlobRepresentationDocument] ADD CONSTRAINT [DraftBlobRepresentationDocument_targetDocumentId_fkey] FOREIGN KEY ([targetDocumentId]) REFERENCES [dbo].[BlobRepresentationDocument]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
