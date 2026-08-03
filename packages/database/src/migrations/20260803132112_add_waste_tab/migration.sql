BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[S62aCase] ADD [isWasteManagementDevelopment] BIT,
[wasteActivitiesDescription] NVARCHAR(1000);

-- CreateTable
CREATE TABLE [dbo].[S62aCaseWasteType] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [S62aCaseWasteType_id_df] DEFAULT newid(),
    [s62aCaseId] UNIQUEIDENTIFIER NOT NULL,
    [wasteTypeId] NVARCHAR(1000) NOT NULL,
    [voidCapacity] DECIMAL(18,2),
    [voidCapacityUnitId] NVARCHAR(1000),
    [maxAnnualThroughput] DECIMAL(18,2),
    [maxAnnualThroughputUnitId] NVARCHAR(1000),
    CONSTRAINT [S62aCaseWasteType_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [S62aCaseWasteType_s62aCaseId_wasteTypeId_key] UNIQUE NONCLUSTERED ([s62aCaseId],[wasteTypeId])
);

-- CreateTable
CREATE TABLE [dbo].[S62aWasteType] (
    [id] NVARCHAR(1000) NOT NULL,
    [displayName] NVARCHAR(1000),
    CONSTRAINT [S62aWasteType_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[S62aWasteUnit] (
    [id] NVARCHAR(1000) NOT NULL,
    [displayName] NVARCHAR(1000),
    CONSTRAINT [S62aWasteUnit_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [S62aCaseWasteType_s62aCaseId_idx] ON [dbo].[S62aCaseWasteType]([s62aCaseId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [S62aCaseWasteType_wasteTypeId_idx] ON [dbo].[S62aCaseWasteType]([wasteTypeId]);

-- AddForeignKey
ALTER TABLE [dbo].[S62aCaseWasteType] ADD CONSTRAINT [S62aCaseWasteType_s62aCaseId_fkey] FOREIGN KEY ([s62aCaseId]) REFERENCES [dbo].[S62aCase]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[S62aCaseWasteType] ADD CONSTRAINT [S62aCaseWasteType_wasteTypeId_fkey] FOREIGN KEY ([wasteTypeId]) REFERENCES [dbo].[S62aWasteType]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[S62aCaseWasteType] ADD CONSTRAINT [S62aCaseWasteType_voidCapacityUnitId_fkey] FOREIGN KEY ([voidCapacityUnitId]) REFERENCES [dbo].[S62aWasteUnit]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[S62aCaseWasteType] ADD CONSTRAINT [S62aCaseWasteType_maxAnnualThroughputUnitId_fkey] FOREIGN KEY ([maxAnnualThroughputUnitId]) REFERENCES [dbo].[S62aWasteUnit]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
