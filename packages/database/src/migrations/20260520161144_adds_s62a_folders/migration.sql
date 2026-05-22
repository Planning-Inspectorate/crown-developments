BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[S62AFolder] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [S62AFolder_id_df] DEFAULT newid(),
    [displayName] NVARCHAR(1000) NOT NULL,
    [displayOrder] INT,
    [parentFolderId] UNIQUEIDENTIFIER,
    [isCustom] BIT NOT NULL CONSTRAINT [S62AFolder_isCustom_df] DEFAULT 0,
    [deletedAt] DATETIME2,
    [crownDevelopmentId] UNIQUEIDENTIFIER NOT NULL,
    CONSTRAINT [S62AFolder_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [S62AFolder_crownDevelopmentId_displayName_parentFolderId_deletedAt_key] UNIQUE NONCLUSTERED ([crownDevelopmentId],[displayName],[parentFolderId],[deletedAt])
);

-- AddForeignKey
ALTER TABLE [dbo].[S62AFolder] ADD CONSTRAINT [S62AFolder_parentFolderId_fkey] FOREIGN KEY ([parentFolderId]) REFERENCES [dbo].[S62AFolder]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[S62AFolder] ADD CONSTRAINT [S62AFolder_crownDevelopmentId_fkey] FOREIGN KEY ([crownDevelopmentId]) REFERENCES [dbo].[CrownDevelopment]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
