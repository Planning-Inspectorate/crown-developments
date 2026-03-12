/*
  Warnings:

  - You are about to drop the column `role` on the `OrganisationToContact` table. All the data in the column will be lost.
  - You are about to drop the `OrganisationToContactRole` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `role` to the `CrownDevelopmentToOrganisation` table without a default value. This is not possible if the table is not empty.

*/
BEGIN TRY

BEGIN TRAN;

-- DropForeignKey
ALTER TABLE [dbo].[OrganisationToContact] DROP CONSTRAINT [OrganisationToContact_role_fkey];

-- AlterTable
ALTER TABLE [dbo].[CrownDevelopmentToOrganisation] ADD [role] NVARCHAR(1000) NOT NULL;

-- AlterTable
ALTER TABLE [dbo].[OrganisationToContact] DROP COLUMN [role];

-- DropTable
DROP TABLE [dbo].[OrganisationToContactRole];

-- CreateTable
CREATE TABLE [dbo].[CrownDevelopmentToOrganisationRole] (
    [id] NVARCHAR(1000) NOT NULL,
    [displayName] NVARCHAR(1000),
    CONSTRAINT [CrownDevelopmentToOrganisationRole_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- AddForeignKey
ALTER TABLE [dbo].[CrownDevelopmentToOrganisation] ADD CONSTRAINT [CrownDevelopmentToOrganisation_role_fkey] FOREIGN KEY ([role]) REFERENCES [dbo].[CrownDevelopmentToOrganisationRole]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
