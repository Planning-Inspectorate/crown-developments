BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[S62aCase] ADD [assessorInspectorId] UNIQUEIDENTIFIER,
[caseOfficerId] UNIQUEIDENTIFIER,
[planningOfficerId] UNIQUEIDENTIFIER,
[readerId] UNIQUEIDENTIFIER;

-- CreateTable
CREATE TABLE [dbo].[User]
(
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [User_id_df] DEFAULT newid(),
    [idpUserId] NVARCHAR(1000),
    [legacyId] NVARCHAR(1000),
    CONSTRAINT [User_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [User_idpUserId_key] UNIQUE NONCLUSTERED ([idpUserId])
);

-- CreateTable
CREATE TABLE [dbo].[S62aCaseInspector]
(
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [S62aCaseInspector_id_df] DEFAULT newid(),
    [s62aCaseId] UNIQUEIDENTIFIER NOT NULL,
    [userId] UNIQUEIDENTIFIER NOT NULL,
    [allocatedDate] DATETIME2,
    CONSTRAINT [S62aCaseInspector_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [S62aCaseInspector_s62aCaseId_userId_key] UNIQUE NONCLUSTERED ([s62aCaseId],[userId])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [S62aCaseInspector_s62aCaseId_idx] ON [dbo].[S62aCaseInspector]([s62aCaseId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [S62aCaseInspector_userId_idx] ON [dbo].[S62aCaseInspector]([userId]);

-- AddForeignKey
ALTER TABLE [dbo].[S62aCase] ADD CONSTRAINT [S62aCase_assessorInspectorId_fkey] FOREIGN KEY ([assessorInspectorId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[S62aCase] ADD CONSTRAINT [S62aCase_caseOfficerId_fkey] FOREIGN KEY ([caseOfficerId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[S62aCase] ADD CONSTRAINT [S62aCase_planningOfficerId_fkey] FOREIGN KEY ([planningOfficerId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[S62aCase] ADD CONSTRAINT [S62aCase_readerId_fkey] FOREIGN KEY ([readerId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[S62aCaseInspector] ADD CONSTRAINT [S62aCaseInspector_s62aCaseId_fkey] FOREIGN KEY ([s62aCaseId]) REFERENCES [dbo].[S62aCase]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[S62aCaseInspector] ADD CONSTRAINT [S62aCaseInspector_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
