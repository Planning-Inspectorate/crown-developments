BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[Representation] ADD [withdrawalDate] DATETIME2,
[withdrawalReasonId] NVARCHAR(1000);

-- CreateTable
CREATE TABLE [dbo].[WithdrawalRequestDocument] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [WithdrawalRequestDocument_id_df] DEFAULT newid(),
    [representationId] UNIQUEIDENTIFIER NOT NULL,
    [itemId] NVARCHAR(1000) NOT NULL,
    [fileName] NVARCHAR(1000),
    CONSTRAINT [WithdrawalRequestDocument_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[WithdrawalReason] (
    [id] NVARCHAR(1000) NOT NULL,
    [displayName] NVARCHAR(1000),
    [hintText] NVARCHAR(1000),
    CONSTRAINT [WithdrawalReason_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- AddForeignKey
ALTER TABLE [dbo].[Representation] ADD CONSTRAINT [Representation_withdrawalReasonId_fkey] FOREIGN KEY ([withdrawalReasonId]) REFERENCES [dbo].[WithdrawalReason]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[WithdrawalRequestDocument] ADD CONSTRAINT [WithdrawalRequestDocument_representationId_fkey] FOREIGN KEY ([representationId]) REFERENCES [dbo].[Representation]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
