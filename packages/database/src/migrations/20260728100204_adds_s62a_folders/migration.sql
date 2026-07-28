BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[Folder] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [Folder_id_df] DEFAULT newid(),
    [displayName] NVARCHAR(1000) NOT NULL,
    [displayOrder] INT,
    [parentFolderId] UNIQUEIDENTIFIER,
    [s62aCaseId] UNIQUEIDENTIFIER,
    [isCustom] BIT NOT NULL CONSTRAINT [Folder_isCustom_df] DEFAULT 0,
    [deletedAt] DATETIME2,
    CONSTRAINT [Folder_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Folder_s62aCaseId_displayName_parentFolderId_deletedAt_key] UNIQUE NONCLUSTERED ([s62aCaseId],[displayName],[parentFolderId],[deletedAt])
);

-- AddForeignKey
ALTER TABLE [dbo].[Folder] ADD CONSTRAINT [Folder_s62aCaseId_fkey] FOREIGN KEY ([s62aCaseId]) REFERENCES [dbo].[S62aCase]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Folder] ADD CONSTRAINT [Folder_parentFolderId_fkey] FOREIGN KEY ([parentFolderId]) REFERENCES [dbo].[Folder]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
