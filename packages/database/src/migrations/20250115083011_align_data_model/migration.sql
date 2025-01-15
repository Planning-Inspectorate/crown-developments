/*
  Warnings:

  - You are about to drop the column `environmentalStatement` on the `CrownDevelopment` table. All the data in the column will be lost.
  - You are about to drop the column `lpaContactId` on the `CrownDevelopment` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `CrownDevelopment` table. All the data in the column will be lost.
  - You are about to drop the column `projectEmail` on the `CrownDevelopment` table. All the data in the column will be lost.
  - You are about to drop the column `sitePostcode` on the `CrownDevelopment` table. All the data in the column will be lost.
  - You are about to drop the column `procedureNotificationDate` on the `Event` table. All the data in the column will be lost.

*/
BEGIN TRY

BEGIN TRAN;

-- DropForeignKey
ALTER TABLE [dbo].[CrownDevelopment] DROP CONSTRAINT [CrownDevelopment_lpaContactId_fkey];

-- AlterTable
ALTER TABLE [dbo].[Contact] ALTER COLUMN [fullName] NVARCHAR(1000) NULL;
ALTER TABLE [dbo].[Contact] ALTER COLUMN [telephoneNumber] NVARCHAR(1000) NULL;
ALTER TABLE [dbo].[Contact] ALTER COLUMN [email] NVARCHAR(1000) NULL;

-- AlterTable
ALTER TABLE [dbo].[CrownDevelopment] ALTER COLUMN [eventId] NVARCHAR(1000) NULL;
ALTER TABLE [dbo].[CrownDevelopment] DROP COLUMN [environmentalStatement],
[lpaContactId],
[name],
[projectEmail],
[sitePostcode];
ALTER TABLE [dbo].[CrownDevelopment] ADD [createdDate] DATETIME2 NOT NULL CONSTRAINT [CrownDevelopment_createdDate_df] DEFAULT CURRENT_TIMESTAMP,
[environmentalStatementReceivedDate] DATETIME2,
[procedureNotificationDate] DATETIME2,
[siteAddressId] UNIQUEIDENTIFIER,
[updatedDate] DATETIME2;

-- AlterTable
ALTER TABLE [dbo].[Event] DROP COLUMN [procedureNotificationDate];
ALTER TABLE [dbo].[Event] ADD [proofsOfEvidence] DATETIME2;

-- AlterTable
ALTER TABLE [dbo].[Lpa] ALTER COLUMN [pinsCode] NVARCHAR(1000) NULL;
ALTER TABLE [dbo].[Lpa] ALTER COLUMN [onsCode] NVARCHAR(1000) NULL;
ALTER TABLE [dbo].[Lpa] ADD [addressId] UNIQUEIDENTIFIER,
[email] NVARCHAR(1000),
[telephoneNumber] NVARCHAR(1000);

-- AddForeignKey
ALTER TABLE [dbo].[CrownDevelopment] ADD CONSTRAINT [CrownDevelopment_siteAddressId_fkey] FOREIGN KEY ([siteAddressId]) REFERENCES [dbo].[Address]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Lpa] ADD CONSTRAINT [Lpa_addressId_fkey] FOREIGN KEY ([addressId]) REFERENCES [dbo].[Address]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
