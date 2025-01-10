/*
  Warnings:

  - You are about to drop the column `decisionOutcome` on the `CrownDevelopment` table. All the data in the column will be lost.

*/
BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[CrownDevelopment] DROP COLUMN [decisionOutcome];
ALTER TABLE [dbo].[CrownDevelopment] ADD [decisionOutcomeId] NVARCHAR(1000);

-- CreateTable
CREATE TABLE [dbo].[ApplicationDecisionOutcome] (
    [id] NVARCHAR(1000) NOT NULL,
    [displayName] NVARCHAR(1000),
    CONSTRAINT [ApplicationDecisionOutcome_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- AddForeignKey
ALTER TABLE [dbo].[CrownDevelopment] ADD CONSTRAINT [CrownDevelopment_decisionOutcomeId_fkey] FOREIGN KEY ([decisionOutcomeId]) REFERENCES [dbo].[ApplicationDecisionOutcome]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
