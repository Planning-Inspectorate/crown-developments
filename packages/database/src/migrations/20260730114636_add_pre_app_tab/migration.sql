BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[S62aCase] ADD [preApplicationAdviceId] NVARCHAR(1000),
[preApplicationReference] NVARCHAR(1000);

-- AlterTable
ALTER TABLE [dbo].[S62aDates] ADD [preApplicationAdviceIssuedDate] DATETIME2,
[preApplicationReceivedDate] DATETIME2;

-- CreateTable
CREATE TABLE [dbo].[S62aPreApplicationAdvice] (
    [id] NVARCHAR(1000) NOT NULL,
    [displayName] NVARCHAR(1000),
    CONSTRAINT [S62aPreApplicationAdvice_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- AddForeignKey
ALTER TABLE [dbo].[S62aCase] ADD CONSTRAINT [S62aCase_preApplicationAdviceId_fkey] FOREIGN KEY ([preApplicationAdviceId]) REFERENCES [dbo].[S62aPreApplicationAdvice]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
