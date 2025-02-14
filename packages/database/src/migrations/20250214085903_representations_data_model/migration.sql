/*
  Warnings:

  - You are about to drop the column `contactId` on the `Representation` table. All the data in the column will be lost.
  - You are about to drop the column `originalComment` on the `Representation` table. All the data in the column will be lost.
  - You are about to drop the column `projectId` on the `Representation` table. All the data in the column will be lost.
  - You are about to drop the column `receivedDate` on the `Representation` table. All the data in the column will be lost.
  - You are about to drop the column `redactedComment` on the `Representation` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Representation` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `Representation` table. All the data in the column will be lost.
  - You are about to drop the `RepresentationType` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `applicationId` to the `Representation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `comment` to the `Representation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `statusId` to the `Representation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `submittedDate` to the `Representation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `submittedForId` to the `Representation` table without a default value. This is not possible if the table is not empty.

*/
BEGIN TRY

BEGIN TRAN;

-- DropForeignKey
ALTER TABLE [dbo].[Representation] DROP CONSTRAINT [Representation_contactId_fkey];

-- DropForeignKey
ALTER TABLE [dbo].[Representation] DROP CONSTRAINT [Representation_projectId_fkey];

-- DropForeignKey
ALTER TABLE [dbo].[Representation] DROP CONSTRAINT [Representation_representedTypeId_fkey];

-- AlterTable
ALTER TABLE [dbo].[Representation] DROP CONSTRAINT [Representation_isRedacted_df];
ALTER TABLE [dbo].[Representation] ALTER COLUMN [isRedacted] BIT NULL;
ALTER TABLE [dbo].[Representation] ALTER COLUMN [representedTypeId] NVARCHAR(1000) NULL;
ALTER TABLE [dbo].[Representation] DROP COLUMN [contactId],
[originalComment],
[projectId],
[receivedDate],
[redactedComment],
[status],
[type];
ALTER TABLE [dbo].[Representation] ADD [applicationId] UNIQUEIDENTIFIER NOT NULL,
[categoryId] NVARCHAR(1000),
[comment] NVARCHAR(max) NOT NULL,
[commentRedacted] NVARCHAR(max),
[isAdult] BIT NOT NULL CONSTRAINT [Representation_isAdult_df] DEFAULT 1,
[organisationContactId] UNIQUEIDENTIFIER,
[organisationRole] NVARCHAR(1000),
[representedContactId] UNIQUEIDENTIFIER,
[statusId] NVARCHAR(1000) NOT NULL,
[submittedByContactId] UNIQUEIDENTIFIER,
[submittedDate] DATETIME2 NOT NULL,
[submittedForId] NVARCHAR(1000) NOT NULL,
[wantsToBeHeard] BIT;

-- DropTable
DROP TABLE [dbo].[RepresentationType];

-- CreateTable
CREATE TABLE [dbo].[RepresentationCategory] (
    [id] NVARCHAR(1000) NOT NULL,
    [displayName] NVARCHAR(1000),
    CONSTRAINT [RepresentationCategory_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[RepresentationSubmittedFor] (
    [id] NVARCHAR(1000) NOT NULL,
    [displayName] NVARCHAR(1000),
    CONSTRAINT [RepresentationSubmittedFor_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[RepresentationStatus] (
    [id] NVARCHAR(1000) NOT NULL,
    [displayName] NVARCHAR(1000),
    CONSTRAINT [RepresentationStatus_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[RepresentedType] (
    [id] NVARCHAR(1000) NOT NULL,
    [displayName] NVARCHAR(1000),
    CONSTRAINT [RepresentedType_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- AddForeignKey
ALTER TABLE [dbo].[Representation] ADD CONSTRAINT [Representation_applicationId_fkey] FOREIGN KEY ([applicationId]) REFERENCES [dbo].[CrownDevelopment]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Representation] ADD CONSTRAINT [Representation_statusId_fkey] FOREIGN KEY ([statusId]) REFERENCES [dbo].[RepresentationStatus]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Representation] ADD CONSTRAINT [Representation_submittedForId_fkey] FOREIGN KEY ([submittedForId]) REFERENCES [dbo].[RepresentationSubmittedFor]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Representation] ADD CONSTRAINT [Representation_submittedByContactId_fkey] FOREIGN KEY ([submittedByContactId]) REFERENCES [dbo].[Contact]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Representation] ADD CONSTRAINT [Representation_organisationContactId_fkey] FOREIGN KEY ([organisationContactId]) REFERENCES [dbo].[Contact]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Representation] ADD CONSTRAINT [Representation_representedTypeId_fkey] FOREIGN KEY ([representedTypeId]) REFERENCES [dbo].[RepresentedType]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Representation] ADD CONSTRAINT [Representation_representedContactId_fkey] FOREIGN KEY ([representedContactId]) REFERENCES [dbo].[Contact]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Representation] ADD CONSTRAINT [Representation_categoryId_fkey] FOREIGN KEY ([categoryId]) REFERENCES [dbo].[RepresentationCategory]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
