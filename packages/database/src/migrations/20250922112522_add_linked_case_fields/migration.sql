BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[CrownDevelopment] ADD [linkedCaseId] NVARCHAR(1000),
[subTypeId] NVARCHAR(1000);

-- CreateTable
CREATE TABLE [dbo].[ApplicationSubType] (
    [id] NVARCHAR(1000) NOT NULL,
    [displayName] NVARCHAR(1000),
    CONSTRAINT [ApplicationSubType_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- AddForeignKey
ALTER TABLE [dbo].[CrownDevelopment] ADD CONSTRAINT [CrownDevelopment_subTypeId_fkey] FOREIGN KEY ([subTypeId]) REFERENCES [dbo].[ApplicationSubType]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
