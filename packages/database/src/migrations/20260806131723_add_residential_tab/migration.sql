BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[S62aResidential] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [S62aResidential_id_df] DEFAULT newid(),
    [s62aCaseId] UNIQUEIDENTIFIER NOT NULL,
    [hasResidentialUnitsChange] BIT,
    [hasExistingHousing] BIT,
    [hasProposedHousing] BIT,
    CONSTRAINT [S62aResidential_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [S62aResidential_s62aCaseId_key] UNIQUE NONCLUSTERED ([s62aCaseId])
);

-- CreateTable
CREATE TABLE [dbo].[S62aResidentialHousing] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [S62aResidentialHousing_id_df] DEFAULT newid(),
    [s62aResidentialId] UNIQUEIDENTIFIER NOT NULL,
    [housingTypeId] NVARCHAR(1000) NOT NULL,
    [occupancyTypeId] NVARCHAR(1000) NOT NULL,
    [unitTypeId] NVARCHAR(1000) NOT NULL,
    [bedroomsUnknown] INT,
    [bedroomsOne] INT,
    [bedroomsTwo] INT,
    [bedroomsThree] INT,
    [bedroomsFourPlus] INT,
    CONSTRAINT [S62aResidentialHousing_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [S62aResidentialHousing_s62aResidentialId_housingTypeId_occupancyTypeId_unitTypeId_key] UNIQUE NONCLUSTERED ([s62aResidentialId],[housingTypeId],[occupancyTypeId],[unitTypeId])
);

-- CreateTable
CREATE TABLE [dbo].[S62aHousingType] (
    [id] NVARCHAR(1000) NOT NULL,
    [displayName] NVARCHAR(1000),
    CONSTRAINT [S62aHousingType_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[S62aOccupancyType] (
    [id] NVARCHAR(1000) NOT NULL,
    [displayName] NVARCHAR(1000),
    [order] INT NOT NULL,
    CONSTRAINT [S62aOccupancyType_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[S62aUnitType] (
    [id] NVARCHAR(1000) NOT NULL,
    [displayName] NVARCHAR(1000),
    [order] INT NOT NULL,
    CONSTRAINT [S62aUnitType_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [S62aResidentialHousing_s62aResidentialId_idx] ON [dbo].[S62aResidentialHousing]([s62aResidentialId]);

-- AddForeignKey
ALTER TABLE [dbo].[S62aResidential] ADD CONSTRAINT [S62aResidential_s62aCaseId_fkey] FOREIGN KEY ([s62aCaseId]) REFERENCES [dbo].[S62aCase]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[S62aResidentialHousing] ADD CONSTRAINT [S62aResidentialHousing_s62aResidentialId_fkey] FOREIGN KEY ([s62aResidentialId]) REFERENCES [dbo].[S62aResidential]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[S62aResidentialHousing] ADD CONSTRAINT [S62aResidentialHousing_housingTypeId_fkey] FOREIGN KEY ([housingTypeId]) REFERENCES [dbo].[S62aHousingType]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[S62aResidentialHousing] ADD CONSTRAINT [S62aResidentialHousing_occupancyTypeId_fkey] FOREIGN KEY ([occupancyTypeId]) REFERENCES [dbo].[S62aOccupancyType]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[S62aResidentialHousing] ADD CONSTRAINT [S62aResidentialHousing_unitTypeId_fkey] FOREIGN KEY ([unitTypeId]) REFERENCES [dbo].[S62aUnitType]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
