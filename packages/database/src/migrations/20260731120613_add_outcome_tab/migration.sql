BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[S62aCase] ADD [decisionOutcomeId] NVARCHAR(1000),
[outcomeTypeId] NVARCHAR(1000);

-- AlterTable
ALTER TABLE [dbo].[S62aDates] ADD [decisionDate] DATETIME2,
[recoveredReportSentDate] DATETIME2;

-- CreateTable
CREATE TABLE [dbo].[S62aOutcomeType] (
    [id] NVARCHAR(1000) NOT NULL,
    [displayName] NVARCHAR(1000),
    CONSTRAINT [S62aOutcomeType_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[S62aDecisionOutcome] (
    [id] NVARCHAR(1000) NOT NULL,
    [displayName] NVARCHAR(1000),
    CONSTRAINT [S62aDecisionOutcome_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- AddForeignKey
ALTER TABLE [dbo].[S62aCase] ADD CONSTRAINT [S62aCase_outcomeTypeId_fkey] FOREIGN KEY ([outcomeTypeId]) REFERENCES [dbo].[S62aOutcomeType]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[S62aCase] ADD CONSTRAINT [S62aCase_decisionOutcomeId_fkey] FOREIGN KEY ([decisionOutcomeId]) REFERENCES [dbo].[S62aDecisionOutcome]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
