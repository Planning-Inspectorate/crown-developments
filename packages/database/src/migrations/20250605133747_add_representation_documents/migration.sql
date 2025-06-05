BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[RepresentationDocument] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [RepresentationDocument_id_df] DEFAULT newid(),
    [representationId] UNIQUEIDENTIFIER NOT NULL,
    [itemId] NVARCHAR(1000) NOT NULL,
    [fileName] NVARCHAR(1000),
    [redactedItemId] NVARCHAR(1000),
    [redactedFileName] NVARCHAR(1000),
    [statusId] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [RepresentationDocument_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- AddForeignKey
ALTER TABLE [dbo].[RepresentationDocument] ADD CONSTRAINT [RepresentationDocument_representationId_fkey] FOREIGN KEY ([representationId]) REFERENCES [dbo].[Representation]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[RepresentationDocument] ADD CONSTRAINT [RepresentationDocument_statusId_fkey] FOREIGN KEY ([statusId]) REFERENCES [dbo].[RepresentationStatus]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
