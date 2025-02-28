/*
  Warnings:

  - You are about to drop the column `organisationContactId` on the `Representation` table. All the data in the column will be lost.
  - You are about to drop the column `organisationRole` on the `Representation` table. All the data in the column will be lost.

*/
BEGIN TRY

BEGIN TRAN;

-- DropForeignKey
ALTER TABLE [dbo].[Representation] DROP CONSTRAINT [Representation_organisationContactId_fkey];

-- AlterTable
ALTER TABLE [dbo].[Contact] ADD [isAdult] BIT NOT NULL CONSTRAINT [Contact_isAdult_df] DEFAULT 1,
[jobTitleOrRole] NVARCHAR(1000);

-- AlterTable
ALTER TABLE [dbo].[Representation] DROP CONSTRAINT [Representation_isAdult_df];
ALTER TABLE [dbo].[Representation] ALTER COLUMN [isAdult] BIT NULL;
ALTER TABLE [dbo].[Representation] DROP COLUMN [organisationContactId],
[organisationRole];
ALTER TABLE [dbo].[Representation] ADD [submittedByAgent] BIT,
[submittedByAgentOrgName] NVARCHAR(1000);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
