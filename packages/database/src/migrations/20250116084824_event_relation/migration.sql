/*
  Warnings:

  - You are about to alter the column `eventId` on the `CrownDevelopment` table. The data in that column could be lost. The data in that column will be cast from `NVarChar(1000)` to `UniqueIdentifier`.

*/
BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[CrownDevelopment] ALTER COLUMN [eventId] UNIQUEIDENTIFIER NULL;

-- AddForeignKey
ALTER TABLE [dbo].[CrownDevelopment] ADD CONSTRAINT [CrownDevelopment_eventId_fkey] FOREIGN KEY ([eventId]) REFERENCES [dbo].[Event]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
