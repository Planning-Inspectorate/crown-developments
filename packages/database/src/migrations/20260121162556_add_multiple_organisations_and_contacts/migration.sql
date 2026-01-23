BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[Organisation] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [Organisation_id_df] DEFAULT newid(),
    [name] NVARCHAR(1000) NOT NULL,
    [addressId] UNIQUEIDENTIFIER,
    CONSTRAINT [Organisation_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[CrownDevelopmentToOrganisation] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [CrownDevelopmentToOrganisation_id_df] DEFAULT newid(),
    [organisationId] UNIQUEIDENTIFIER NOT NULL,
    [crownDevelopmentId] UNIQUEIDENTIFIER NOT NULL,
    CONSTRAINT [CrownDevelopmentToOrganisation_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[OrganisationToContact] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [OrganisationToContact_id_df] DEFAULT newid(),
    [organisationId] UNIQUEIDENTIFIER NOT NULL,
    [contactId] UNIQUEIDENTIFIER NOT NULL,
    [role] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [OrganisationToContact_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[OrganisationToContactRole] (
    [id] NVARCHAR(1000) NOT NULL,
    [displayName] NVARCHAR(1000),
    CONSTRAINT [OrganisationToContactRole_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [CrownDevelopmentToOrganisation_crownDevelopmentId_idx] ON [dbo].[CrownDevelopmentToOrganisation]([crownDevelopmentId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [CrownDevelopmentToOrganisation_organisationId_idx] ON [dbo].[CrownDevelopmentToOrganisation]([organisationId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [OrganisationToContact_organisationId_idx] ON [dbo].[OrganisationToContact]([organisationId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [OrganisationToContact_contactId_idx] ON [dbo].[OrganisationToContact]([contactId]);

-- AddForeignKey
ALTER TABLE [dbo].[Organisation] ADD CONSTRAINT [Organisation_addressId_fkey] FOREIGN KEY ([addressId]) REFERENCES [dbo].[Address]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[CrownDevelopmentToOrganisation] ADD CONSTRAINT [CrownDevelopmentToOrganisation_organisationId_fkey] FOREIGN KEY ([organisationId]) REFERENCES [dbo].[Organisation]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[CrownDevelopmentToOrganisation] ADD CONSTRAINT [CrownDevelopmentToOrganisation_crownDevelopmentId_fkey] FOREIGN KEY ([crownDevelopmentId]) REFERENCES [dbo].[CrownDevelopment]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[OrganisationToContact] ADD CONSTRAINT [OrganisationToContact_organisationId_fkey] FOREIGN KEY ([organisationId]) REFERENCES [dbo].[Organisation]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[OrganisationToContact] ADD CONSTRAINT [OrganisationToContact_contactId_fkey] FOREIGN KEY ([contactId]) REFERENCES [dbo].[Contact]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[OrganisationToContact] ADD CONSTRAINT [OrganisationToContact_role_fkey] FOREIGN KEY ([role]) REFERENCES [dbo].[OrganisationToContactRole]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
