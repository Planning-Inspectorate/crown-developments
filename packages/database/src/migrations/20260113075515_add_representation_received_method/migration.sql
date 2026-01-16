BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[Representation] ADD [submittedReceivedMethodId] NVARCHAR(1000);

-- CreateTable
CREATE TABLE [dbo].[RepresentationReceivedMethod] (
    [id] NVARCHAR(1000) NOT NULL,
    [displayName] NVARCHAR(1000),
    CONSTRAINT [RepresentationReceivedMethod_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- AddForeignKey
ALTER TABLE [dbo].[Representation] ADD CONSTRAINT [Representation_submittedReceivedMethodId_fkey] FOREIGN KEY ([submittedReceivedMethodId]) REFERENCES [dbo].[RepresentationReceivedMethod]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
