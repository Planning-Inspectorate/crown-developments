BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[CrownDevelopment] ADD [applicationFeeReceivedDate] DATETIME2,
[applicationFeeRefundAmount] DECIMAL(32,16),
[applicationFeeRefundDate] DATETIME2,
[eligibleForFeeRefund] BIT;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
