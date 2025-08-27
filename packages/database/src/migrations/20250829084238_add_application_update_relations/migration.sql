BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[ApplicationUpdate] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [ApplicationUpdate_id_df] DEFAULT newid(),
    [applicationId] UNIQUEIDENTIFIER NOT NULL,
    [statusId] NVARCHAR(1000) NOT NULL,
    [details] NVARCHAR(1000) NOT NULL,
    [firstPublished] DATETIME2,
    [unpublishedDate] DATETIME2,
    [lastEdited] DATETIME2,
    CONSTRAINT [ApplicationUpdate_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ApplicationUpdateStatus] (
    [id] NVARCHAR(1000) NOT NULL,
    [displayName] NVARCHAR(1000),
    CONSTRAINT [ApplicationUpdateStatus_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- AddForeignKey
ALTER TABLE [dbo].[ApplicationUpdate] ADD CONSTRAINT [ApplicationUpdate_applicationId_fkey] FOREIGN KEY ([applicationId]) REFERENCES [dbo].[CrownDevelopment]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[ApplicationUpdate] ADD CONSTRAINT [ApplicationUpdate_statusId_fkey] FOREIGN KEY ([statusId]) REFERENCES [dbo].[ApplicationUpdateStatus]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
