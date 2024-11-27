BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[CrownDevelopment] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [CrownDevelopment_id_df] DEFAULT newid(),
    [reference] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [CrownDevelopment_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [CrownDevelopment_reference_key] UNIQUE NONCLUSTERED ([reference])
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
