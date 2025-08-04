BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[NotifyEmail] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [NotifyEmail_id_df] DEFAULT newid(),
    [notifyId] NVARCHAR(100),
    [reference] NVARCHAR(1000),
    [createdDate] DATETIME2 NOT NULL,
    [createdBy] NVARCHAR(100),
    [completedDate] DATETIME2 CONSTRAINT [NotifyEmail_completedDate_df] DEFAULT CURRENT_TIMESTAMP,
    [email] NVARCHAR(100),
    [lpaId] UNIQUEIDENTIFIER,
    [contactId] UNIQUEIDENTIFIER,
    [statusId] NVARCHAR(1000) NOT NULL,
    [templateId] NVARCHAR(100),
    [templateVersion] INT,
    [body] NVARCHAR(max),
    [subject] NVARCHAR(max),
    CONSTRAINT [NotifyEmail_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [NotifyEmail_notifyId_key] UNIQUE NONCLUSTERED ([notifyId])
);

-- CreateTable
CREATE TABLE [dbo].[NotifyStatus] (
    [id] NVARCHAR(1000) NOT NULL,
    [displayName] NVARCHAR(1000),
    CONSTRAINT [NotifyStatus_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- AddForeignKey
ALTER TABLE [dbo].[NotifyEmail] ADD CONSTRAINT [NotifyEmail_lpaId_fkey] FOREIGN KEY ([lpaId]) REFERENCES [dbo].[Lpa]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[NotifyEmail] ADD CONSTRAINT [NotifyEmail_contactId_fkey] FOREIGN KEY ([contactId]) REFERENCES [dbo].[Contact]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[NotifyEmail] ADD CONSTRAINT [NotifyEmail_statusId_fkey] FOREIGN KEY ([statusId]) REFERENCES [dbo].[NotifyStatus]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
