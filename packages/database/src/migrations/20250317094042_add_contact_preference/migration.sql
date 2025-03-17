BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[Contact] ADD [contactPreferenceId] NVARCHAR(1000);

-- CreateTable
CREATE TABLE [dbo].[ContactPreference] (
    [id] NVARCHAR(1000) NOT NULL,
    [displayName] NVARCHAR(1000),
    CONSTRAINT [ContactPreference_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- AddForeignKey
ALTER TABLE [dbo].[Contact] ADD CONSTRAINT [Contact_contactPreferenceId_fkey] FOREIGN KEY ([contactPreferenceId]) REFERENCES [dbo].[ContactPreference]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
