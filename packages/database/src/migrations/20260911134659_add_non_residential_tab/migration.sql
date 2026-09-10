BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[S62aNonResidential] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [S62aNonResidential_id_df] DEFAULT newid(),
    [s62aCaseId] UNIQUEIDENTIFIER NOT NULL,
    [hasNonResidentialFloorspaceChange] BIT,
    CONSTRAINT [S62aNonResidential_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [S62aNonResidential_s62aCaseId_key] UNIQUE NONCLUSTERED ([s62aCaseId])
);

-- CreateTable
CREATE TABLE [dbo].[S62aNonResidentialFloorspace] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [S62aNonResidentialFloorspace_id_df] DEFAULT newid(),
    [s62aNonResidentialId] UNIQUEIDENTIFIER NOT NULL,
    [useClassId] NVARCHAR(1000) NOT NULL,
    [useClassSubtypeId] NVARCHAR(1000),
    [otherTypeOfUse] NVARCHAR(250),
    [hasRoomsChange] BIT,
    [roomsLost] INT,
    [roomsProposed] INT,
    [netAdditionalRooms] INT,
    CONSTRAINT [S62aNonResidentialFloorspace_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[S62aNonResidentialFloorspaceArea] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [S62aNonResidentialFloorspaceArea_id_df] DEFAULT newid(),
    [s62aFloorspaceEntryId] UNIQUEIDENTIFIER NOT NULL,
    [floorspaceSetId] NVARCHAR(1000) NOT NULL,
    [existingGross] INT,
    [grossLost] INT,
    [grossProposed] INT,
    [netAdditionalGross] INT,
    CONSTRAINT [S62aNonResidentialFloorspaceArea_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [S62aNonResidentialFloorspaceArea_s62aFloorspaceEntryId_floorspaceSetId_key] UNIQUE NONCLUSTERED ([s62aFloorspaceEntryId],[floorspaceSetId])
);

-- CreateTable
CREATE TABLE [dbo].[S62aFloorspaceSet] (
    [id] NVARCHAR(1000) NOT NULL,
    [displayName] NVARCHAR(1000),
    [order] INT NOT NULL,
    CONSTRAINT [S62aFloorspaceSet_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[S62aUseClass] (
    [id] NVARCHAR(1000) NOT NULL,
    [displayName] NVARCHAR(1000),
    [order] INT NOT NULL,
    CONSTRAINT [S62aUseClass_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[S62aUseClassSubtype] (
    [id] NVARCHAR(1000) NOT NULL,
    [displayName] NVARCHAR(1000),
    [order] INT NOT NULL,
    [useClassId] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [S62aUseClassSubtype_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [S62aNonResidentialFloorspace_s62aNonResidentialId_idx] ON [dbo].[S62aNonResidentialFloorspace]([s62aNonResidentialId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [S62aNonResidentialFloorspaceArea_s62aFloorspaceEntryId_idx] ON [dbo].[S62aNonResidentialFloorspaceArea]([s62aFloorspaceEntryId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [S62aUseClassSubtype_useClassId_idx] ON [dbo].[S62aUseClassSubtype]([useClassId]);

-- AddForeignKey
ALTER TABLE [dbo].[S62aNonResidential] ADD CONSTRAINT [S62aNonResidential_s62aCaseId_fkey] FOREIGN KEY ([s62aCaseId]) REFERENCES [dbo].[S62aCase]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[S62aNonResidentialFloorspace] ADD CONSTRAINT [S62aNonResidentialFloorspace_s62aNonResidentialId_fkey] FOREIGN KEY ([s62aNonResidentialId]) REFERENCES [dbo].[S62aNonResidential]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[S62aNonResidentialFloorspace] ADD CONSTRAINT [S62aNonResidentialFloorspace_useClassId_fkey] FOREIGN KEY ([useClassId]) REFERENCES [dbo].[S62aUseClass]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[S62aNonResidentialFloorspace] ADD CONSTRAINT [S62aNonResidentialFloorspace_useClassSubtypeId_fkey] FOREIGN KEY ([useClassSubtypeId]) REFERENCES [dbo].[S62aUseClassSubtype]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[S62aNonResidentialFloorspaceArea] ADD CONSTRAINT [S62aNonResidentialFloorspaceArea_s62aFloorspaceEntryId_fkey] FOREIGN KEY ([s62aFloorspaceEntryId]) REFERENCES [dbo].[S62aNonResidentialFloorspace]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[S62aNonResidentialFloorspaceArea] ADD CONSTRAINT [S62aNonResidentialFloorspaceArea_floorspaceSetId_fkey] FOREIGN KEY ([floorspaceSetId]) REFERENCES [dbo].[S62aFloorspaceSet]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[S62aUseClassSubtype] ADD CONSTRAINT [S62aUseClassSubtype_useClassId_fkey] FOREIGN KEY ([useClassId]) REFERENCES [dbo].[S62aUseClass]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
