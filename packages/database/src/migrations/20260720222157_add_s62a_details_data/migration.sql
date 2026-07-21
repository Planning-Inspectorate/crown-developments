BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[S62aCase] ADD [bngExempt] BIT,
[categoryId] NVARCHAR(1000),
[cilAmount] DECIMAL(12,2),
[cilLiable] BIT,
[healthAndSafetyIssue] NVARCHAR(2000),
[isGreenBelt] BIT,
[listedBuildingReference] NVARCHAR(1000),
[lpaReference] NVARCHAR(1000),
[procedureId] NVARCHAR(1000),
[stageId] NVARCHAR(1000);

-- CreateTable
CREATE TABLE [dbo].[S62aStage] (
    [id] NVARCHAR(1000) NOT NULL,
    [displayName] NVARCHAR(1000),
    CONSTRAINT [S62aStage_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[S62aCategory] (
    [id] NVARCHAR(1000) NOT NULL,
    [displayName] NVARCHAR(1000),
    CONSTRAINT [S62aCategory_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- AddForeignKey
ALTER TABLE [dbo].[S62aCase] ADD CONSTRAINT [S62aCase_stageId_fkey] FOREIGN KEY ([stageId]) REFERENCES [dbo].[S62aStage]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[S62aCase] ADD CONSTRAINT [S62aCase_categoryId_fkey] FOREIGN KEY ([categoryId]) REFERENCES [dbo].[S62aCategory]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[S62aCase] ADD CONSTRAINT [S62aCase_procedureId_fkey] FOREIGN KEY ([procedureId]) REFERENCES [dbo].[ApplicationProcedure]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
