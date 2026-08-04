BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[S62aVehicleParkingCategory] (
    [id] NVARCHAR(50) NOT NULL,
    [displayName] NVARCHAR(100) NOT NULL,
    CONSTRAINT [S62aVehicleParkingCategory_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[S62aVehicleParking] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [S62aVehicleParking_id_df] DEFAULT newid(),
    [s62aCaseId] UNIQUEIDENTIFIER NOT NULL,
    [vehicleType] NVARCHAR(50) NOT NULL,
    [otherVehicleType] NVARCHAR(50),
    [existingSpaces] INT,
    [proposedSpaces] INT,
    CONSTRAINT [S62aVehicleParking_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [S62aVehicleParking_s62aCaseId_idx] ON [dbo].[S62aVehicleParking]([s62aCaseId]);

-- AddForeignKey
ALTER TABLE [dbo].[S62aVehicleParking] ADD CONSTRAINT [S62aVehicleParking_s62aCaseId_fkey] FOREIGN KEY ([s62aCaseId]) REFERENCES [dbo].[S62aCase]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[S62aVehicleParking] ADD CONSTRAINT [S62aVehicleParking_vehicleType_fkey] FOREIGN KEY ([vehicleType]) REFERENCES [dbo].[S62aVehicleParkingCategory]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
