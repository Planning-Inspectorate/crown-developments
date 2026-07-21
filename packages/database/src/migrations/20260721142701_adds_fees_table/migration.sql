BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[S62aFees] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [S62aFees_id_df] DEFAULT newid(),
    [s62aCaseId] UNIQUEIDENTIFIER NOT NULL,
    [hasPreApplicationFee] BIT,
    [preApplicationFee] DECIMAL(32,16),
    [customerNumber] NVARCHAR(1000),
    [chargingScheduleSentDate] DATETIME2,
    [invoiceDate] DATETIME2,
    [preApplicationFeeReceivedDate] DATETIME2,
    [hasApplicationFee] BIT,
    [applicationFee] DECIMAL(32,16),
    [applicationFeeReceivedDate] DATETIME2,
    [eligibleForFeeRefund] BIT,
    [applicationFeeRefundAmount] DECIMAL(32,16),
    [applicationFeeRefundDate] DATETIME2,
    CONSTRAINT [S62aFees_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [S62aFees_s62aCaseId_key] UNIQUE NONCLUSTERED ([s62aCaseId])
);

-- AddForeignKey
ALTER TABLE [dbo].[S62aFees] ADD CONSTRAINT [S62aFees_s62aCaseId_fkey] FOREIGN KEY ([s62aCaseId]) REFERENCES [dbo].[S62aCase]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
