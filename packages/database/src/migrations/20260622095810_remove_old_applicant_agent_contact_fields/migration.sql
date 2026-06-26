/*
  Warnings:

  - You are about to drop the column `agentContactId` on the `CrownDevelopment` table. All the data in the column will be lost.
  - You are about to drop the column `applicantContactId` on the `CrownDevelopment` table. All the data in the column will be lost.

*/
BEGIN TRY

BEGIN TRAN;

-- DropForeignKey
ALTER TABLE [dbo].[CrownDevelopment] DROP CONSTRAINT [CrownDevelopment_agentContactId_fkey];

-- DropForeignKey
ALTER TABLE [dbo].[CrownDevelopment] DROP CONSTRAINT [CrownDevelopment_applicantContactId_fkey];

-- AlterTable
ALTER TABLE [dbo].[CrownDevelopment] DROP COLUMN [agentContactId],
[applicantContactId];

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
