/*
  Warnings:
  - You are about to drop the column `applicationId` on the `ApplicationHistory` table. All the data in the column will be lost.
*/
BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[ApplicationHistory] DROP CONSTRAINT [ApplicationHistory_applicationId_fkey];

-- Drop
DROP INDEX [ApplicationHistory_applicationId_createdAt_idx] ON [dbo].[ApplicationHistory];

-- AlterTable
ALTER TABLE [dbo].[ApplicationHistory] DROP COLUMN [applicationId];

-- AlterTable
ALTER TABLE [dbo].[ApplicationHistory]
  ADD CONSTRAINT [ApplicationHistory_one_case_fk_ck] CHECK (
    (CASE WHEN [crownDevelopmentId] IS NULL THEN 0 ELSE 1 END)
  + (CASE WHEN [s62aId]             IS NULL THEN 0 ELSE 1 END) = 1
  );

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH