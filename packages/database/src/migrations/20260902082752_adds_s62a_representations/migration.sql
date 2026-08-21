BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[BlobRepresentationDocument] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [BlobRepresentationDocument_id_df] DEFAULT newid(),
    [fileName] NVARCHAR(1000) NOT NULL,
    [uploadedDate] DATETIME2 NOT NULL CONSTRAINT [BlobRepresentationDocument_uploadedDate_df] DEFAULT CURRENT_TIMESTAMP,
    [blobName] NVARCHAR(1000) NOT NULL,
    [size] BIGINT NOT NULL,
    [mimeType] NVARCHAR(1000) NOT NULL CONSTRAINT [BlobRepresentationDocument_mimeType_df] DEFAULT 'application/octet-stream',
    [redactedBlobName] NVARCHAR(1000),
    [redactedFileName] NVARCHAR(1000),
    [statusId] NVARCHAR(1000) NOT NULL,
    [s62aRepresentationId] UNIQUEIDENTIFIER NOT NULL,
    CONSTRAINT [BlobRepresentationDocument_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[S62aRepresentation] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [S62aRepresentation_id_df] DEFAULT newid(),
    [reference] NVARCHAR(1000) NOT NULL,
    [applicationId] UNIQUEIDENTIFIER NOT NULL,
    [statusId] NVARCHAR(1000) NOT NULL,
    [submittedForId] NVARCHAR(1000) NOT NULL,
    [submittedByContactId] UNIQUEIDENTIFIER,
    [submittedByAgent] BIT,
    [submittedByAgentOrgName] NVARCHAR(1000),
    [submittedDate] DATETIME2 NOT NULL,
    [submittedReceivedMethodId] NVARCHAR(1000),
    [submissionMethodReason] NVARCHAR(50),
    [comment] NVARCHAR(max) NOT NULL,
    [commentRedacted] NVARCHAR(max),
    [representedTypeId] NVARCHAR(1000),
    [representedGroupName] NVARCHAR(1000),
    [categoryId] NVARCHAR(1000),
    [wantsToBeHeard] BIT,
    [containsAttachments] BIT CONSTRAINT [S62aRepresentation_containsAttachments_df] DEFAULT 0,
    CONSTRAINT [S62aRepresentation_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [S62aRepresentation_reference_key] UNIQUE NONCLUSTERED ([reference])
);

-- CreateTable
CREATE TABLE [dbo].[_S62aRepresentedContacts] (
    [A] UNIQUEIDENTIFIER NOT NULL,
    [B] UNIQUEIDENTIFIER NOT NULL,
    CONSTRAINT [_S62aRepresentedContacts_AB_unique] UNIQUE NONCLUSTERED ([A],[B])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [_S62aRepresentedContacts_B_index] ON [dbo].[_S62aRepresentedContacts]([B]);

-- AddForeignKey
ALTER TABLE [dbo].[BlobRepresentationDocument] ADD CONSTRAINT [BlobRepresentationDocument_statusId_fkey] FOREIGN KEY ([statusId]) REFERENCES [dbo].[RepresentationStatus]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[BlobRepresentationDocument] ADD CONSTRAINT [BlobRepresentationDocument_s62aRepresentationId_fkey] FOREIGN KEY ([s62aRepresentationId]) REFERENCES [dbo].[S62aRepresentation]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[S62aRepresentation] ADD CONSTRAINT [S62aRepresentation_applicationId_fkey] FOREIGN KEY ([applicationId]) REFERENCES [dbo].[S62aCase]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[S62aRepresentation] ADD CONSTRAINT [S62aRepresentation_statusId_fkey] FOREIGN KEY ([statusId]) REFERENCES [dbo].[RepresentationStatus]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[S62aRepresentation] ADD CONSTRAINT [S62aRepresentation_submittedForId_fkey] FOREIGN KEY ([submittedForId]) REFERENCES [dbo].[RepresentationSubmittedFor]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[S62aRepresentation] ADD CONSTRAINT [S62aRepresentation_submittedByContactId_fkey] FOREIGN KEY ([submittedByContactId]) REFERENCES [dbo].[Contact]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[S62aRepresentation] ADD CONSTRAINT [S62aRepresentation_submittedReceivedMethodId_fkey] FOREIGN KEY ([submittedReceivedMethodId]) REFERENCES [dbo].[RepresentationReceivedMethod]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[S62aRepresentation] ADD CONSTRAINT [S62aRepresentation_representedTypeId_fkey] FOREIGN KEY ([representedTypeId]) REFERENCES [dbo].[RepresentedType]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[S62aRepresentation] ADD CONSTRAINT [S62aRepresentation_categoryId_fkey] FOREIGN KEY ([categoryId]) REFERENCES [dbo].[RepresentationCategory]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[_S62aRepresentedContacts] ADD CONSTRAINT [_S62aRepresentedContacts_A_fkey] FOREIGN KEY ([A]) REFERENCES [dbo].[Contact]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[_S62aRepresentedContacts] ADD CONSTRAINT [_S62aRepresentedContacts_B_fkey] FOREIGN KEY ([B]) REFERENCES [dbo].[S62aRepresentation]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
