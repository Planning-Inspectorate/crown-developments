/*
  Warnings:

  - You are about to drop the column `inspectorId` on the `CrownDevelopment` table. All the data in the column will be lost.

*/
BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[CrownDevelopment] DROP COLUMN [inspectorId];
ALTER TABLE [dbo].[CrownDevelopment] ADD [inspector1Id] NVARCHAR(1000),
[inspector2Id] NVARCHAR(1000),
[inspector3Id] NVARCHAR(1000);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
