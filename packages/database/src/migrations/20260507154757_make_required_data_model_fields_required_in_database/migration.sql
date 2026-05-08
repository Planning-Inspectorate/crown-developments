/*
  Warnings:

  - Made the column `description` on table `CrownDevelopment` required. This step will fail if there are existing NULL values in that column.
  - Made the column `lpaId` on table `CrownDevelopment` required. This step will fail if there are existing NULL values in that column.
  - Made the column `expectedDateOfSubmission` on table `CrownDevelopment` required. This step will fail if there are existing NULL values in that column.
  - Made the column `hasSecondaryLpa` on table `CrownDevelopment` required. This step will fail if there are existing NULL values in that column.
  - Made the column `containsDistressingContent` on table `CrownDevelopment` required. This step will fail if there are existing NULL values in that column.

*/
BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[CrownDevelopment] ALTER COLUMN [description] NVARCHAR(2000) NOT NULL;
ALTER TABLE [dbo].[CrownDevelopment] ALTER COLUMN [lpaId] UNIQUEIDENTIFIER NOT NULL;
ALTER TABLE [dbo].[CrownDevelopment] ALTER COLUMN [expectedDateOfSubmission] DATETIME2 NOT NULL;
ALTER TABLE [dbo].[CrownDevelopment] ALTER COLUMN [hasSecondaryLpa] BIT NOT NULL;
ALTER TABLE [dbo].[CrownDevelopment] ALTER COLUMN [containsDistressingContent] BIT NOT NULL;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
