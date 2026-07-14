/*
  Warnings:

  - You are about to drop the column `siteAreaInHectares` on the `S62aCase` table. All the data in the column will be lost.

*/
BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[S62aCase] DROP COLUMN [siteAreaInHectares];
ALTER TABLE [dbo].[S62aCase] ADD [inspectorBandId] NVARCHAR(1000),
[likelyIssues] NVARCHAR(1000),
[siteAreaInSquareMetres] DECIMAL(32,16),
[siteIsVisibleFromPublicLand] BIT,
[specialismId] NVARCHAR(1000),
[subTypeId] NVARCHAR(1000);

-- CreateTable
CREATE TABLE [dbo].[InspectorBand] (
    [id] NVARCHAR(1000) NOT NULL,
    [displayName] NVARCHAR(1000),
    CONSTRAINT [InspectorBand_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Specialism] (
    [id] NVARCHAR(1000) NOT NULL,
    [displayName] NVARCHAR(1000),
    CONSTRAINT [Specialism_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- AddForeignKey
ALTER TABLE [dbo].[S62aCase] ADD CONSTRAINT [S62aCase_subTypeId_fkey] FOREIGN KEY ([subTypeId]) REFERENCES [dbo].[ApplicationSubType]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[S62aCase] ADD CONSTRAINT [S62aCase_specialismId_fkey] FOREIGN KEY ([specialismId]) REFERENCES [dbo].[Specialism]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[S62aCase] ADD CONSTRAINT [S62aCase_inspectorBandId_fkey] FOREIGN KEY ([inspectorBandId]) REFERENCES [dbo].[InspectorBand]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
