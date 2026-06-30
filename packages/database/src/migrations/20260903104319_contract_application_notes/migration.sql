/*
  Warnings:
  - You are about to drop the column `applicationId` on the `ApplicationNote` table. All the data in the column will be lost.
*/
BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[ApplicationNote] DROP CONSTRAINT [ApplicationNote_applicationId_fkey];

-- Drop
DROP INDEX [ApplicationNote_applicationId_idx] ON [dbo].[ApplicationNote];

-- AlterTable
ALTER TABLE [dbo].[ApplicationNote] DROP COLUMN [applicationId];

-- AlterTable
ALTER TABLE [dbo].[ApplicationNote]
  ADD CONSTRAINT [ApplicationNote_one_case_fk_ck] CHECK (
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