BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[S62aCase] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [S62aCase_id_df] DEFAULT newid(),
    [reference] NVARCHAR(1000) NOT NULL,
    [createdDate] DATETIME2 NOT NULL CONSTRAINT [S62aCase_createdDate_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedDate] DATETIME2,
    [description] NVARCHAR(2000) NOT NULL,
    [typeId] NVARCHAR(1000) NOT NULL,
    [classificationId] NVARCHAR(1000),
    [applicationPhaseId] NVARCHAR(1000),
    [s62aStatusId] NVARCHAR(1000),
    [hasAgent] BIT NOT NULL CONSTRAINT [S62aCase_hasAgent_df] DEFAULT 0,
    [lpaId] UNIQUEIDENTIFIER NOT NULL,
    [lpaContactId] UNIQUEIDENTIFIER,
    [hasSecondaryLpa] BIT NOT NULL CONSTRAINT [S62aCase_hasSecondaryLpa_df] DEFAULT 0,
    [secondaryLpaId] UNIQUEIDENTIFIER,
    [secondaryLpaContactId] UNIQUEIDENTIFIER,
    [siteAddressId] UNIQUEIDENTIFIER,
    [siteEasting] INT,
    [siteNorthing] INT,
    [siteAreaInHectares] DECIMAL(32,16),
    [siteAreaOriginalUnitId] NVARCHAR(1000),
    [notificationSubmittedDate] DATETIME2,
    [expectedSubmissionDate] DATETIME2 NOT NULL,
    CONSTRAINT [S62aCase_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [S62aCase_reference_key] UNIQUE NONCLUSTERED ([reference])
);

-- CreateTable
CREATE TABLE [dbo].[S62aStatus] (
    [id] NVARCHAR(1000) NOT NULL,
    [displayName] NVARCHAR(1000),
    CONSTRAINT [S62aStatus_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[SiteAreaUnit] (
    [id] NVARCHAR(1000) NOT NULL,
    [displayName] NVARCHAR(1000),
    CONSTRAINT [SiteAreaUnit_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[S62aApplicationPhase] (
    [id] NVARCHAR(1000) NOT NULL,
    [displayName] NVARCHAR(1000),
    CONSTRAINT [S62aApplicationPhase_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[S62aClassification] (
    [id] NVARCHAR(1000) NOT NULL,
    [displayName] NVARCHAR(1000),
    CONSTRAINT [S62aClassification_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[S62aToApplicantRole] (
    [id] NVARCHAR(1000) NOT NULL,
    [displayName] NVARCHAR(1000),
    CONSTRAINT [S62aToApplicantRole_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[S62aToApplicant] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [S62aToApplicant_id_df] DEFAULT newid(),
    [s62aId] UNIQUEIDENTIFIER NOT NULL,
    [organisationId] UNIQUEIDENTIFIER,
    [contactId] UNIQUEIDENTIFIER,
    [roleId] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [S62aToApplicant_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [S62aToApplicant_s62aId_idx] ON [dbo].[S62aToApplicant]([s62aId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [S62aToApplicant_organisationId_idx] ON [dbo].[S62aToApplicant]([organisationId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [S62aToApplicant_contactId_idx] ON [dbo].[S62aToApplicant]([contactId]);

-- AddForeignKey
ALTER TABLE [dbo].[S62aCase] ADD CONSTRAINT [S62aCase_typeId_fkey] FOREIGN KEY ([typeId]) REFERENCES [dbo].[ApplicationType]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[S62aCase] ADD CONSTRAINT [S62aCase_classificationId_fkey] FOREIGN KEY ([classificationId]) REFERENCES [dbo].[S62aClassification]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[S62aCase] ADD CONSTRAINT [S62aCase_applicationPhaseId_fkey] FOREIGN KEY ([applicationPhaseId]) REFERENCES [dbo].[S62aApplicationPhase]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[S62aCase] ADD CONSTRAINT [S62aCase_s62aStatusId_fkey] FOREIGN KEY ([s62aStatusId]) REFERENCES [dbo].[S62aStatus]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[S62aCase] ADD CONSTRAINT [S62aCase_lpaId_fkey] FOREIGN KEY ([lpaId]) REFERENCES [dbo].[Lpa]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[S62aCase] ADD CONSTRAINT [S62aCase_lpaContactId_fkey] FOREIGN KEY ([lpaContactId]) REFERENCES [dbo].[Contact]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[S62aCase] ADD CONSTRAINT [S62aCase_secondaryLpaId_fkey] FOREIGN KEY ([secondaryLpaId]) REFERENCES [dbo].[Lpa]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[S62aCase] ADD CONSTRAINT [S62aCase_secondaryLpaContactId_fkey] FOREIGN KEY ([secondaryLpaContactId]) REFERENCES [dbo].[Contact]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[S62aCase] ADD CONSTRAINT [S62aCase_siteAddressId_fkey] FOREIGN KEY ([siteAddressId]) REFERENCES [dbo].[Address]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[S62aCase] ADD CONSTRAINT [S62aCase_siteAreaOriginalUnitId_fkey] FOREIGN KEY ([siteAreaOriginalUnitId]) REFERENCES [dbo].[SiteAreaUnit]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[S62aToApplicant] ADD CONSTRAINT [S62aToApplicant_s62aId_fkey] FOREIGN KEY ([s62aId]) REFERENCES [dbo].[S62aCase]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[S62aToApplicant] ADD CONSTRAINT [S62aToApplicant_organisationId_fkey] FOREIGN KEY ([organisationId]) REFERENCES [dbo].[Organisation]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[S62aToApplicant] ADD CONSTRAINT [S62aToApplicant_contactId_fkey] FOREIGN KEY ([contactId]) REFERENCES [dbo].[Contact]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[S62aToApplicant] ADD CONSTRAINT [S62aToApplicant_roleId_fkey] FOREIGN KEY ([roleId]) REFERENCES [dbo].[S62aToApplicantRole]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- Adds CHECK to make sure join table exclusivity is maintained either to organisation or to contact
ALTER TABLE [dbo].[S62aToApplicant] ADD CONSTRAINT [CHK_S62aToApplicant_ExclusiveArc] CHECK (
    ([organisationId] IS NOT NULL AND [contactId] IS NULL) 
    OR 
    ([organisationId] IS NULL AND [contactId] IS NOT NULL)
);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
