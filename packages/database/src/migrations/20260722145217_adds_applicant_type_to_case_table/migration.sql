BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[S62aCase] ADD [applicantTypeId] NVARCHAR(1000);

-- CreateTable
CREATE TABLE [dbo].[S62aApplicantType] (
    [id] NVARCHAR(1000) NOT NULL,
    [displayName] NVARCHAR(1000),
    CONSTRAINT [S62aApplicantType_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- AddForeignKey
ALTER TABLE [dbo].[S62aCase] ADD CONSTRAINT [S62aCase_applicantTypeId_fkey] FOREIGN KEY ([applicantTypeId]) REFERENCES [dbo].[S62aApplicantType]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
